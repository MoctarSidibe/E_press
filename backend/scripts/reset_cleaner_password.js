const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    try {
        const email = 'cleaner@test.com';
        const newPassword = 'password'; // 8 chars

        console.log(`🔄 Resetting password for ${email} to '${newPassword}'...`);

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const res = await db.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
            [hashedPassword, email]
        );

        if (res.rows.length > 0) {
            console.log('✅ Password successfully reset.');
        } else {
            console.log('❌ User not found.');
        }

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit();
    }
}

resetPassword();
