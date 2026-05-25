const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Each app binary is allowed to authenticate a specific set of user roles.
// The mobile client sends appVariant in the request body so the server can reject
// cross-app login (e.g. a driver trying to sign in on the Customer app).
const VARIANT_ROLES = {
    customer: ['customer'],
    worker: ['driver', 'cleaner'],
};

const isRoleAllowedForVariant = (role, variant) => {
    const allowed = VARIANT_ROLES[variant];
    return Array.isArray(allowed) && allowed.includes(role);
};

class AuthService {
    // Generate unique E-Press card number (format: EP-XXXX-XXXX-XXXX)
    generateCardNumber() {
        const seg = () => String(Math.floor(Math.random() * 9000) + 1000);
        return `EP-${seg()}-${seg()}-${seg()}`;
    }

    // Register new user
    async register(userData) {
        const { email, password, fullName, phone, role = 'customer', appVariant } = userData;

        // Admin accounts are never created through public registration.
        if (role === 'admin') {
            throw new Error('Admin accounts cannot be created through registration');
        }

        // Block cross-app registration: a Customer-app binary cannot create a driver
        // account, and the Worker-app binary cannot create a customer account.
        // appVariant is optional (older clients won't send it) — when present we enforce.
        if (appVariant && !isRoleAllowedForVariant(role, appVariant)) {
            throw new Error(
                appVariant === 'customer'
                    ? 'This app is for customers. Workers must use the E-Press Pro app.'
                    : 'This app is for drivers and cleaners. Customers must use the E-Press app.'
            );
        }

        console.log(`[REGISTER] Attempting to register user: ${email}, role: ${role}`);

        // Check if user exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            console.log(`[REGISTER] Email already exists: ${email}`);
            throw new Error('Email already registered');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        console.log(`[REGISTER] Password hashed successfully for: ${email}`);

        // Generate unique card number
        let cardNumber;
        let cardExists = true;
        while (cardExists) {
            cardNumber = this.generateCardNumber();
            const check = await db.query('SELECT id FROM users WHERE card_number = $1', [cardNumber]);
            cardExists = check.rows.length > 0;
        }

        // Insert user
        const result = await db.query(
            `INSERT INTO users (email, password_hash, full_name, phone, role, card_number, points_balance, points_earned_total)
             VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
             RETURNING id, email, full_name, phone, role, card_number, points_balance, points_earned_total, kyc_status, created_at`,
            [email, passwordHash, fullName, phone, role, cardNumber]
        );

        const user = result.rows[0];
        console.log(`[REGISTER] User created: ${user.email}, Card: ${user.card_number}`);

        const token = this.generateToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                cardNumber: user.card_number,
                pointsBalance: user.points_balance,
                pointsEarnedTotal: user.points_earned_total,
                kycStatus: user.kyc_status || 'not_submitted',
                createdAt: user.created_at
            },
            token
        };
    }

    // Login by email OR phone. The mobile client sends whichever identifier the
    // user typed (email mode or phone mode); we look the user up by either column.
    // This lets users who registered without an email sign in via phone.
    async login(emailOrPhone, password, appVariant) {
        const result = await db.query(
            `SELECT id, email, password_hash, full_name, phone, role, avatar_url, is_active,
                    card_number, points_balance, points_earned_total, kyc_status, kyc_rejection_reason
             FROM users
             WHERE email = $1 OR phone = $1
             LIMIT 1`,
            [emailOrPhone]
        );

        if (result.rows.length === 0) {
            throw new Error('Invalid credentials');
        }

        const user = result.rows[0];

        if (!user.is_active) {
            throw new Error('Account is deactivated');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        // Block cross-app login: a customer account cannot sign in on the Worker app
        // and vice-versa. Admin accounts are only allowed via the admin panel, never
        // through a mobile binary. appVariant is optional (older clients won't send it).
        if (appVariant) {
            if (user.role === 'admin') {
                throw new Error('Admin accounts must use the admin panel');
            }
            if (!isRoleAllowedForVariant(user.role, appVariant)) {
                throw new Error(
                    appVariant === 'customer'
                        ? 'This account is for workers. Please use the E-Press Pro app.'
                        : 'This account is for customers. Please use the E-Press app.'
                );
            }
        }

        const token = this.generateToken(user);

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                phone: user.phone,
                role: user.role,
                avatarUrl: user.avatar_url,
                cardNumber: user.card_number,
                pointsBalance: user.points_balance || 0,
                pointsEarnedTotal: user.points_earned_total || 0,
                kycStatus: user.kyc_status || 'not_submitted',
                kycRejectionReason: user.kyc_rejection_reason || null
            },
            token
        };
    }

    // Generate JWT token
    generateToken(user) {
        return jwt.sign(
            { id: user.id, email: user.email, role: user.role },
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
            `SELECT id, email, full_name, phone, role, avatar_url, is_active,
                    card_number, points_balance, points_earned_total, created_at,
                    kyc_status, kyc_rejection_reason
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
            cardNumber: user.card_number,
            pointsBalance: user.points_balance || 0,
            pointsEarnedTotal: user.points_earned_total || 0,
            kycStatus: user.kyc_status || 'not_submitted',
            kycRejectionReason: user.kyc_rejection_reason || null,
            createdAt: user.created_at
        };
    }
}

module.exports = new AuthService();
