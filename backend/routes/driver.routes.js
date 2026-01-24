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

module.exports = router;
