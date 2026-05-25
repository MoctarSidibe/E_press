const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const db = require('../database/db');
const orderService = require('../services/order.service');
const notificationService = require('../services/notification.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer for category GIF/image uploads
const catUploadDir = path.join(__dirname, '../uploads/categories');
if (!fs.existsSync(catUploadDir)) fs.mkdirSync(catUploadDir, { recursive: true });

const catUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, catUploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname) || '.gif';
            cb(null, `cat_${req.params.id}_${Date.now()}${ext}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        const allowed = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Get system statistics (admin)
router.get('/stats', authMiddleware, requireRole(['admin', 'cleaner']), async (req, res) => {
    try {
        // Get overall stats
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
                (SELECT COUNT(*) FROM users WHERE role = 'driver') as total_drivers,
                (SELECT COUNT(*) FROM users WHERE role = 'cleaner') as total_cleaners,
                (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM orders WHERE status = 'pending') as orders_pending,
                (SELECT COUNT(*) FROM orders WHERE status = 'assigned') as orders_assigned,
                (SELECT COUNT(*) FROM orders WHERE status = 'picked_up') as orders_picked_up,
                (SELECT COUNT(*) FROM orders WHERE status = 'in_facility') as orders_in_facility,
                (SELECT COUNT(*) FROM orders WHERE status = 'ready') as orders_ready,
                (SELECT COUNT(*) FROM orders WHERE status = 'out_for_delivery') as orders_out_for_delivery,
                (SELECT COUNT(*) FROM orders WHERE status = 'delivered') as orders_delivered,
                (SELECT COUNT(*) FROM orders WHERE status = 'cancelled') as orders_cancelled,
                (SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'assigned', 'picked_up', 'in_facility', 'ready', 'out_for_delivery')) as active_orders,
                (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'delivered') as total_revenue,
                (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status IN ('pending', 'assigned', 'picked_up', 'in_facility', 'ready', 'out_for_delivery')) as pending_revenue
        `);

        // Get recent activities (last 10 orders)
        const recentActivities = await db.query(`
            SELECT 
                id,
                order_number,
                status,
                total,
                created_at,
                updated_at
            FROM orders
            ORDER BY updated_at DESC
            LIMIT 10
        `);

        res.json({
            ...stats.rows[0],
            recent_activities: recentActivities.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (admin)
router.get('/users', authMiddleware, requireRole(['admin', 'cleaner']), async (req, res) => {
    try {
        const { role } = req.query;
        let query = 'SELECT id, email, full_name, phone, role, is_active, created_at FROM users';
        const params = [];

        if (role) {
            query += ' WHERE role = $1';
            params.push(role);
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle user active status (admin)
router.patch('/users/:id/toggle-status', authMiddleware, requireRole(['admin', 'cleaner']), async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update user (admin)
router.patch('/users/:id', authMiddleware, requireRole(['admin', 'cleaner']), async (req, res) => {
    try {
        const { full_name, email, phone, role, is_active } = req.body;
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (full_name !== undefined) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(full_name);
        }
        if (email !== undefined) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramCount++}`);
            values.push(phone);
        }
        if (role !== undefined) {
            updates.push(`role = $${paramCount++}`);
            values.push(role);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(req.params.id);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, full_name, phone, role, is_active, created_at`;
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete user (admin only)
router.delete('/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        // Check if user has orders
        const ordersCheck = await db.query(
            'SELECT COUNT(*) as count FROM orders WHERE customer_id = $1',
            [req.params.id]
        );

        if (parseInt(ordersCheck.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Cannot delete user with existing orders. Consider deactivating instead.'
            });
        }

        const result = await db.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully', id: result.rows[0].id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/active-couriers', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT COUNT(*) as count 
             FROM users 
             WHERE role = 'driver' 
             AND is_active = true
             AND last_seen > NOW() - INTERVAL '15 minutes'`
        );

        res.json({
            available: parseInt(result.rows[0].count) > 0,
            count: parseInt(result.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Category Management for Admin
router.get('/categories', authMiddleware, requireRole(['admin', 'cleaner']), async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM clothing_categories ORDER BY name ASC'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/categories', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { name, icon_name, base_price, express_price } = req.body;

        const result = await db.query(
            `INSERT INTO clothing_categories (name, icon_name, base_price, express_price)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [name, icon_name, base_price, express_price]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/categories/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours } = req.body;

        const result = await db.query(
            `UPDATE clothing_categories
             SET name = $1, name_fr = COALESCE($2, name_fr), icon_name = $3,
                 base_price = $4, express_price = $5,
                 display_order = COALESCE($6, display_order),
                 processing_time_hours = COALESCE($7, processing_time_hours),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8
             RETURNING *`,
            [name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/categories/:id/gif', authMiddleware, requireRole('admin'), catUpload.single('gif'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    try {
        const gifUrl = `/uploads/categories/${req.file.filename}`;
        const result = await db.query(
            'UPDATE clothing_categories SET gif_url = $1 WHERE id = $2 RETURNING *',
            [gifUrl, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/categories/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category is used in any orders
        const ordersCheck = await db.query(
            'SELECT COUNT(*) as count FROM order_items WHERE category_id = $1',
            [id]
        );

        if (parseInt(ordersCheck.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Cannot delete category that has been used in orders'
            });
        }

        await db.query('DELETE FROM clothing_categories WHERE id = $1', [id]);

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Order (Soft Delete) - Admin Only
router.delete('/orders/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const order = await orderService.deleteOrder(req.params.id, req.user.id);
        res.json({ message: 'Order deleted/cancelled successfully', order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── COUPONS MANAGEMENT ───────────────────────────────────────────────────────

router.get('/coupons', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, u.full_name as created_by_name
             FROM coupons c
             LEFT JOIN users u ON u.id = c.created_by
             ORDER BY c.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/coupons', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const {
            code, name, description, discount_type, discount_value,
            min_order_amount, max_discount_amount, max_uses, valid_from, valid_until
        } = req.body;

        if (!code || !name || !discount_type || !discount_value) {
            return res.status(400).json({ error: 'code, name, discount_type and discount_value are required' });
        }

        const result = await db.query(
            `INSERT INTO coupons (code, name, description, discount_type, discount_value,
                min_order_amount, max_discount_amount, max_uses, valid_from, valid_until, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                code.toUpperCase().trim(), name, description, discount_type, discount_value,
                min_order_amount || 0, max_discount_amount || null, max_uses || null,
                valid_from || null, valid_until || null, req.user.id
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Coupon code already exists' });
        res.status(500).json({ error: error.message });
    }
});

router.patch('/coupons/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const {
            name, description, discount_type, discount_value,
            min_order_amount, max_discount_amount, max_uses,
            valid_from, valid_until, is_active
        } = req.body;

        const result = await db.query(
            `UPDATE coupons SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                discount_type = COALESCE($3, discount_type),
                discount_value = COALESCE($4, discount_value),
                min_order_amount = COALESCE($5, min_order_amount),
                max_discount_amount = COALESCE($6, max_discount_amount),
                max_uses = COALESCE($7, max_uses),
                valid_from = COALESCE($8, valid_from),
                valid_until = COALESCE($9, valid_until),
                is_active = COALESCE($10, is_active),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $11 RETURNING *`,
            [name, description, discount_type, discount_value, min_order_amount,
             max_discount_amount, max_uses, valid_from, valid_until, is_active, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Coupon not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/coupons/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        await db.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── POINTS CONFIG MANAGEMENT ─────────────────────────────────────────────────

router.get('/points-config', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM points_config WHERE is_active = true LIMIT 1');
        res.json(result.rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/points-config', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const {
            points_per_1000_fcfa, points_value_fcfa,
            min_redemption_points, max_redemption_percent,
            express_percentage,
        } = req.body;

        const result = await db.query(
            `UPDATE points_config SET
                points_per_1000_fcfa  = COALESCE($1, points_per_1000_fcfa),
                points_value_fcfa     = COALESCE($2, points_value_fcfa),
                min_redemption_points = COALESCE($3, min_redemption_points),
                max_redemption_percent= COALESCE($4, max_redemption_percent),
                express_percentage    = COALESCE($5, express_percentage),
                updated_at = CURRENT_TIMESTAMP,
                updated_by = $6
             WHERE is_active = true
             RETURNING *`,
            [points_per_1000_fcfa, points_value_fcfa, min_redemption_points, max_redemption_percent, express_percentage, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/points-transactions - View all points activity
router.get('/points-transactions', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT pt.*, u.full_name, u.email, o.order_number
             FROM points_transactions pt
             JOIN users u ON u.id = pt.user_id
             LEFT JOIN orders o ON o.id = pt.order_id
             ORDER BY pt.created_at DESC
             LIMIT 100`
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/admin/users/:id/adjust-points - Manual points adjustment
router.patch('/users/:id/adjust-points', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { points, description } = req.body;
        if (!points || points === 0) return res.status(400).json({ error: 'Points value required' });

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const userRes = await client.query(
                'UPDATE users SET points_balance = GREATEST(0, points_balance + $1), points_earned_total = GREATEST(0, points_earned_total + $2) WHERE id = $3 RETURNING points_balance',
                [points, points > 0 ? points : 0, req.params.id]
            );
            if (userRes.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'User not found' }); }

            await client.query(
                `INSERT INTO points_transactions (user_id, type, points, balance_after, description)
                 VALUES ($1, 'admin_adjustment', $2, $3, $4)`,
                [req.params.id, points, userRes.rows[0].points_balance, description || 'Admin adjustment']
            );

            await client.query('COMMIT');
            res.json({ newBalance: userRes.rows[0].points_balance });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── KYC Management ───────────────────────────────────────────────────────────

// GET /admin/kyc — all driver/cleaner KYC submissions (excluding not_submitted)
router.get('/kyc', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                u.id, u.full_name, u.email, u.role, u.phone,
                u.kyc_status, u.kyc_submitted_at, u.kyc_approved_at, u.kyc_rejection_reason,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', d.id,
                            'document_type', d.document_type,
                            'file_url', d.file_url
                        )
                    ) FILTER (WHERE d.id IS NOT NULL),
                    '[]'
                ) AS documents
            FROM users u
            LEFT JOIN kyc_documents d ON d.user_id = u.id
            WHERE u.role IN ('driver', 'cleaner')
            GROUP BY u.id
            ORDER BY
                CASE u.kyc_status
                    WHEN 'pending'  THEN 1
                    WHEN 'rejected' THEN 2
                    WHEN 'approved' THEN 3
                    ELSE 4
                END,
                u.kyc_submitted_at DESC NULLS LAST
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Admin KYC list error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /admin/kyc/pending-count — small counter for the sidebar badge.
// Fast: just a COUNT(*) on a small filtered set.
router.get('/kyc/pending-count', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT COUNT(*)::int AS count
             FROM users
             WHERE role IN ('driver', 'cleaner') AND kyc_status = 'pending'`
        );
        res.json({ count: result.rows[0].count });
    } catch (err) {
        console.error('[Admin] kyc pending count error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /admin/push-test — admin-only manual push trigger for QA verification.
// Body: { userId?: string, title?: string, body?: string }
// If userId is omitted, sends to the calling admin (useful for self-test).
router.post('/push-test', authMiddleware, requireRole(['admin']), async (req, res) => {
    const target = req.body?.userId || req.user.id;
    const title = req.body?.title || '🧪 E-Press test';
    const body  = req.body?.body  || 'Push notification delivered.';
    try {
        const stats = await notificationService.sendPushToUsers([target], title, body, { type: 'push_test' });
        res.json({ ok: true, target, stats });
    } catch (err) {
        console.error('[Admin] push test error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /admin/kyc/:userId/approve
router.patch('/kyc/:userId/approve', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await db.query(
            `UPDATE users
             SET kyc_status = 'approved', kyc_approved_at = NOW(), kyc_rejection_reason = NULL
             WHERE id = $1 AND role IN ('driver', 'cleaner')
             RETURNING id, full_name, phone, role`,
            [userId]
        );
        // Auto-create a placeholder laverie for approved cleaners. The cleaner will
        // override coordinates / radius via the in-app LaverieSetupScreen
        // (POST /laveries/me) on first login. Dedup by user_id so re-approval is idempotent.
        if (result.rows.length > 0 && result.rows[0].role === 'cleaner') {
            const user = result.rows[0];
            const laverieResult = await db.query(
                `INSERT INTO laveries (user_id, name, address, phone, lat, lng, radius_km, max_concurrent_orders, active)
                 SELECT $1::uuid, $2, 'À définir', $3, 0.3924, 9.4536, 5, 20, true
                 WHERE NOT EXISTS (SELECT 1 FROM laveries WHERE user_id = $1::uuid)
                 RETURNING id`,
                [user.id, user.full_name || `Laverie #${user.id}`, user.phone || '']
            );
            if (laverieResult.rowCount > 0) {
                console.log(`[KYC] Auto-created laverie id=${laverieResult.rows[0].id} for user id=${user.id} (${user.full_name})`);
            } else {
                console.log(`[KYC] Laverie already exists for user id=${user.id} — skipped`);
            }
        }

        // Notify the user via remote push. Fire-and-forget — the DB update above is the truth.
        if (result.rows.length > 0) {
            notificationService.notifyKycDecision(result.rows[0].id, true).catch(() => {});
        }

        res.json({ success: true, kycStatus: 'approved' });
    } catch (err) {
        console.error('KYC approve error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PATCH /admin/kyc/:userId/reject
router.patch('/kyc/:userId/reject', authMiddleware, requireRole(['admin']), async (req, res) => {
    const { reason } = req.body;
    const finalReason = reason || 'Documents non conformes. Veuillez resoumettre.';
    try {
        const { userId } = req.params;
        await db.query(
            `UPDATE users
             SET kyc_status = 'rejected', kyc_rejection_reason = $1, kyc_approved_at = NULL
             WHERE id = $2 AND role IN ('driver', 'cleaner')`,
            [finalReason, userId]
        );

        notificationService.notifyKycDecision(userId, false, finalReason).catch(() => {});

        res.json({ success: true, kycStatus: 'rejected' });
    } catch (err) {
        console.error('KYC reject error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
