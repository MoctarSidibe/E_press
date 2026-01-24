const db = require('./database/db');

async function debug() {
    try {
        console.log('--- USERS (Drivers) ---');
        const drivers = await db.query("SELECT id, full_name, email, role, is_active FROM users WHERE role = 'driver'");
        console.table(drivers.rows);

        console.log('\n--- ACTIVE ORDERS (Last 5) ---');
        const orders = await db.query(`
            SELECT id, order_number, status, pickup_type, pickup_driver_id, delivery_driver_id, created_at 
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.table(orders.rows);

        if (orders.rows.length > 0) {
            const lastOrder = orders.rows[0];
            console.log(`\n--- NOTIFICATIONS FOR ORDER ${lastOrder.order_number} ---`);
            const notifs = await db.query(`
                SELECT id, notification_type, sent_to, is_accepted, read_at 
                FROM courier_notifications 
                WHERE order_id = $1
            `, [lastOrder.id]);
            console.table(notifs.rows);
        }

    } catch (err) {
        console.error(err);
    }
}

debug();
