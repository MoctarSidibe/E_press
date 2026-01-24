const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const db = require('../database/db');

// Create payment
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { orderId, paymentMethod, amount } = req.body;

        // For cash, immediately mark as completed
        const status = paymentMethod === 'cash' ? 'completed' : 'pending';
        const paidAt = paymentMethod === 'cash' ? new Date() : null;

        const result = await db.query(
            `INSERT INTO payments (order_id, payment_method, amount, status, paid_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [orderId, paymentMethod, amount, status, paidAt]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get payment by order ID
router.get('/order/:orderId', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM payments WHERE order_id = $1',
            [req.params.orderId]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mock Airtel Money payment
router.post('/airtel-money', authMiddleware, async (req, res) => {
    try {
        const { orderId, phoneNumber, amount } = req.body;

        // Mock payment - in production, integrate with actual Airtel Money API
        const transactionId = `AIRTEL-${Date.now()}`;

        const result = await db.query(
            `INSERT INTO payments (order_id, payment_method, amount, status, transaction_id, payment_metadata, paid_at)
             VALUES ($1, 'airtel_money', $2, 'completed', $3, $4, CURRENT_TIMESTAMP)
             RETURNING *`,
            [orderId, amount, transactionId, JSON.stringify({ phoneNumber })]
        );

        res.json({ success: true, payment: result.rows[0] });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Mock Moov Money payment
router.post('/moov-money', authMiddleware, async (req, res) => {
    try {
        const { orderId, phoneNumber, amount } = req.body;

        // Mock payment - in production, integrate with actual Moov Money API
        const transactionId = `MOOV-${Date.now()}`;

        const result = await db.query(
            `INSERT INTO payments (order_id, payment_method, amount, status, transaction_id, payment_metadata, paid_at)
             VALUES ($1, 'moov_money', $2, 'completed', $3, $4, CURRENT_TIMESTAMP)
             RETURNING *`,
            [orderId, amount, transactionId, JSON.stringify({ phoneNumber })]
        );

        res.json({ success: true, payment: result.rows[0] });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
