const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const db = require('../database/db');

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
        const { name, icon_name, base_price, express_price } = req.body;

        const result = await db.query(
            `UPDATE clothing_categories 
             SET name = $1, icon_name = $2, base_price = $3, express_price = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [name, icon_name, base_price, express_price, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

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

module.exports = router;
