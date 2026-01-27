require('dotenv').config({ path: '../.env' });
const db = require('../database/db');

async function getDetails() {
    try {
        const res = await db.query('SELECT id, order_number FROM orders ORDER BY created_at DESC LIMIT 1');
        console.log('TIMEOUT_START');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connection logs
        console.log('ID:' + res.rows[0].id);
        console.log('NUM:' + res.rows[0].order_number);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

getDetails();
