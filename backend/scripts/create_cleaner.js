const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function createCleaner() {
    try {
        console.log('🧹 Creating test cleaner...');
        const email = 'cleaner@test.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const res = await db.query(
            `INSERT INTO users (full_name, email, password_hash, role, phone, is_active)
             VALUES ($1, $2, $3, 'cleaner', $4, true)
             RETURNING id, email, role`,
            ['Test Cleaner', email, hashedPassword, '+24100000002']
        );

        console.log('✅ Created cleaner:', res.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            console.log('⚠️ Cleaner already exists.');
        } else {
            console.error('Error:', err);
        }
    } finally {
        process.exit();
    }
}

createCleaner();
