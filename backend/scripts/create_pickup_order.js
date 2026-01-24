const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');
const notificationService = require('../services/notification.service');

async function createTestOrder() {
    console.log('🧪 Creating test order for CLEANER testing (status: picked_up)\n');

    try {
        // Get a customer
        const customer = await db.query(`SELECT id FROM users WHERE role = 'customer' LIMIT 1`);
        if (customer.rows.length === 0) {
            console.log('❌ No customer found!');
            process.exit();
        }

        // Get locations for the customer
        const locations = await db.query(`SELECT id FROM locations WHERE user_id = $1 LIMIT 2`, [customer.rows[0].id]);
        if (locations.rows.length < 2) {
            console.log('❌ Customer needs at least 2 locations!');
            process.exit();
        }

        // Create order directly in 'picked_up' status
        const orderNumber = `TEST-CLEAN-${Math.floor(Math.random() * 100)}`;

        const order = await db.query(`
            INSERT INTO orders (
                order_number, customer_id, pickup_location_id, delivery_location_id,
                pickup_type, subtotal, delivery_fee, express_fee, tax, total,
                status, confirmed_item_count, pickup_item_count, 
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, 'immediate', 100, 20, 0, 12, 132, 'picked_up', 3, 3, NOW(), NOW())
            RETURNING *
        `, [orderNumber, customer.rows[0].id, locations.rows[0].id, locations.rows[1].id]);

        // Generate valid QR data with real ID
        const realQrData = JSON.stringify({
            orderId: order.rows[0].id,
            orderNumber: orderNumber,
            customerName: "Test Customer",
            itemCount: 3
        });

        const qrImage = 'data:image/png;base64,FAKEQR';

        // Update with valid QR
        await db.query('UPDATE orders SET qr_code_data = $1 WHERE id = $2', [realQrData, order.rows[0].id]);

        console.log(`✅ Created order: ${orderNumber}`);
        console.log(`🆔 ID: ${order.rows[0].id}`);
        console.log(`📊 Status: picked_up`);
        console.log(`\n📲 QR Code Data (copy this to test scan):`);
        console.log(realQrData);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

createTestOrder();
