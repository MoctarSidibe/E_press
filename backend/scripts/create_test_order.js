const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');
const notificationService = require('../services/notification.service');

async function createTestOrder() {
    console.log('🧪 Creating test order for driver testing\n');

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

        // Get a category
        const category = await db.query(`SELECT id FROM clothing_categories LIMIT 1`);

        // Create a simple test order
        const orderNumber = `TEST-${Math.floor(Math.random() * 100000)}`;

        const qrJson = JSON.stringify({
            orderId: "UUID_PLACEHOLDER", // We need ID first, but for insert we can't... wait, let's insert then update like service
            orderNumber: orderNumber,
            timestamp: new Date().toISOString()
        });

        const order = await db.query(`
            INSERT INTO orders (
                order_number, customer_id, pickup_location_id, delivery_location_id,
                pickup_type, subtotal, delivery_fee, express_fee, tax, total,
                status, confirmed_item_count
            ) VALUES ($1, $2, $3, $4, 'immediate', 100, 20, 0, 12, 132, 'pending', 3)
            RETURNING *
        `, [orderNumber, customer.rows[0].id, locations.rows[0].id, locations.rows[1].id]);

        // Generate valid QR data with real ID
        const realQrData = JSON.stringify({
            orderId: order.rows[0].id,
            orderNumber: orderNumber,
            customerName: "Test Customer",
            itemCount: 3
        });

        // Update with valid QR
        await db.query('UPDATE orders SET qr_code_data = $1 WHERE id = $2', [realQrData, order.rows[0].id]);

        console.log(`✅ Created order: ${orderNumber} (${order.rows[0].id})`);

        // Create notification for all drivers
        await notificationService.notifyAvailablePickupCouriers(order.rows[0].id);

        console.log('✅ Notifications sent to all drivers!');
        console.log('\n🎯 Test order ready! Reload the driver app to see it.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

createTestOrder();
