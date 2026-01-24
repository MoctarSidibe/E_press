const db = require('./database/db');
require('dotenv').config();

async function testConnection() {
    console.log('Testing Database Connection...');
    try {
        const res = await db.query('SELECT NOW()');
        console.log('✅ Connection Successful:', res.rows[0]);

        console.log('\nTesting Categories Query...');
        const categories = await db.query('SELECT * FROM clothing_categories LIMIT 1');
        console.log('✅ Categories Query Successful. Count:', categories.rows.length);
        if (categories.rows.length > 0) {
            console.log('Sample Category:', categories.rows[0]);
        } else {
            console.log('⚠️ Categories table is empty based on LIMIT 1.');
        }

    } catch (err) {
        console.error('❌ Database Error:', err.message);
        if (err.code) console.error('Error Code:', err.code);
        if (err.detail) console.error('Error Detail:', err.detail);
    } finally {
        process.exit();
    }
}

testConnection();
