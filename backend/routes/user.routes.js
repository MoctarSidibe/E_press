const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const db = require('../database/db');

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, full_name, phone, role, avatar_url, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile
router.patch('/profile', authMiddleware, async (req, res) => {
    try {
        const { fullName, phone, avatarUrl } = req.body;

        const result = await db.query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name),
                 phone = COALESCE($2, phone),
                 avatar_url = COALESCE($3, avatar_url),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING id, email, full_name, phone, role, avatar_url`,
            [fullName, phone, avatarUrl, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
