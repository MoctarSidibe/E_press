const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware: authenticate } = require('../middleware/auth.middleware');

// GET /api/points/balance - Get current user's points & card info
router.get('/balance', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT card_number, points_balance, points_earned_total FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const config = await db.query('SELECT * FROM points_config WHERE is_active = true LIMIT 1');
        const cfg = config.rows[0] || { points_per_1000_fcfa: 10, points_value_fcfa: 5, min_redemption_points: 100, max_redemption_percent: 50 };

        res.json({
            cardNumber: result.rows[0].card_number,
            pointsBalance: result.rows[0].points_balance || 0,
            pointsEarnedTotal: result.rows[0].points_earned_total || 0,
            // Full config so mobile can apply correct rules without hardcoding
            pointsValueFcfa: cfg.points_value_fcfa,
            minRedemptionPoints: cfg.min_redemption_points,
            maxRedemptionPercent: cfg.max_redemption_percent,
            pointsPerThousand: cfg.points_per_1000_fcfa,
            expressPercentage: cfg.express_percentage ?? 20,
        });
    } catch (error) {
        console.error('[Points] Balance error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/points/history - Get points transaction history
router.get('/history', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const result = await db.query(
            `SELECT pt.*, o.order_number
             FROM points_transactions pt
             LEFT JOIN orders o ON o.id = pt.order_id
             WHERE pt.user_id = $1
             ORDER BY pt.created_at DESC
             LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset]
        );

        res.json({ transactions: result.rows });
    } catch (error) {
        console.error('[Points] History error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/points/check-redemption - Check how many points user wants to redeem & get FCFA value
router.post('/check-redemption', authenticate, async (req, res) => {
    try {
        const { pointsToRedeem } = req.body;

        const userResult = await db.query(
            'SELECT points_balance FROM users WHERE id = $1',
            [req.user.id]
        );
        const userPoints = userResult.rows[0]?.points_balance || 0;

        const config = await db.query('SELECT * FROM points_config WHERE is_active = true LIMIT 1');
        const cfg = config.rows[0] || { points_value_fcfa: 5, min_redemption_points: 100 };

        if (pointsToRedeem < cfg.min_redemption_points) {
            return res.status(400).json({
                error: `Minimum redemption is ${cfg.min_redemption_points} points`
            });
        }
        if (pointsToRedeem > userPoints) {
            return res.status(400).json({ error: 'Insufficient points' });
        }

        const fcfaValue = pointsToRedeem * cfg.points_value_fcfa;
        res.json({ pointsToRedeem, fcfaValue, pointsValueFcfa: cfg.points_value_fcfa });
    } catch (error) {
        console.error('[Points] Check redemption error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
