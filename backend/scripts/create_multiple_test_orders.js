const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');
const notificationService = require('../services/notification.service');

async function createMultipleTestOrders() {
    console.log('🧪 Creating 3 test orders for driver testing\n');

    try {
        const customer = await db.query(`SELECT id FROM users WHERE role = 'customer' LIMIT 1`);
        if (customer.rows.length === 0) {
            console.log('❌ No customer found!');
            process.exit();
        }

        const locations = await db.query(`SELECT id FROM locations WHERE user_id = $1 LIMIT 2`, [customer.rows[0].id]);
        if (locations.rows.length < 2) {
            console.log('❌ Customer needs at least 2 locations!');
            process.exit();
        }

        for (let i = 0; i < 3; i++) {
            const orderNumber = `TEST-${Math.floor(Math.random() * 100000)}`;

            const order = await db.query(`
                INSERT INTO orders (
                    order_number, customer_id, pickup_location_id, delivery_location_id,
                    pickup_type, subtotal, delivery_fee, express_fee, tax, total,
                    status, confirmed_item_count, qr_code_data
                ) VALUES ($1, $2, $3, $4, 'immediate', ${100 + i * 20}, 20, 0, 12, ${132 + i * 20}, 'pending', ${3 + i}, $5::text)
                RETURNING *
            `, [orderNumber, customer.rows[0].id, locations.rows[0].id, locations.rows[1].id, orderNumber]);

            console.log(`✅ Created order: ${orderNumber}`);

            await notificationService.notifyAvailablePickupCouriers(order.rows[0].id);
        }

        console.log('\n✅ All test orders created!');
        console.log('🎯 Reload the driver app to see 3 orders in the carousel!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

createMultipleTestOrders();
