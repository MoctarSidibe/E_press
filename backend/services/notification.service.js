const db = require('../database/db');

class NotificationService {
    /**
     * Notify all available couriers about a new pickup order
     * @param {String} orderId - Order UUID
     * @returns {Promise<Array>} Array of notification records
     */
    async notifyAvailablePickupCouriers(orderId) {
        try {
            // Get all active drivers
            const driversResult = await db.query(
                `SELECT id FROM users WHERE role = 'driver' AND is_active = true`
            );

            const notifications = [];

            // Create notification record for each driver
            for (const driver of driversResult.rows) {
                const result = await db.query(
                    `INSERT INTO courier_notifications 
                     (order_id, notification_type, sent_to, sent_at) 
                     VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
                     RETURNING *`,
                    [orderId, 'pickup_available', driver.id]
                );
                notifications.push(result.rows[0]);
            }

            return notifications;
        } catch (error) {
            throw new Error(`Failed to notify couriers: ${error.message}`);
        }
    }

    /**
     * Notify all available couriers about order ready for delivery
     * @param {String} orderId - Order UUID
     * @returns {Promise<Array>} Array of notification records
     */
    async notifyAvailableDeliveryCouriers(orderId) {
        try {
            // Get all active drivers
            const driversResult = await db.query(
                `SELECT id FROM users WHERE role = 'driver' AND is_active = true`
            );

            const notifications = [];

            // Create notification record for each driver
            for (const driver of driversResult.rows) {
                const result = await db.query(
                    `INSERT INTO courier_notifications 
                     (order_id, notification_type, sent_to, sent_at) 
                     VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
                     RETURNING *`,
                    [orderId, 'delivery_available', driver.id]
                );
                notifications.push(result.rows[0]);
            }

            return notifications;
        } catch (error) {
            throw new Error(`Failed to notify couriers: ${error.message}`);
        }
    }

    /**
     * Mark notification as accepted by courier
     * @param {String} notificationId - Notification UUID
     * @param {String} courierId - Courier UUID
     * @returns {Promise<Object>} Updated notification
     */
    async acceptNotification(notificationId, courierId) {
        try {
            const result = await db.query(
                `UPDATE courier_notifications 
                 SET is_accepted = true, accepted_at = CURRENT_TIMESTAMP 
                 WHERE id = $1 AND sent_to = $2 
                 RETURNING *`,
                [notificationId, courierId]
            );

            if (result.rows.length === 0) {
                throw new Error('Notification not found or unauthorized');
            }

            return result.rows[0];
        } catch (error) {
            throw new Error(`Failed to accept notification: ${error.message}`);
        }
    }

    /**
     * Get available orders for a courier (not yet accepted)
     * @param {String} courierId - Courier UUID
     * @param {String} type - 'pickup_available' or 'delivery_available'
     * @returns {Promise<Array>} Array of available orders
     */
    async getAvailableOrders(courierId, type) {
        try {
            const result = await db.query(
                `SELECT DISTINCT o.*, 
                        u.full_name as customer_name, 
                        u.phone as customer_phone,
                        pl.address as pickup_address, 
                        pl.latitude as pickup_lat, 
                        pl.longitude as pickup_lng,
                        dl.address as delivery_address,
                        dl.latitude as delivery_lat,
                        dl.longitude as delivery_lng,
                        cn.id as notification_id,
                        cn.sent_at,
                        cn.is_accepted
                 FROM orders o
                 INNER JOIN courier_notifications cn ON cn.order_id = o.id
                 INNER JOIN users u ON u.id = o.customer_id
                 LEFT JOIN locations pl ON pl.id = o.pickup_location_id
                 LEFT JOIN locations dl ON dl.id = o.delivery_location_id
                 WHERE cn.sent_to = $1 
                   AND cn.notification_type = $2
                   AND cn.is_accepted = false
                   AND o.status != 'cancelled'
                 ORDER BY cn.sent_at DESC`,
                [courierId, type]
            );





            console.log(`[getAvailableOrders] Query: courierId=${courierId}, type=${type}`);
            console.log(`[getAvailableOrders] Found: ${result.rows.length} orders`);
            if (result.rows.length > 0) {
                console.log(`[getAvailableOrders] Sample:`, {
                    order_number: result.rows[0].order_number,
                    notification_id: result.rows[0].notification_id
                });
            }
            return result.rows;
        } catch (error) {
            console.error(`[getAvailableOrders] Error:`, error.message);
            throw new Error(`Failed to get available orders: ${error.message}`);
        }
    }

    /**
     * Mark all other notifications for the same order as read (not accepted)
     * Called when one courier accepts an order
     * @param {String} orderId - Order UUID
     * @param {String} acceptedByCourierId - Courier who accepted
     * @returns {Promise<void>}
     */
    async markOthersAsRead(orderId, acceptedByCourierId) {
        try {
            await db.query(
                `UPDATE courier_notifications 
                 SET read_at = CURRENT_TIMESTAMP 
                 WHERE order_id = $1 AND sent_to != $2 AND is_accepted = false`,
                [orderId, acceptedByCourierId]
            );
        } catch (error) {
            throw new Error(`Failed to mark notifications as read: ${error.message}`);
        }
    }
}

module.exports = new NotificationService();
