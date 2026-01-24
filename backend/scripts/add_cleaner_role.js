const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');

async function updateRoleCheck() {
    try {
        console.log('🔄 Updating users_role_check...');
        // First try to drop it if it exists
        try {
            await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
        } catch (e) {
            console.log('Constraint might not exist or verify failed, ignoring...');
        }

        // Add it back with 'cleaner' included
        await db.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'driver', 'admin', 'cleaner'))`);
        console.log('✅ Role check updated!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

updateRoleCheck();
