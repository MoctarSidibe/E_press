const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
console.log('DB Config Check:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    db: process.env.DB_NAME
});
const db = require('../database/db');
const notificationService = require('../services/notification.service');

async function seedNotifications() {
    console.log('🌱 Seeding notifications for existing pending orders...');

    try {
        // 1. Get all drivers (active or not, for testing)
        const driversResult = await db.query(`SELECT id, full_name FROM users WHERE role = 'driver'`);
        if (driversResult.rows.length === 0) {
            console.log('❌ No drivers found! Create a driver account first.');
            process.exit();
        }
        console.log(`Found ${driversResult.rows.length} drivers.`);

        // 2. Get pending orders
        const ordersResult = await db.query(`
            SELECT id, pickup_type, created_at FROM orders 
            WHERE status = 'pending' 
            ORDER BY created_at DESC
            LIMIT 10
        `);

        console.log(`Found ${ordersResult.rows.length} pending orders.`);

        let count = 0;
        for (const order of ordersResult.rows) {
            if (order.pickup_type === 'immediate') {
                for (const driver of driversResult.rows) {
                    // Check if notification already exists
                    const existing = await db.query(
                        `SELECT id FROM courier_notifications WHERE order_id = $1 AND sent_to = $2`,
                        [order.id, driver.id]
                    );

                    if (existing.rows.length === 0) {
                        await db.query(
                            `INSERT INTO courier_notifications (order_id, notification_type, sent_to, sent_at)
                             VALUES ($1, 'pickup_available', $2, CURRENT_TIMESTAMP)`,
                            [order.id, driver.id]
                        );
                        count++;
                    }
                }
            }
        }

        console.log(`✅ Created ${count} new notifications.`);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        process.exit();
    }
}

seedNotifications();
