const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth.middleware');

// Validation middleware
const validateRegister = [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('role').optional().isIn(['customer', 'driver', 'admin', 'cleaner']).withMessage('Invalid role')
];

const validateLogin = [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required')
];

// Register
router.post('/register', validateRegister, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Format validation errors for better mobile app compatibility
            const errorMessages = errors.array().map(err => err.msg).join(', ');
            return res.status(400).json({ 
                error: errorMessages,
                errors: errors.array() // Keep for backward compatibility
            });
        }

        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('[REGISTER ERROR]', error.message);
        res.status(400).json({ error: error.message });
    }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Format validation errors for better mobile app compatibility
            const errorMessages = errors.array().map(err => err.msg).join(', ');
            return res.status(400).json({ 
                error: errorMessages,
                errors: errors.array() // Keep for backward compatibility
            });
        }

        const { email, password } = req.body;
        console.log(`[LOGIN DEBUG] Request for: ${email}, Password length: ${password?.length}`);
        const result = await authService.login(email, password);
        res.json(result);
    } catch (error) {
        console.error('[LOGIN ERROR]', error.message);
        res.status(401).json({ error: error.message });
    }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await authService.getUserById(req.user.id);
        res.json(user);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Verify token
router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;
        const decoded = authService.verifyToken(token);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, error: error.message });
    }
});

module.exports = router;
