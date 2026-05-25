const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const db = require('../database/db');
const upload = require('../middleware/upload.middleware');

const KYC_FIELDS = [
    { name: 'national_id_front', maxCount: 1 },
    { name: 'national_id_back',  maxCount: 1 },
    { name: 'selfie',            maxCount: 1 },
    { name: 'driver_license',    maxCount: 1 },
    { name: 'vehicle_photo',     maxCount: 1 },
];

// POST /api/kyc/submit — upload documents (drivers & cleaners only)
router.post(
    '/submit',
    authMiddleware,
    requireRole(['driver', 'cleaner']),
    upload.fields(KYC_FIELDS),
    async (req, res) => {
        const client = await db.pool.connect();
        try {
            const files = req.files || {};
            if (Object.keys(files).length === 0) {
                return res.status(400).json({ error: 'Au moins un document est requis' });
            }

            await client.query('BEGIN');

            // Remove previous documents for this user
            await client.query('DELETE FROM kyc_documents WHERE user_id = $1', [req.user.id]);

            // Insert each uploaded file
            for (const [fieldName, fileArray] of Object.entries(files)) {
                const file = fileArray[0];
                await client.query(
                    `INSERT INTO kyc_documents (user_id, document_type, file_url, original_name)
                     VALUES ($1, $2, $3, $4)`,
                    [req.user.id, fieldName, `/uploads/kyc/${file.filename}`, file.originalname]
                );
            }

            // Set status to pending
            await client.query(
                `UPDATE users
                 SET kyc_status = 'pending', kyc_submitted_at = NOW(), kyc_rejection_reason = NULL
                 WHERE id = $1`,
                [req.user.id]
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                kycStatus: 'pending',
                message: 'Documents soumis. En attente de vérification par l\'équipe E-Press.'
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('KYC submit error:', err);
            res.status(500).json({ error: 'Erreur lors de la soumission des documents' });
        } finally {
            client.release();
        }
    }
);

// GET /api/kyc/status — own KYC status + uploaded documents
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const userRes = await db.query(
            `SELECT kyc_status, kyc_submitted_at, kyc_approved_at, kyc_rejection_reason
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        const docsRes = await db.query(
            `SELECT document_type, file_url, created_at
             FROM kyc_documents WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            ...userRes.rows[0],
            documents: docsRes.rows
        });
    } catch (err) {
        console.error('KYC status error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
