/**
 * sync.routes.js
 * Handles offline order sync and secure code/QR lookup.
 *
 * POST /sync/orders       — batch upload offline orders
 * GET  /sync/order/:code  — lookup order by EP-XXX-DDMM code
 * POST /qr/validate       — validate a scanned QR (already existed, now HMAC-verified)
 * POST /sync/nonce-check  — check if a QR nonce has been used (anti-replay)
 */

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const db       = require('../database/db');
const qrService = require('../services/qr.service');
const orderService = require('../services/order.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// ─────────────────────────────────────────────────────────────
// POST /sync/orders
// Device uploads queued offline orders when connectivity returns.
// Each item is verified with HMAC before being written to the DB.
// ─────────────────────────────────────────────────────────────
router.post('/orders', authMiddleware, async (req, res) => {
    const { orders } = req.body; // array of offline order objects

    if (!Array.isArray(orders) || orders.length === 0)
        return res.status(400).json({ error: 'No orders provided' });

    if (orders.length > 50)
        return res.status(400).json({ error: 'Batch too large (max 50)' });

    // Retrieve user's token hash stored at login for offline signature verification
    const tokenHashRow = await db.query(
        'SELECT token_hash FROM users WHERE id = $1',
        [req.user.id]
    ).catch(() => null);
    const tokenHash = tokenHashRow?.rows?.[0]?.token_hash;

    const results = [];

    for (const item of orders) {
        const { client_code, client_nonce, sig, payload, created_at_device, device_id } = item;

        // 1. Basic field validation
        if (!client_code || !client_nonce || !sig || !payload) {
            results.push({ client_code, status: 'rejected', reason: 'Champs manquants' });
            continue;
        }

        // 2. Check code format EP-XXX-DDMM
        if (!/^EP-[A-Z0-9]{3}-\d{4}$/.test(client_code)) {
            results.push({ client_code, status: 'rejected', reason: 'Code invalide' });
            continue;
        }

        // 3. Idempotency: already synced?
        const existing = await db.query(
            'SELECT id, status FROM offline_orders WHERE client_code = $1',
            [client_code]
        );
        if (existing.rows.length > 0) {
            results.push({ client_code, status: existing.rows[0].status, reason: 'Déjà reçu' });
            continue;
        }

        // 4. Nonce uniqueness (anti-replay)
        const nonceUsed = await db.query(
            'SELECT nonce FROM qr_nonces WHERE nonce = $1',
            [client_nonce]
        );
        if (nonceUsed.rows.length > 0) {
            results.push({ client_code, status: 'rejected', reason: 'Nonce déjà utilisé' });
            continue;
        }

        // 5. HMAC signature verification
        if (tokenHash) {
            const sigValid = qrService.verifyOfflineQR(payload, sig, tokenHash);
            if (!sigValid) {
                results.push({ client_code, status: 'rejected', reason: 'Signature invalide' });
                continue;
            }
        }

        // 6. Timestamp sanity: reject if older than 72 h
        const deviceTs = new Date(created_at_device).getTime();
        if (Date.now() - deviceTs > 72 * 3600 * 1000) {
            results.push({ client_code, status: 'rejected', reason: 'Commande expirée (> 72h)' });
            continue;
        }

        // 7. Store in offline_orders and consume nonce
        try {
            await db.query('BEGIN');

            await db.query(
                `INSERT INTO offline_orders
                    (client_code, client_nonce, client_sig, user_id, payload, device_id, status, created_at_device)
                 VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)`,
                [client_code, client_nonce, sig, req.user.id,
                 JSON.stringify(payload), device_id || null, created_at_device]
            );

            await db.query(
                `INSERT INTO qr_nonces (nonce, expires_at)
                 VALUES ($1, NOW() + INTERVAL '72 hours')`,
                [client_nonce]
            );

            // 8. Create actual order from payload
            let newOrder = null;
            try {
                newOrder = await orderService.createOrder(req.user.id, {
                    ...payload,
                    client_code,
                    is_offline_origin: true,
                });

                await db.query(
                    `UPDATE offline_orders SET status = 'synced', order_id = $1, synced_at = NOW()
                     WHERE client_code = $2`,
                    [newOrder.id, client_code]
                );
            } catch (orderErr) {
                await db.query(
                    `UPDATE offline_orders SET status = 'rejected', rejection_reason = $1
                     WHERE client_code = $2`,
                    [orderErr.message, client_code]
                );
            }

            await db.query('COMMIT');

            results.push({
                client_code,
                status: newOrder ? 'synced' : 'rejected',
                order_id: newOrder?.id || null,
                order_number: newOrder?.order_number || null,
            });
        } catch (err) {
            await db.query('ROLLBACK');
            results.push({ client_code, status: 'error', reason: err.message });
        }
    }

    const synced   = results.filter(r => r.status === 'synced').length;
    const rejected = results.filter(r => r.status === 'rejected').length;

    res.json({ synced, rejected, results });
});

// ─────────────────────────────────────────────────────────────
// GET /sync/order/:code
// Staff / driver looks up an order by its EP-XXX-DDMM code.
// Works for both offline-origin and regular orders.
// ─────────────────────────────────────────────────────────────
router.get('/order/:code', authMiddleware, async (req, res) => {
    const { code } = req.params;

    if (!/^EP-[A-Z0-9]{3}-\d{4}$/.test(code))
        return res.status(400).json({ error: 'Format de code invalide' });

    // Check orders table first (synced or online order)
    const onlineOrder = await db.query(
        `SELECT o.*, u.full_name as customer_name, u.phone as customer_phone
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         WHERE o.client_code = $1`,
        [code]
    );

    if (onlineOrder.rows.length > 0)
        return res.json({ source: 'server', order: onlineOrder.rows[0] });

    // Fall back to offline_orders (pending sync)
    const offlineOrder = await db.query(
        `SELECT oo.*, u.full_name as customer_name, u.phone as customer_phone
         FROM offline_orders oo
         LEFT JOIN users u ON u.id = oo.user_id
         WHERE oo.client_code = $1`,
        [code]
    );

    if (offlineOrder.rows.length > 0)
        return res.json({ source: 'offline_pending', order: offlineOrder.rows[0] });

    res.status(404).json({ error: 'Commande introuvable' });
});

// ─────────────────────────────────────────────────────────────
// POST /sync/nonce-check
// Quick check before scanning: has this QR nonce already been used?
// ─────────────────────────────────────────────────────────────
router.post('/nonce-check', authMiddleware, async (req, res) => {
    const { nonce } = req.body;
    if (!nonce) return res.status(400).json({ error: 'Nonce requis' });

    const row = await db.query(
        'SELECT used_at FROM qr_nonces WHERE nonce = $1',
        [nonce]
    );

    res.json({ used: row.rows.length > 0, used_at: row.rows[0]?.used_at || null });
});

// ─────────────────────────────────────────────────────────────
// POST /sync/qr-validate
// Validate a scanned QR + consume its nonce (one-time use).
// ─────────────────────────────────────────────────────────────
router.post('/qr-validate', authMiddleware, async (req, res) => {
    const { qr_data } = req.body;
    if (!qr_data) return res.status(400).json({ error: 'qr_data requis' });

    let payload;
    try {
        payload = qrService.validateQRData(qr_data);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }

    // Anti-replay: mark nonce as used
    const nonceUsed = await db.query(
        'SELECT nonce FROM qr_nonces WHERE nonce = $1',
        [payload.nonce]
    );
    if (nonceUsed.rows.length > 0)
        return res.status(400).json({ error: 'QR déjà utilisé (replay détecté)' });

    await db.query(
        `INSERT INTO qr_nonces (nonce, order_id, used_by, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours')
         ON CONFLICT (nonce) DO NOTHING`,
        [payload.nonce, payload.orderId, req.user.id]
    );

    // Return order details
    try {
        const order = await orderService.getOrderById(payload.orderId);
        res.json({ valid: true, order });
    } catch {
        res.status(404).json({ error: 'Commande introuvable' });
    }
});

module.exports = router;
