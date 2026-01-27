require('dotenv').config();
const orderService = require('./services/order.service');
const db = require('./database/db');
const crypto = require('crypto');
// const { v4: uuidv4 } = require('uuid'); // Removed

async function createTestOrder() {
    try {
        console.log('Creating test order (2km away)...');

        // Baseline: 0.45924626, 9.41951808 (from last location)
        // Offset ~2km (approx 0.018 deg lat)
        const pickupLat = 0.45924626 + 0.018;
        const pickupLng = 9.41951808 + 0.018; // Diagonal offset

        const deliveryLat = pickupLat + 0.01;
        const deliveryLng = pickupLng + 0.01;

        const customerId = '75b12622-dbc4-4890-8595-0c859b168278'; // Existing customer from location query

        console.log(`Pickup Location: ${pickupLat}, ${pickupLng}`);

        // 1. Create Locations
        const pickupLocRes = await db.query(
            `INSERT INTO locations (id, user_id, label, address, latitude, longitude)
             VALUES ($1, $2, 'Test Pickup', '2km Away Test Location, Libreville', $3, $4) RETURNING id`,
            [crypto.randomUUID(), customerId, pickupLat.toString(), pickupLng.toString()]
        );
        const pickupLocId = pickupLocRes.rows[0].id;

        const deliveryLocRes = await db.query(
            `INSERT INTO locations (id, user_id, label, address, latitude, longitude)
             VALUES ($1, $2, 'Test Delivery', 'Delivery Dest, Libreville', $3, $4) RETURNING id`,
            [crypto.randomUUID(), customerId, deliveryLat.toString(), deliveryLng.toString()]
        );
        const deliveryLocId = deliveryLocRes.rows[0].id;

        // 2. Create Order using OrderService (handles notification automatically)
        const orderData = {
            pickupLocationId: pickupLocId,
            deliveryLocationId: deliveryLocId,
            pickupType: 'immediate', // Important for notification!
            isExpress: true,
            items: [
                { categoryId: '3fbbceeb-5188-46c8-9844-31f0cfb3f946', quantity: 2, notes: 'Test Items' } // Assuming this category exists, if fails we'll pick one
            ],
            specialInstructions: 'Test order for navigation check'
        };

        // Get a valid category
        const catRes = await db.query('SELECT id FROM clothing_categories LIMIT 1');
        orderData.items[0].categoryId = catRes.rows[0].id;

        const order = await orderService.createOrder(customerId, orderData);

        console.log(`Order created successfully: ${order.order_number}`);
        console.log(`Order ID: ${order.id}`);
        console.log(`Pickup Type: ${order.pickup_type}`);

    } catch (err) {
        console.error('Failed to create order:', err);
    } finally {
        process.exit();
    }
}

createTestOrder();
