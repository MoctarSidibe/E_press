require('dotenv').config({ path: '../.env' }); // Adjust path to root .env
const orderService = require('../services/order.service');
const db = require('../database/db');
const crypto = require('crypto');

async function createCleanerTestOrder() {
    try {
        console.log('Creating test order for Cleaner (Status: picked_up)...');

        // Location setup (Copied from create_test_order_2km.js)
        const pickupLat = 0.45924626;
        const pickupLng = 9.41951808;
        const customerId = '75b12622-dbc4-4890-8595-0c859b168278';

        // 1. Create Locations (Reuse or create new doesn't strictly matter for this test, but new is cleaner)
        const pickupLocRes = await db.query(
            `INSERT INTO locations (id, user_id, label, address, latitude, longitude)
             VALUES ($1, $2, 'Test Pickup', 'Cleaner Test Loc', $3, $4) RETURNING id`,
            [crypto.randomUUID(), customerId, pickupLat.toString(), pickupLng.toString()]
        );
        const pickupLocId = pickupLocRes.rows[0].id;

        const deliveryLocRes = await db.query(
            `INSERT INTO locations (id, user_id, label, address, latitude, longitude)
             VALUES ($1, $2, 'Test Delivery', 'Cleaner Test Dest', $3, $4) RETURNING id`,
            [crypto.randomUUID(), customerId, pickupLat.toString(), pickupLng.toString()]
        );
        const deliveryLocId = deliveryLocRes.rows[0].id;

        // 2. Create Order
        const orderData = {
            pickupLocationId: pickupLocId,
            deliveryLocationId: deliveryLocId,
            pickupType: 'immediate',
            isExpress: true,
            items: [
                { categoryId: '3fbbceeb-5188-46c8-9844-31f0cfb3f946', quantity: 3, notes: 'Items for Cleaner Check' }
            ],
            specialInstructions: 'Cleaner Test Order'
        };

        // Ensure category exists
        const catRes = await db.query('SELECT id FROM clothing_categories LIMIT 1');
        if (catRes.rows.length > 0) {
            orderData.items[0].categoryId = catRes.rows[0].id;
        }

        const order = await orderService.createOrder(customerId, orderData);
        console.log(`Order created: ${order.order_number} (${order.id})`);

        // 3. Force update status to 'picked_up'
        await db.query(`UPDATE orders SET status = 'picked_up' WHERE id = $1`, [order.id]);
        console.log(`Order status updated to 'picked_up'`);

        // 4. Output JSON for QR
        const qrData = {
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: "Test Customer",
            customerPhone: "+24160000000",
            itemCount: 3,
            createdAt: new Date().toISOString(),
            pickupAddress: "Cleaner Test Loc",
            deliveryAddress: "Cleaner Test Dest"
        };

        console.log('AG_JSON_START');
        console.log(JSON.stringify(qrData));
        console.log('AG_JSON_END');

    } catch (err) {
        console.error('Failed:', err);
    } finally {
        process.exit();
    }
}

createCleanerTestOrder();
