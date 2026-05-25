const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware: authenticate } = require('../middleware/auth.middleware');

// POST /api/coupons/validate - Validate a coupon code for an order amount
router.post('/validate', authenticate, async (req, res) => {
    try {
        const { code, orderAmount } = req.body;

        if (!code) return res.status(400).json({ error: 'Coupon code is required' });

        const result = await db.query(
            `SELECT * FROM coupons
             WHERE UPPER(code) = UPPER($1)
               AND is_active = true
               AND (valid_from IS NULL OR valid_from <= NOW())
               AND (valid_until IS NULL OR valid_until >= NOW())
               AND (max_uses IS NULL OR uses_count < max_uses)`,
            [code.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired coupon code' });
        }

        const coupon = result.rows[0];

        if (orderAmount < coupon.min_order_amount) {
            return res.status(400).json({
                error: `This coupon requires a minimum order of ${coupon.min_order_amount} FCFA`
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discount_type === 'percent') {
            discountAmount = (orderAmount * coupon.discount_value) / 100;
            if (coupon.max_discount_amount) {
                discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
            }
        } else {
            discountAmount = Math.min(coupon.discount_value, orderAmount);
        }

        res.json({
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                name: coupon.name,
                description: coupon.description,
                discountType: coupon.discount_type,
                discountValue: coupon.discount_value,
            },
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            finalAmount: parseFloat((orderAmount - discountAmount).toFixed(2))
        });
    } catch (error) {
        console.error('[Coupon] Validate error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
