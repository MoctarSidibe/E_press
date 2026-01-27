const db = require('./database/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
    try {
        console.log('🌱 Seeding Admin User...');

        const email = 'admin@epress.com';
        const password = 'Admin@123';
        const fullName = 'System Admin';
        const phone = '+24100000000';
        const role = 'admin';

        // Check if admin exists
        const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (existing.rows.length > 0) {
            console.log('⚠️  Admin already exists. Updating password...');
            const hash = await bcrypt.hash(password, 10);
            await db.query('UPDATE users SET password_hash = $1, role = $2 WHERE email = $3', [hash, role, email]);
            console.log('✅ Admin password updated to: ' + password);
        } else {
            console.log('✨ Creating new Admin user...');
            const hash = await bcrypt.hash(password, 10);
            await db.query(
                `INSERT INTO users (email, password_hash, full_name, phone, role)
                 VALUES ($1, $2, $3, $4, $5)`,
                [email, hash, fullName, phone, role]
            );
            console.log('✅ Admin created successfully!');
            console.log('📧 Email: ' + email);
            console.log('🔑 Password: ' + password);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedAdmin();
