require('dotenv').config({ path: '../.env' });
const db = require('../database/db');

async function getLatestOrder() {
    try {
        const res = await db.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1');
        const order = res.rows[0];

        const qrData = {
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: "Test Customer",
            customerPhone: "+24160000000",
            itemCount: order.confirmed_item_count || 3,
            createdAt: order.created_at,
            pickupAddress: "Cleaner Test Loc",
            deliveryAddress: "Cleaner Test Dest"
        };
        console.log('JSON_START');
        console.log(JSON.stringify(qrData));
        console.log('JSON_END');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

getLatestOrder();
