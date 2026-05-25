const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware: authenticateToken, requireRole } = require('../middleware/auth.middleware');
const orderService = require('../services/order.service');

// ── All routes require authentication ─────────────────────────────────────────

// GET /api/laveries — list all laveries (admin + driver)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT l.*,
                    COUNT(o.id) FILTER (WHERE o.status NOT IN ('delivered','cancelled')) AS active_orders
             FROM laveries l
             LEFT JOIN orders o ON o.assigned_laverie_id = l.id
             GROUP BY l.id
             ORDER BY l.name`
        );
        res.json({ laveries: result.rows });
    } catch (err) {
        console.error('[Laveries] list error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/laveries/nearest?lat=X&lng=Y — find nearest laverie for a point
router.get('/nearest', authenticateToken, async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    try {
        const nearest = await orderService.assignNearestLaverie(parseFloat(lat), parseFloat(lng));
        if (!nearest) return res.json({ laverie: null });
        res.json({ laverie: nearest });
    } catch (err) {
        console.error('[Laveries] nearest error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── Cleaner self-service ──────────────────────────────────────────────────────
// These two MUST come before /:id, otherwise Express matches 'me' as :id.

// GET /api/laveries/me — the laverie owned by the authenticated cleaner (or null)
router.get('/me', authenticateToken, requireRole('cleaner'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM laveries WHERE user_id = $1 LIMIT 1`,
            [req.user.id]
        );
        res.json({ laverie: result.rows[0] || null });
    } catch (err) {
        console.error('[Laveries] get me error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/laveries/me — create or update the cleaner's own laverie (upsert by user_id)
router.post('/me', authenticateToken, requireRole('cleaner'), async (req, res) => {
    const { name, address, phone, lat, lng, radius_km, max_concurrent_orders } = req.body;

    if (!name || lat == null || lng == null) {
        return res.status(400).json({ error: 'name, lat, lng are required' });
    }

    try {
        const existing = await db.query(
            `SELECT id FROM laveries WHERE user_id = $1 LIMIT 1`,
            [req.user.id]
        );

        let result;
        if (existing.rows.length > 0) {
            result = await db.query(
                `UPDATE laveries
                 SET name = $1, address = $2, phone = $3,
                     lat = $4, lng = $5,
                     radius_km = COALESCE($6, radius_km),
                     max_concurrent_orders = COALESCE($7, max_concurrent_orders),
                     updated_at = NOW()
                 WHERE user_id = $8 RETURNING *`,
                [
                    name,
                    address || null,
                    phone || null,
                    parseFloat(lat),
                    parseFloat(lng),
                    radius_km != null ? parseFloat(radius_km) : null,
                    max_concurrent_orders != null ? parseInt(max_concurrent_orders, 10) : null,
                    req.user.id,
                ]
            );
        } else {
            result = await db.query(
                `INSERT INTO laveries (user_id, name, address, phone, lat, lng, radius_km, max_concurrent_orders, active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
                 RETURNING *`,
                [
                    req.user.id,
                    name,
                    address || null,
                    phone || null,
                    parseFloat(lat),
                    parseFloat(lng),
                    parseFloat(radius_km) || 5.0,
                    parseInt(max_concurrent_orders, 10) || 20,
                ]
            );
        }
        res.json({ laverie: result.rows[0] });
    } catch (err) {
        console.error('[Laveries] save me error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/laveries/me/orders — orders assigned to the cleaner's laverie.
// Default: status=picked_up (orders en route from driver — what the cleaner needs
// to see in the Reception tab before scanning). Override with ?status= or
// ?statuses=picked_up,in_facility for tab views.
router.get('/me/orders', authenticateToken, requireRole('cleaner'), async (req, res) => {
    try {
        // Resolve this cleaner's laverie. If they don't have one yet, return empty.
        const myLaverie = await db.query(
            `SELECT id FROM laveries WHERE user_id = $1 LIMIT 1`,
            [req.user.id]
        );
        if (myLaverie.rows.length === 0) {
            return res.json({ orders: [], laverie_id: null });
        }
        const laverieId = myLaverie.rows[0].id;

        const statusParam = req.query.statuses || req.query.status || 'picked_up';
        const statuses = statusParam.split(',').map(s => s.trim()).filter(Boolean);

        const result = await db.query(
            `SELECT
                o.id, o.order_number, o.status, o.is_express,
                o.pickup_item_count, o.confirmed_item_count,
                o.pickup_lat, o.pickup_lng, o.laverie_distance_km,
                o.pickup_actual_at, o.pickup_scheduled_at, o.created_at,
                u.full_name AS customer_name,
                u.phone     AS customer_phone,
                d.full_name AS driver_name,
                d.phone     AS driver_phone
             FROM orders o
             LEFT JOIN users u ON u.id = o.customer_id
             LEFT JOIN users d ON d.id = o.pickup_driver_id
             WHERE o.assigned_laverie_id = $1
               AND o.status = ANY($2::text[])
             ORDER BY COALESCE(o.pickup_actual_at, o.pickup_scheduled_at, o.created_at) DESC`,
            [laverieId, statuses]
        );

        res.json({ orders: result.rows, laverie_id: laverieId });
    } catch (err) {
        console.error('[Laveries] my orders error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/laveries/:id — single laverie detail
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT l.*,
                    COUNT(o.id) FILTER (WHERE o.status NOT IN ('delivered','cancelled')) AS active_orders
             FROM laveries l
             LEFT JOIN orders o ON o.assigned_laverie_id = l.id
             WHERE l.id = $1
             GROUP BY l.id`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ laverie: result.rows[0] });
    } catch (err) {
        console.error('[Laveries] get error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/laveries — create laverie (admin only)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
    const { name, address, phone, lat, lng, radius_km, max_concurrent_orders, active, user_id } = req.body;

    if (!name || lat == null || lng == null) {
        return res.status(400).json({ error: 'name, lat, lng are required' });
    }

    try {
        const result = await db.query(
            `INSERT INTO laveries (user_id, name, address, phone, lat, lng, radius_km, max_concurrent_orders, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                user_id || null,
                name,
                address || null,
                phone || null,
                parseFloat(lat),
                parseFloat(lng),
                parseFloat(radius_km) || 5.0,
                parseInt(max_concurrent_orders, 10) || 20,
                active !== false,
            ]
        );
        res.status(201).json({ laverie: result.rows[0] });
    } catch (err) {
        console.error('[Laveries] create error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/laveries/:id — update laverie (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    const { name, address, phone, lat, lng, radius_km, max_concurrent_orders, active } = req.body;

    try {
        const result = await db.query(
            `UPDATE laveries
             SET name                  = COALESCE($1, name),
                 address               = COALESCE($2, address),
                 phone                 = COALESCE($3, phone),
                 lat                   = COALESCE($4, lat),
                 lng                   = COALESCE($5, lng),
                 radius_km             = COALESCE($6, radius_km),
                 max_concurrent_orders = COALESCE($7, max_concurrent_orders),
                 active                = COALESCE($8, active)
             WHERE id = $9
             RETURNING *`,
            [
                name || null,
                address || null,
                phone || null,
                lat != null ? parseFloat(lat) : null,
                lng != null ? parseFloat(lng) : null,
                radius_km != null ? parseFloat(radius_km) : null,
                max_concurrent_orders != null ? parseInt(max_concurrent_orders, 10) : null,
                active != null ? active : null,
                req.params.id,
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ laverie: result.rows[0] });
    } catch (err) {
        console.error('[Laveries] update error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/laveries/:id — soft-delete (set active=false) (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE laveries SET active = false WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ laverie: result.rows[0] });
    } catch (err) {
        console.error('[Laveries] delete error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
