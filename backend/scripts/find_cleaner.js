const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');

async function listCleaners() {
    try {
        console.log('🔍 Searching for cleaners...');
        const res = await db.query("SELECT id, email, full_name, role FROM users WHERE role = 'cleaner'");

        if (res.rows.length === 0) {
            console.log('❌ No cleaners found.');
        } else {
            console.log('✅ Found cleaners:');
            console.table(res.rows);
            console.log('\n(Password is likely: password123)');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

listCleaners();
