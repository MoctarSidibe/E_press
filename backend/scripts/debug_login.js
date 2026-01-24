const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function debugLogin() {
    try {
        const email = 'cleaner@test.com';
        const password = 'password123';

        console.log(`🔍 Checking user ${email}...`);

        // 1. Get user raw
        const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (res.rows.length === 0) {
            console.log('❌ User not found in database!');
            return;
        }

        const user = res.rows[0];
        console.log('✅ User found:', {
            id: user.id,
            email: user.email,
            role: user.role,
            is_active: user.is_active,
            has_password_hash: !!user.password_hash
        });

        // 2. Compare password
        console.log('🔐 Verifying password...');
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (isValid) {
            console.log('✅ Password IS VALID via bcrypt.compare');
        } else {
            console.log('❌ Password IS INVALID via bcrypt.compare');

            // Attempt to reset it to be sure
            console.log('🔄 Resetting password to "password123"...');
            const newHash = await bcrypt.hash(password, 10);
            await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
            console.log('✅ Password reset complete.');
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

debugLogin();
