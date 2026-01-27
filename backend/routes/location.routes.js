const express = require('express');
const router = express.Router();
const locationService = require('../services/location.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Create location
router.post('/', authMiddleware, async (req, res) => {
    try {
        const location = await locationService.createLocation(req.user.id, req.body);
        res.status(201).json(location);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get my locations
router.get('/', authMiddleware, async (req, res) => {
    try {
        console.log('[Locations] GET / requesting for user:', req.user);
        const locations = await locationService.getUserLocations(req.user.id);
        res.json(locations);
    } catch (error) {
        console.error('[Locations] GET / Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get location by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const location = await locationService.getLocationById(req.params.id, req.user.id);
        res.json(location);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Update location
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const location = await locationService.updateLocation(req.params.id, req.user.id, req.body);
        res.json(location);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete location
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await locationService.deleteLocation(req.params.id, req.user.id);
        res.json({ message: 'Location deleted successfully' });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

module.exports = router;
