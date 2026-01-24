const notificationService = require('./services/notification.service');
const db = require('./database/db');

async function forceNotify() {
    try {
        const orderId = '5ceb527d-ad46-4a3f-b79f-8077564806cf'; // ORD-84005341
        console.log(`Force notifying for order ${orderId}...`);

        await notificationService.notifyAvailablePickupCouriers(orderId);

        console.log('Notification sent! Check the app.');

        // Verify it exists now
        const res = await db.query("SELECT * FROM courier_notifications WHERE order_id = $1", [orderId]);
        console.table(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

forceNotify();
