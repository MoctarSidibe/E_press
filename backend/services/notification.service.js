const db = require('../database/db');
const { Expo } = require('expo-server-sdk');

// Single Expo client. Safe to share — it manages its own HTTP queue.
const expo = new Expo();

class NotificationService {
    /**
     * Send an Expo push to a set of user IDs. Skips users without a valid token.
     * Failures are logged but never thrown — caller code must not depend on push
     * delivery for correctness (we always also write a DB notification record).
     *
     * @param {string[]} userIds    UUIDs of recipients
     * @param {string}   title      Notification title
     * @param {string}   body       Notification body
     * @param {object}   data       Arbitrary JSON delivered alongside the push
     * @returns {Promise<{sent: number, skipped: number, failed: number}>}
     */
    async sendPushToUsers(userIds, title, body, data = {}) {
        const stats = { sent: 0, skipped: 0, failed: 0 };
        if (!Array.isArray(userIds) || userIds.length === 0) return stats;

        try {
            const result = await db.query(
                `SELECT id, push_token FROM users
                 WHERE id = ANY($1::uuid[]) AND push_token IS NOT NULL`,
                [userIds]
            );

            const messages = [];
            const invalidTokenUserIds = [];
            for (const row of result.rows) {
                if (!Expo.isExpoPushToken(row.push_token)) {
                    invalidTokenUserIds.push(row.id);
                    stats.skipped++;
                    continue;
                }
                messages.push({
                    to: row.push_token,
                    sound: 'default',
                    title,
                    body,
                    data,
                });
            }

            // Drop tokens that look malformed so we don't keep retrying them.
            if (invalidTokenUserIds.length > 0) {
                await db.query(
                    `UPDATE users SET push_token = NULL WHERE id = ANY($1::uuid[])`,
                    [invalidTokenUserIds]
                ).catch(() => {});
            }

            if (messages.length === 0) return stats;

            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
                try {
                    const tickets = await expo.sendPushNotificationsAsync(chunk);
                    tickets.forEach(t => {
                        if (t.status === 'ok') stats.sent++;
                        else stats.failed++;
                    });
                } catch (err) {
                    console.error('[Push] chunk send failed:', err.message);
                    stats.failed += chunk.length;
                }
            }
        } catch (err) {
            console.error('[Push] sendPushToUsers error:', err.message);
        }
        return stats;
    }


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

            // Fan-out a remote push to every active driver so offline ones get notified
            // when the app reopens. Fire-and-forget — DB record above is the source of truth.
            this.sendPushToUsers(
                driversResult.rows.map(d => d.id),
                '📦 Nouvelle commande à collecter',
                "Une commande est disponible pour la collecte. Ouvrez l'app pour l'accepter.",
                { type: 'pickup_available', orderId }
            ).catch(() => {});

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

            this.sendPushToUsers(
                driversResult.rows.map(d => d.id),
                '🚚 Nouvelle livraison disponible',
                "Une commande est prête pour la livraison. Ouvrez l'app pour l'accepter.",
                { type: 'delivery_available', orderId }
            ).catch(() => {});

            return notifications;
        } catch (error) {
            throw new Error(`Failed to notify couriers: ${error.message}`);
        }
    }

    /**
     * Notify a customer that their order status changed. Sends a remote push so
     * the customer gets the update even with the app closed. Map status -> human
     * label is shared with the mobile NotificationController.
     */
    async notifyCustomerOrderStatus(customerId, orderId, orderNumber, status) {
        const labels = {
            picked_up:        'collectée par le livreur',
            in_facility:      'arrivée à la laverie',
            cleaning:         'en cours de nettoyage',
            ready:            'prête à être livrée',
            out_for_delivery: 'en route pour livraison',
            delivered:        'livrée',
            cancelled:        'annulée',
        };
        const label = labels[status] || status;
        return this.sendPushToUsers(
            [customerId],
            '🔔 Mise à jour de votre commande',
            `Votre commande ${orderNumber} est ${label}.`,
            { type: 'order_status', orderId, status }
        );
    }

    /**
     * Notify a user about a KYC decision (approved or rejected).
     */
    async notifyKycDecision(userId, approved, rejectionReason) {
        if (approved) {
            return this.sendPushToUsers(
                [userId],
                '✅ Vérification approuvée',
                "Votre identité a été vérifiée. Vous pouvez maintenant utiliser E-Press Pro.",
                { type: 'kyc_approved' }
            );
        }
        return this.sendPushToUsers(
            [userId],
            '❌ Documents refusés',
            rejectionReason
                ? `Motif : ${rejectionReason}. Resoumettez vos documents depuis l'app.`
                : "Vos documents n'ont pas pu être validés. Resoumettez-les depuis l'app.",
            { type: 'kyc_rejected' }
        );
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
            let query = '';

            // Query orders directly - simpler and more robust than relying on notifications
            if (type === 'pickup_available') {
                // Pending orders with no pickup driver
                query = `
                    SELECT DISTINCT o.*, 
                        u.full_name as customer_name, 
                        u.phone as customer_phone,
                        pl.address as pickup_address, 
                        pl.latitude as pickup_lat, 
                        pl.longitude as pickup_lng,
                        dl.address as delivery_address,
                        dl.latitude as delivery_lat,
                        dl.longitude as delivery_lng,
                        NULL as notification_id
                    FROM orders o
                    INNER JOIN users u ON u.id = o.customer_id
                    LEFT JOIN locations pl ON pl.id = o.pickup_location_id
                    LEFT JOIN locations dl ON dl.id = o.delivery_location_id
                    WHERE o.status = 'pending' 
                      AND o.pickup_driver_id IS NULL
                      AND o.status != 'cancelled'
                    ORDER BY o.created_at DESC
                `;
            } else if (type === 'delivery_available') {
                // Ready orders with no delivery driver
                query = `
                    SELECT DISTINCT o.*, 
                        u.full_name as customer_name, 
                        u.phone as customer_phone,
                        pl.address as pickup_address, 
                        pl.latitude as pickup_lat, 
                        pl.longitude as pickup_lng,
                        dl.address as delivery_address,
                        dl.latitude as delivery_lat,
                        dl.longitude as delivery_lng,
                        NULL as notification_id
                    FROM orders o
                    INNER JOIN users u ON u.id = o.customer_id
                    LEFT JOIN locations pl ON pl.id = o.pickup_location_id
                    LEFT JOIN locations dl ON dl.id = o.delivery_location_id
                    WHERE o.status = 'ready' 
                      AND o.delivery_driver_id IS NULL
                      AND o.status != 'cancelled'
                    ORDER BY o.updated_at DESC
                `;
            }

            if (!query) return [];

            const result = await db.query(query);

            console.log(`[getAvailableOrders] Querying ${type}`);
            console.log(`[getAvailableOrders] Found: ${result.rows.length} orders`);

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
