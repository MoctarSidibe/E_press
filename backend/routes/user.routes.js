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

// Register the device's Expo push token so the backend can send remote
// notifications. Called by the mobile app right after login (and whenever the
// token rotates). Idempotent — overwrites any prior token for this user.
router.post('/push-token', authMiddleware, async (req, res) => {
    const { token, platform } = req.body || {};
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'token is required' });
    }
    try {
        // Clear the same token from any other user (e.g. shared device or
        // re-login as a different account on the same phone) so push routing
        // stays unambiguous.
        await db.query(
            `UPDATE users SET push_token = NULL, push_platform = NULL, push_token_at = NULL
             WHERE push_token = $1 AND id <> $2`,
            [token, req.user.id]
        );

        await db.query(
            `UPDATE users
             SET push_token = $1, push_platform = $2, push_token_at = NOW()
             WHERE id = $3`,
            [token, platform || null, req.user.id]
        );
        res.json({ ok: true });
    } catch (error) {
        // Most common cause when this fails: migration 017 hasn't been applied
        // (push_token column missing). Surface the real Postgres error code so
        // it's obvious from the logs.
        console.error('[Push] register error:', error.code, error.message);
        const hint = error.code === '42703' ? ' (run migration 017_add_push_tokens.sql)' : '';
        res.status(500).json({ error: 'Server error' + hint });
    }
});

// Unregister on logout so a re-logged-in user doesn't keep receiving pushes
// for the previous account on the same device.
router.delete('/push-token', authMiddleware, async (req, res) => {
    try {
        await db.query(
            `UPDATE users SET push_token = NULL, push_platform = NULL, push_token_at = NULL
             WHERE id = $1`,
            [req.user.id]
        );
        res.json({ ok: true });
    } catch (error) {
        console.error('[Push] unregister error:', error.code, error.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
