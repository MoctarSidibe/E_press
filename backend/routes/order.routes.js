const express = require('express');
const router = express.Router();
const db = require('../database/db');
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

// Get orders in facility (cleaner) - ONLY orders this cleaner has handled
router.get('/facility', authMiddleware, requireRole('cleaner'), async (req, res) => {
    try {
        const { status } = req.query;
        const cleanerId = req.user.id;

        // Get orders that THIS specific cleaner has received at reception
        const result = await db.pool.query(
            `SELECT o.*, 
                    u.full_name as customer_name,
                    u.phone as customer_phone,
                    pu.full_name as pickup_driver_name,
                    du.full_name as delivery_driver_name,
                    pl.label as pickup_label,
                    pl.address as pickup_address,
                    dl.label as delivery_label,
                    dl.address as delivery_address
             FROM orders o
             LEFT JOIN users u ON o.customer_id = u.id
             LEFT JOIN users pu ON o.pickup_driver_id = pu.id
             LEFT JOIN users du ON o.delivery_driver_id = du.id
             LEFT JOIN locations pl ON o.pickup_location_id = pl.id
             LEFT JOIN locations dl ON o.delivery_location_id = dl.id
             WHERE o.reception_cleaner_id = $1
             ${status ? 'AND o.status = $2' : ''}
             ORDER BY o.updated_at DESC`,
            status ? [cleanerId, status] : [cleanerId]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cleaner's order history (all processed orders)
router.get('/cleaner/history', authMiddleware, requireRole('cleaner'), async (req, res) => {
    try {
        const cleanerId = req.user.id;

        // Get ALL orders that this cleaner has processed, ordered by most recent
        const result = await db.pool.query(
            `SELECT o.*, 
                    u.full_name as customer_name,
                    u.phone as customer_phone,
                    pu.full_name as pickup_driver_name,
                    du.full_name as delivery_driver_name,
                    pl.label as pickup_label,
                    pl.address as pickup_address,
                    dl.label as delivery_label,
                    dl.address as delivery_address
             FROM orders o
             LEFT JOIN users u ON o.customer_id = u.id
             LEFT JOIN users pu ON o.pickup_driver_id = pu.id
             LEFT JOIN users du ON o.delivery_driver_id = du.id
             LEFT JOIN locations pl ON o.pickup_location_id = pl.id
             LEFT JOIN locations dl ON o.delivery_location_id = dl.id
             WHERE o.reception_cleaner_id = $1
             ORDER BY o.updated_at DESC
             LIMIT 100`,
            [cleanerId]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark order as ready for delivery (cleaner) - with driver notification
router.post('/cleaner/mark-ready/:orderId', authMiddleware, requireRole('cleaner'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const cleanerId = req.user.id;
        const notificationService = require('../services/notification.service');

        // Update order status to ready
        await orderService.updateOrderStatus(orderId, 'ready', cleanerId, 'Cleaned and ready for delivery');

        // Broadcast to all delivery drivers
        await notificationService.notifyAvailableDeliveryCouriers(orderId);

        // Emit socket event for real-time updates
        if (global.emitOrderStatusUpdate) {
            global.emitOrderStatusUpdate(orderId, 'ready');
        }

        const order = await orderService.getOrderById(orderId);
        res.json({ success: true, order });
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
