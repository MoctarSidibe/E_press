const express = require('express');
const router = express.Router();
const driverService = require('../services/driver.service');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

// Get my orders (driver)
router.get('/orders', authMiddleware, requireRole('driver'), async (req, res) => {
    try {
        const { status } = req.query;
        const orders = await driverService.getDriverOrders(req.user.id, status);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update my location (driver)
router.post('/location', authMiddleware, requireRole('driver'), async (req, res) => {
    try {
        const location = await driverService.updateLocation(req.user.id, req.body);
        res.json(location);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get my current location (driver)
router.get('/location', authMiddleware, requireRole('driver'), async (req, res) => {
    try {
        const location = await driverService.getCurrentLocation(req.user.id);
        res.json(location);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Get my statistics (driver)
router.get('/stats', authMiddleware, requireRole('driver'), async (req, res) => {
    try {
        const stats = await driverService.getDriverStats(req.user.id);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all drivers (admin)
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const drivers = await driverService.getAllDrivers();
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accept order (driver) - simpler endpoint without notification requirement
router.post('/orders/:orderId/accept', authMiddleware, requireRole('driver'), async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderService = require('../services/order.service');

        // Get current order to determine if this is pickup or delivery
        const order = await orderService.getOrderById(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Determine if this is pickup or delivery assignment
        const isPickup = !order.pickup_driver_id;

        // Assign driver
        if (isPickup) {
            await orderService.assignPickupDriver(orderId, req.user.id);
        } else {
            await orderService.assignDeliveryDriver(orderId, req.user.id);
        }

        // Get updated order
        const updatedOrder = await orderService.getOrderById(orderId);

        res.json({
            success: true,
            order: updatedOrder,
            message: 'Order accepted successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
