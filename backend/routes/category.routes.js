const express = require('express');
const router = express.Router();
const categoryService = require('../services/category.service');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

// Get all categories (public)
router.get('/', async (req, res) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        res.json(category);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Create category (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update category (admin only)
router.patch('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body);
        res.json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
