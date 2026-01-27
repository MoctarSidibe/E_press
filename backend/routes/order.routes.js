const express = require('express');
const router = express.Router();
const orderService = require('../services/order.service');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

// Create new order (customer)
router.post('/', authMiddleware, requireRole('customer'), async (req, res) => {
    try {
        const order = await orderService.createOrder(req.user.id, req.body);
        res.status(201).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get my orders (customer)
router.get('/my-orders', authMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        const orders = await orderService.getOrdersByCustomer(req.user.id, status);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get orders in facility (cleaner)
router.get('/facility', authMiddleware, requireRole('cleaner'), async (req, res) => {
    try {
        const { status } = req.query;
        // Use getAllOrders admin logic but filtered by status
        const filters = {};
        if (status) filters.status = status;

        const orders = await orderService.getAllOrders(filters);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get order by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        res.json(order);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Update order status
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status, notes } = req.body;
        const order = await orderService.updateOrderStatus(
            req.params.id,
            status,
            req.user.id,
            notes
        );
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Cancel order (customer)
router.post('/:id/cancel', authMiddleware, requireRole('customer'), async (req, res) => {
    try {
        const order = await orderService.cancelOrder(req.params.id, req.user.id);
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Assign driver (admin)
router.patch('/:id/assign-driver', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { driverId } = req.body;
        const order = await orderService.assignDriver(req.params.id, driverId);
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add order photo
router.post('/:id/photos', authMiddleware, async (req, res) => {
    try {
        const { photoType, photoUrl, notes } = req.body;
        const photo = await orderService.savePhoto(
            req.params.id,
            photoType,
            photoUrl,
            req.user.id,
            notes
        );
        res.status(201).json(photo);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add order signature
router.post('/:id/signatures', authMiddleware, async (req, res) => {
    try {
        const { signatureType, signatureData } = req.body;
        const signature = await orderService.saveSignature(
            req.params.id,
            signatureType,
            signatureData,
            req.user.id
        );
        res.status(201).json(signature);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all orders (admin)
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const orders = await orderService.getAllOrders(req.query);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
