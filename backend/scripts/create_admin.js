const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        console.log('👑 Creating admin user...');
        const email = 'admin@test.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const res = await db.query(
            `INSERT INTO users (full_name, email, password_hash, role, phone, is_active)
             VALUES ($1, $2, $3, 'admin', $4, true)
             RETURNING id, email, role`,
            ['System Admin', email, hashedPassword, '+24100000000']
        );

        console.log('✅ Created admin:', res.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            console.log('⚠️ Admin already exists. Try logging in with the credentials below.');
        } else {
            console.error('Error:', err);
        }
    } finally {
        console.log('\n🔑 Credentials:');
        console.log('Email: admin@test.com');
        console.log('Password: password123');
        process.exit();
    }
}

createAdmin();
