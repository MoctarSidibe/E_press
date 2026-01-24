const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');

async function debugOrders() {
    console.log('🔍 Debugging Available Orders System\n');

    try {
        // 1. Check drivers
        const drivers = await db.query(`SELECT id, full_name, email, role FROM users WHERE role = 'driver'`);
        console.log(`📋 Drivers in system: ${drivers.rows.length}`);
        drivers.rows.forEach(d => console.log(`   - ${d.full_name} (${d.email}) - ID: ${d.id}`));

        if (drivers.rows.length === 0) {
            console.log('\n❌ No drivers found!');
            process.exit();
        }

        const driverId = drivers.rows[0].id;
        console.log(`\n✅ Using driver: ${drivers.rows[0].full_name} (${driverId})`);

        // 2. Check pending orders
        console.log('\n📦 Pending Orders:');
        const orders = await db.query(`
            SELECT id, order_number, status, pickup_type, created_at 
            FROM orders 
            WHERE status = 'pending' 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log(`   Found ${orders.rows.length} pending orders`);
        orders.rows.forEach(o => {
            console.log(`   - #${o.order_number} (${o.pickup_type}) - ${o.id}`);
        });

        // 3. Check notifications for this driver
        console.log('\n🔔 Notifications for driver:');
        const notifications = await db.query(`
            SELECT cn.*, o.order_number, o.status as order_status
            FROM courier_notifications cn
            LEFT JOIN orders o ON o.id = cn.order_id
            WHERE cn.sent_to = $1
            ORDER BY cn.sent_at DESC
            LIMIT 10
        `, [driverId]);
        console.log(`   Found ${notifications.rows.length} notifications`);
        notifications.rows.forEach(n => {
            console.log(`   - Order #${n.order_number} (${n.notification_type})`);
            console.log(`     Accepted: ${n.is_accepted}, Order Status: ${n.order_status}`);
        });

        // 4. Simulate the query that getAvailableOrders runs
        console.log('\n🔍 Running getAvailableOrders query:');
        const availableOrders = await db.query(`
            SELECT DISTINCT o.id, o.order_number, o.status,
                    cn.id as notification_id,
                    cn.is_accepted,
                    cn.notification_type
            FROM orders o
            INNER JOIN courier_notifications cn ON cn.order_id = o.id
            INNER JOIN users u ON u.id = o.customer_id
            LEFT JOIN locations pl ON pl.id = o.pickup_location_id
            LEFT JOIN locations dl ON dl.id = o.delivery_location_id
            WHERE cn.sent_to = $1 
              AND cn.notification_type = $2
              AND cn.is_accepted = false
              AND o.status != 'cancelled'
            ORDER BY cn.sent_at DESC
        `, [driverId, 'pickup_available']);

        console.log(`   Result: ${availableOrders.rows.length} orders`);
        availableOrders.rows.forEach(o => {
            console.log(`   ✅ Order #${o.order_number} - ${o.id}`);
            console.log(`      Status: ${o.status}, Accepted: ${o.is_accepted}`);
        });

        if (availableOrders.rows.length === 0) {
            console.log('\n⚠️  No orders returned! Checking why...');

            // Check each condition
            const withoutAccepted = await db.query(`
                SELECT COUNT(*) FROM courier_notifications cn
                INNER JOIN orders o ON o.id = cn.order_id
                WHERE cn.sent_to = $1 AND cn.notification_type = $2
            `, [driverId, 'pickup_available']);
            console.log(`   - Total notifications (any status): ${withoutAccepted.rows[0].count}`);

            const onlyAccepted = await db.query(`
                SELECT COUNT(*) FROM courier_notifications cn
                INNER JOIN orders o ON o.id = cn.order_id
                WHERE cn.sent_to = $1 
                  AND cn.notification_type = $2
                  AND cn.is_accepted = true
            `, [driverId, 'pickup_available']);
            console.log(`   - Already accepted: ${onlyAccepted.rows[0].count}`);

            const cancelled = await db.query(`
                SELECT COUNT(*) FROM courier_notifications cn
                INNER JOIN orders o ON o.id = cn.order_id
                WHERE cn.sent_to = $1 
                  AND cn.notification_type = $2
                  AND o.status = 'cancelled'
            `, [driverId, 'pickup_available']);
            console.log(`   - Cancelled orders: ${cancelled.rows[0].count}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

debugOrders();
