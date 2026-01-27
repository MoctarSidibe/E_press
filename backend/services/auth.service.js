const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

class AuthService {
    // Register new user
    async register(userData) {
        const { email, password, fullName, phone, role = 'customer' } = userData;

        // Check if user exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            throw new Error('Email already registered');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        const result = await db.query(
            `INSERT INTO users (email, password_hash, full_name, phone, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, full_name, phone, role, created_at`,
            [email, passwordHash, fullName, phone, role]
        );

        const user = result.rows[0];

        // Generate token
        const token = this.generateToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                createdAt: user.created_at
            },
            token
        };
    }

    // Login
    async login(email, password) {
        // Find user
        const result = await db.query(
            `SELECT id, email, password_hash, full_name, phone, role, avatar_url, is_active
             FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            throw new Error('Invalid credentials');
        }

        const user = result.rows[0];

        if (!user.is_active) {
            throw new Error('Account is deactivated');
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        // Generate token
        const token = this.generateToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                avatarUrl: user.avatar_url
            },
            token
        };
    }

    // Generate JWT token
    generateToken(user) {
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
    }

    // Verify token
    verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    // Get user by ID
    async getUserById(userId) {
        const result = await db.query(
            `SELECT id, email, full_name, phone, role, avatar_url, is_active, created_at
             FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        const user = result.rows[0];
        return {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            phone: user.phone,
            role: user.role,
            avatarUrl: user.avatar_url,
            isActive: user.is_active,
            createdAt: user.created_at
        };
    }
}

module.exports = new AuthService();
