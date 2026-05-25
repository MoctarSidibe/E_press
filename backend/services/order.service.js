const db = require('../database/db');
const qrService = require('./qr.service');
const notificationService = require('./notification.service');

class OrderService {
    // Create new order
    async createOrder(customerId, orderData) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Fetch prices and calculate subtotal first
            let subtotal = 0;
            const orderItems = [];

            for (const item of orderData.items) {
                const categoryResult = await client.query(
                    'SELECT id, name, base_price, express_price FROM clothing_categories WHERE id = $1',
                    [item.categoryId]
                );

                if (categoryResult.rows.length === 0) {
                    throw new Error(`Category not found: ${item.categoryId}`);
                }

                const category = categoryResult.rows[0];
                const pricePerItem = orderData.isExpress ? category.express_price : category.base_price;
                const itemSubtotal = parseFloat(pricePerItem) * item.quantity;

                subtotal += itemSubtotal;

                // Store for later insertion
                orderItems.push({
                    categoryId: item.categoryId,
                    quantity: item.quantity,
                    pricePerItem,
                    itemSubtotal,
                    notes: item.notes
                });
            }

            // 2. Calculate final totals
            const deliveryFee = 2.00;
            const expressFee = orderData.isExpress ? subtotal * 0.2 : 0;
            const tax = 0;
            let baseTotal = subtotal + deliveryFee + expressFee;

            // 2a. Apply coupon discount
            let couponId = null;
            let couponCode = null;
            let couponDiscount = 0;

            if (orderData.couponCode) {
                const couponResult = await client.query(
                    `SELECT * FROM coupons
                     WHERE UPPER(code) = UPPER($1)
                       AND is_active = true
                       AND (valid_from IS NULL OR valid_from <= NOW())
                       AND (valid_until IS NULL OR valid_until >= NOW())
                       AND (max_uses IS NULL OR uses_count < max_uses)`,
                    [orderData.couponCode.trim()]
                );

                if (couponResult.rows.length > 0) {
                    const coupon = couponResult.rows[0];
                    if (baseTotal >= coupon.min_order_amount) {
                        if (coupon.discount_type === 'percent') {
                            couponDiscount = (baseTotal * coupon.discount_value) / 100;
                            if (coupon.max_discount_amount) {
                                couponDiscount = Math.min(couponDiscount, coupon.max_discount_amount);
                            }
                        } else {
                            couponDiscount = Math.min(coupon.discount_value, baseTotal);
                        }
                        couponId = coupon.id;
                        couponCode = coupon.code;
                        // Increment usage count
                        await client.query('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = $1', [coupon.id]);
                    }
                }
            }

            // 2b. Apply points redemption
            let pointsRedeemed = 0;
            let pointsDiscount = 0;

            if (orderData.pointsToRedeem && orderData.pointsToRedeem > 0) {
                const configResult = await client.query('SELECT * FROM points_config WHERE is_active = true LIMIT 1');
                const cfg = configResult.rows[0] || { points_value_fcfa: 5, min_redemption_points: 100, max_redemption_percent: 50 };

                const userResult = await client.query('SELECT points_balance FROM users WHERE id = $1', [customerId]);
                const userPoints = userResult.rows[0]?.points_balance || 0;

                const toRedeem = Math.min(orderData.pointsToRedeem, userPoints);
                if (toRedeem >= cfg.min_redemption_points) {
                    const maxDiscount = (baseTotal - couponDiscount) * (cfg.max_redemption_percent / 100);
                    pointsDiscount = Math.min(toRedeem * cfg.points_value_fcfa, maxDiscount);
                    pointsRedeemed = Math.ceil(pointsDiscount / cfg.points_value_fcfa);
                }
            }

            const total = Math.max(0, baseTotal - couponDiscount - pointsDiscount);

            // Generate order number
            const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

            // 3. Insert order (initially without QR data)
            const orderResult = await client.query(
                `INSERT INTO orders (
                    order_number, customer_id,
                    pickup_location_id, delivery_location_id,
                    pickup_type, pickup_scheduled_at,
                    is_express, special_instructions,
                    payment_method,
                    subtotal, delivery_fee, express_fee, tax, total,
                    coupon_id, coupon_code, coupon_discount,
                    points_redeemed, points_discount,
                    status,
                    order_comment, item_comment,
                    confirmed_item_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                RETURNING *`,
                [
                    orderNumber, customerId,
                    orderData.pickupLocationId, orderData.deliveryLocationId,
                    orderData.pickupType || 'immediate', orderData.pickupScheduledAt,
                    orderData.isExpress || false, orderData.specialInstructions,
                    orderData.paymentMethod || 'cash',
                    subtotal, deliveryFee, expressFee, tax, total,
                    couponId, couponCode, couponDiscount,
                    pointsRedeemed, pointsDiscount,
                    'pending',
                    orderData.orderComment || null,
                    orderData.itemComment || null,
                    orderData.items.length
                ]
            );

            // Deduct redeemed points from user balance
            if (pointsRedeemed > 0) {
                const newBalance = await client.query(
                    'UPDATE users SET points_balance = points_balance - $1 WHERE id = $2 RETURNING points_balance',
                    [pointsRedeemed, customerId]
                );
                await client.query(
                    `INSERT INTO points_transactions (user_id, order_id, type, points, balance_after, description)
                     VALUES ($1, $2, 'redeemed', $3, $4, $5)`,
                    [customerId, orderResult.rows[0].id, -pointsRedeemed, newBalance.rows[0].points_balance, `Points redeemed for order ${orderNumber}`]
                );
            }

            const order = orderResult.rows[0];

            // 3.5 Generate and Update QR Code with real ID
            const qrDataString = qrService.generateQRData(order);
            const qrCodeData = await qrService.generateQRImage(qrDataString);

            await client.query(
                'UPDATE orders SET qr_code_data = $1 WHERE id = $2',
                [qrCodeData, order.id]
            );

            // Update local order object for return
            order.qr_code_data = qrCodeData;

            // 3.6 Ghost Laverie — assign nearest laverie based on pickup coordinates
            try {
                // Get pickup lat/lng from the linked location
                const locResult = await client.query(
                    'SELECT latitude, longitude FROM locations WHERE id = $1',
                    [orderData.pickupLocationId]
                );
                if (locResult.rows.length > 0) {
                    const { latitude, longitude } = locResult.rows[0];
                    const nearestLaverie = await this.assignNearestLaverie(latitude, longitude, client);
                    if (nearestLaverie) {
                        await client.query(
                            `UPDATE orders
                             SET assigned_laverie_id  = $1,
                                 pickup_lat            = $2,
                                 pickup_lng            = $3,
                                 laverie_distance_km   = $4
                             WHERE id = $5`,
                            [nearestLaverie.id, latitude, longitude, nearestLaverie.distance_km, order.id]
                        );
                        order.assigned_laverie_id  = nearestLaverie.id;
                        order.laverie_distance_km  = nearestLaverie.distance_km;
                        console.log(`[Ghost Laverie] Order ${orderNumber} → ${nearestLaverie.name} (${nearestLaverie.distance_km.toFixed(2)} km)`);
                    }
                }
            } catch (laverieErr) {
                // Non-fatal: order continues without laverie assignment
                console.warn('[Ghost Laverie] Assignment failed (non-fatal):', laverieErr.message);
            }

            // 4. Insert order items
            for (const item of orderItems) {
                await client.query(
                    `INSERT INTO order_items (order_id, category_id, quantity, price_per_item, subtotal, notes)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [order.id, item.categoryId, item.quantity, item.pricePerItem, item.itemSubtotal, item.notes || null]
                );
            }

            // Add initial status history
            await client.query(
                `INSERT INTO order_status_history (order_id, status, changed_by, notes)
                 VALUES ($1, $2, $3, $4)`,
                [order.id, 'pending', customerId, 'Order created']
            );

            await client.query('COMMIT');

            // Notify couriers (async, don't wait for it)
            // Determine if we should notify for pickup or delivery based on order status/type
            // For new orders, it's typically for pickup
            try {
                if (order.pickup_type === 'immediate') {
                    notificationService.notifyAvailablePickupCouriers(order.id).catch(err =>
                        console.error('Failed to notify couriers:', err)
                    );
                }
            } catch (notifyError) {
                console.error('Notification initiation error:', notifyError);
            }

            // Get complete order with items
            return await this.getOrderById(order.id);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Order creation error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Get orders by customer
    async getOrdersByCustomer(customerId, status = null) {
        let query = `
            SELECT o.*,
                   pl.address as pickup_address,
                   dl.address as delivery_address
            FROM orders o
            LEFT JOIN locations pl ON o.pickup_location_id = pl.id
            LEFT JOIN locations dl ON o.delivery_location_id = dl.id
            WHERE o.customer_id = $1
        `;

        const params = [customerId];

        if (status) {
            query += ' AND o.status = $2';
            params.push(status);
        }

        query += ' ORDER BY o.created_at DESC';

        const result = await db.query(query, params);

        // Get items for each order
        for (const order of result.rows) {
            const itemsResult = await db.query(
                `SELECT oi.*, cc.name as category_name
                 FROM order_items oi
                 JOIN clothing_categories cc ON oi.category_id = cc.id
                 WHERE oi.order_id = $1`,
                [order.id]
            );
            order.items = itemsResult.rows;
        }

        return result.rows;
    }

    // Get order by ID with complete details
    async getOrderById(orderId) {
        try {
            // Get order with customer and driver info
            const orderResult = await db.query(
                `SELECT o.*, 
                        c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
                        pd.full_name as pickup_driver_name,
                        dd.full_name as delivery_driver_name,
                        pl.address as pickup_address, pl.latitude as pickup_lat, pl.longitude as pickup_lng,
                        dl.address as delivery_address, dl.latitude as delivery_lat, dl.longitude as delivery_lng
                 FROM orders o
                 LEFT JOIN users c ON o.customer_id = c.id
                 LEFT JOIN users pd ON o.pickup_driver_id = pd.id
                 LEFT JOIN users dd ON o.delivery_driver_id = dd.id
                 LEFT JOIN locations pl ON o.pickup_location_id = pl.id
                 LEFT JOIN locations dl ON o.delivery_location_id = dl.id
                 WHERE o.id = $1`,
                [orderId]
            );

            if (orderResult.rows.length === 0) {
                throw new Error('Order not found');
            }

            const order = orderResult.rows[0];

            // Get order items
            const itemsResult = await db.query(
                `SELECT oi.*, cc.name as category_name, cc.icon_name
                 FROM order_items oi
                 JOIN clothing_categories cc ON oi.category_id = cc.id
                 WHERE oi.order_id = $1`,
                [orderId]
            );

            // Get status history
            const historyResult = await db.query(
                `SELECT osh.*, u.full_name as changed_by_name
                 FROM order_status_history osh
                 LEFT JOIN users u ON osh.changed_by = u.id
                 WHERE osh.order_id = $1
                 ORDER BY osh.created_at DESC`,
                [orderId]
            );

            // Get photos
            const photosResult = await db.query(
                `SELECT * FROM order_photos WHERE order_id = $1 ORDER BY uploaded_at DESC`,
                [orderId]
            );

            // Get signatures
            const signaturesResult = await db.query(
                `SELECT * FROM order_signatures WHERE order_id = $1 ORDER BY signed_at DESC`,
                [orderId]
            );

            return {
                ...order,
                items: itemsResult.rows,
                statusHistory: historyResult.rows,
                photos: photosResult.rows,
                signatures: signaturesResult.rows
            };
        } catch (error) {
            throw error;
        }
    }

    // Update order status
    async updateOrderStatus(orderId, status, userId, notes = null) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Update order status
            const result = await client.query(
                `UPDATE orders 
                 SET status = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2 
                 RETURNING *`,
                [status, orderId]
            );

            if (result.rows.length === 0) {
                throw new Error('Order not found');
            }

            // Add to status history
            await client.query(
                `INSERT INTO order_status_history (order_id, status, changed_by, notes)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, status, userId, notes || `Status changed to ${status}`]
            );

            // Award points when order is delivered
            if (status === 'delivered') {
                const order = result.rows[0];
                await this._awardPointsForOrder(client, order);
            }

            await client.query('COMMIT');

            // Emit socket event (online clients hear immediately)
            if (global.emitOrderStatusUpdate) {
                global.emitOrderStatusUpdate(orderId, status);
            }

            // Fire a remote push to the customer so offline / backgrounded apps
            // still surface the update. Fire-and-forget — the DB commit above is
            // the source of truth, push is an enhancement.
            const order = result.rows[0];
            if (order.customer_id) {
                notificationService.notifyCustomerOrderStatus(
                    order.customer_id, order.id, order.order_number, status
                ).catch(() => {});
            }

            return order;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Award loyalty points after delivery
    async _awardPointsForOrder(client, order) {
        if (!order.customer_id) return;

        try {
            const configResult = await client.query('SELECT * FROM points_config WHERE is_active = true LIMIT 1');
            const cfg = configResult.rows[0];
            if (!cfg) return;

            // Points based on amount paid (after discounts)
            const amountPaid = parseFloat(order.total) || 0;
            const pointsEarned = Math.floor((amountPaid / 1000) * cfg.points_per_1000_fcfa);
            if (pointsEarned <= 0) return;

            const newBalance = await client.query(
                `UPDATE users
                 SET points_balance = points_balance + $1,
                     points_earned_total = points_earned_total + $1
                 WHERE id = $2
                 RETURNING points_balance`,
                [pointsEarned, order.customer_id]
            );

            await client.query(
                `UPDATE orders SET points_earned = $1 WHERE id = $2`,
                [pointsEarned, order.id]
            );

            await client.query(
                `INSERT INTO points_transactions (user_id, order_id, type, points, balance_after, description)
                 VALUES ($1, $2, 'earned', $3, $4, $5)`,
                [order.customer_id, order.id, pointsEarned, newBalance.rows[0].points_balance,
                 `Points earned for order ${order.order_number}`]
            );

            console.log(`[Points] Awarded ${pointsEarned} points to user ${order.customer_id} for order ${order.order_number}`);
        } catch (err) {
            console.error('[Points] Award error (non-fatal):', err.message);
        }
    }

    // Get all orders (admin)
    async getAllOrders(filters = {}) {
        let query = `
            SELECT o.*, 
                   c.full_name as customer_name,
                   d.full_name as driver_name
            FROM orders o
            LEFT JOIN users c ON o.customer_id = c.id
            LEFT JOIN users d ON o.driver_id = d.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        if (filters.status) {
            query += ` AND o.status = $${paramCount}`;
            params.push(filters.status);
            paramCount++;
        }

        if (filters.customerId) {
            query += ` AND o.customer_id = $${paramCount}`;
            params.push(filters.customerId);
            paramCount++;
        }

        if (filters.driverId) {
            query += ` AND o.driver_id = $${paramCount}`;
            params.push(filters.driverId);
            paramCount++;
        }

        query += ' ORDER BY o.created_at DESC';

        const result = await db.query(query, params);
        return result.rows;
    }

    // NEW: Update pickup item count
    async updatePickupCount(orderId, itemCount, courierId) {
        const result = await db.query(
            `UPDATE orders 
             SET pickup_item_count = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING *`,
            [itemCount, orderId]
        );

        if (result.rows.length === 0) {
            throw new Error('Order not found');
        }

        // Emit update
        if (global.emitOrderStatusUpdate) {
            // Just emit status update to refresh order details
            // We don't have new status here (it's mostly 'picked_up' handled separately)
            // But confirming items usually happens with status change.
            // If called alone, let's emit generic update
            global.emitOrderStatusUpdate(orderId, result.rows[0].status);
        }

        return result.rows[0];
    }

    // NEW: Update reception/delivery count
    async updateReceptionCount(orderId, itemCount, userId) {
        const result = await db.query(
            `UPDATE orders 
             SET reception_item_count = $1,
                 reception_cleaner_id = $2,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3 
             RETURNING *`,
            [itemCount, userId, orderId]
        );

        if (result.rows.length === 0) {
            throw new Error('Order not found');
        }

        // Emit update
        if (global.emitOrderStatusUpdate) {
            global.emitOrderStatusUpdate(orderId, result.rows[0].status);
        }

        return result.rows[0];
    }

    // NEW: Update delivery item count
    async updateDeliveryCount(orderId, itemCount, userId) {
        const result = await db.query(
            `UPDATE orders 
             SET delivery_item_count = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING *`,
            [itemCount, orderId]
        );

        if (result.rows.length === 0) {
            throw new Error('Order not found');
        }

        // Emit update
        if (global.emitOrderStatusUpdate) {
            global.emitOrderStatusUpdate(orderId, result.rows[0].status);
        }

        return result.rows[0];
    }

    // NEW: Save signature
    async saveSignature(orderId, signatureType, signatureData, signedBy) {
        const result = await db.query(
            `INSERT INTO order_signatures (order_id, signature_type, signature_data, signed_by) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [orderId, signatureType, signatureData, signedBy]
        );

        return result.rows[0];
    }

    // NEW: Save photo
    async savePhoto(orderId, photoType, photoUrl, uploadedBy, notes = null) {
        const result = await db.query(
            `INSERT INTO order_photos (order_id, photo_type, photo_url, uploaded_by, notes) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [orderId, photoType, photoUrl, uploadedBy, notes]
        );

        return result.rows[0];
    }

    // NEW: Assign pickup driver
    async assignPickupDriver(orderId, driverId) {
        const result = await db.query(
            `UPDATE orders 
             SET pickup_driver_id = $1, status = 'assigned', updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING *`,
            [driverId, orderId]
        );

        if (result.rows.length === 0) {
            throw new Error('Order not found');
        }

        // Add to history
        await db.query(
            `INSERT INTO order_status_history (order_id, status, changed_by, notes) 
             VALUES ($1, 'assigned', $2, $3)`,
            [orderId, driverId, 'Pickup driver assigned']
        );

        // Emit socket event
        if (global.emitOrderStatusUpdate) {
            global.emitOrderStatusUpdate(orderId, 'assigned');
        }

        return result.rows[0];
    }

    // NEW: Assign delivery driver
    async assignDeliveryDriver(orderId, driverId) {
        const result = await db.query(
            `UPDATE orders 
             SET delivery_driver_id = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING *`,
            [driverId, orderId]
        );

        if (result.rows.length === 0) {
            throw new Error('Order not found');
        }

        // Add to history
        await db.query(
            `INSERT INTO order_status_history (order_id, status, changed_by, notes) 
             VALUES ($1, $2, $3, $4)`,
            [orderId, 'out_for_delivery', driverId, 'Delivery driver assigned']
        );

        // Update status to out_for_delivery
        const updatedOrder = await this.updateOrderStatus(orderId, 'out_for_delivery', driverId);

        // updateOrderStatus already emits event, so we are good here.

        return updatedOrder;
    }

    // Assign driver (compatibility alias for assignPickupDriver)
    async assignDriver(orderId, driverId) {
        return await this.assignPickupDriver(orderId, driverId);
    }

    // ─── Ghost Laverie: Haversine distance (km) ──────────────────────────────
    _haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const toRad = (d) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Find nearest active laverie to a pickup point.
    // Returns { id, name, distance_km } or null if none found.
    async assignNearestLaverie(pickupLat, pickupLng, dbClient = null) {
        const query = dbClient ? dbClient.query.bind(dbClient) : db.query.bind(db);

        if (!pickupLat || !pickupLng) return null;

        const result = await query(
            `SELECT id, name, lat, lng, radius_km, max_concurrent_orders
             FROM laveries
             WHERE active = true
             ORDER BY id`
        );

        if (result.rows.length === 0) return null;

        let nearest = null;
        let minDist = Infinity;

        for (const lav of result.rows) {
            const dist = this._haversineKm(
                parseFloat(pickupLat),
                parseFloat(pickupLng),
                parseFloat(lav.lat),
                parseFloat(lav.lng)
            );
            // Only consider laveries within their service radius
            if (dist <= parseFloat(lav.radius_km) && dist < minDist) {
                // Check concurrent order capacity
                const countRes = await query(
                    `SELECT COUNT(*) AS cnt
                     FROM orders
                     WHERE assigned_laverie_id = $1
                       AND status NOT IN ('delivered', 'cancelled')`,
                    [lav.id]
                );
                const current = parseInt(countRes.rows[0].cnt, 10);
                if (current < lav.max_concurrent_orders) {
                    minDist = dist;
                    nearest = { id: lav.id, name: lav.name, distance_km: dist };
                }
            }
        }

        // Fallback: if no laverie is within radius, return the absolutely closest one
        if (!nearest) {
            for (const lav of result.rows) {
                const dist = this._haversineKm(
                    parseFloat(pickupLat),
                    parseFloat(pickupLng),
                    parseFloat(lav.lat),
                    parseFloat(lav.lng)
                );
                if (dist < minDist) {
                    minDist = dist;
                    nearest = { id: lav.id, name: lav.name, distance_km: dist };
                }
            }
        }

        return nearest;
    }

    // NEW: Get order photos
    async getOrderPhotos(orderId) {
        const result = await db.query(
            `SELECT * FROM order_photos WHERE order_id = $1 ORDER BY uploaded_at DESC`,
            [orderId]
        );

        return result.rows;
    }

    // NEW: Get order signatures
    async getOrderSignatures(orderId) {
        const result = await db.query(
            `SELECT * FROM order_signatures WHERE order_id = $1 ORDER BY signed_at DESC`,
            [orderId]
        );

        return result.rows;
    }
    // NEW: Cancel order (only if pending)
    async cancelOrder(orderId, userId) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Check current status
            const orderResult = await client.query('SELECT status FROM orders WHERE id = $1', [orderId]);
            if (orderResult.rows.length === 0) {
                throw new Error('Order not found');
            }

            const currentStatus = orderResult.rows[0].status;
            if (currentStatus !== 'pending') {
                throw new Error('Only pending orders can be cancelled');
            }

            // Update status
            const result = await client.query(
                `UPDATE orders 
                 SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1 
                 RETURNING *`,
                [orderId]
            );

            // Add to history
            await client.query(
                `INSERT INTO order_status_history (order_id, status, changed_by, notes) 
                 VALUES ($1, 'cancelled', $2, 'Order cancelled by customer')`,
                [orderId, userId]
            );

            await client.query('COMMIT');

            // Emit socket event
            if (global.emitOrderDeleted) {
                global.emitOrderDeleted(orderId);
            }

            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // NEW: Admin Delete Order (Soft Delete)
    async deleteOrder(orderId, userId) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Update status to cancelled (Soft delete)
            const result = await client.query(
                `UPDATE orders 
                 SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1 
                 RETURNING *`,
                [orderId]
            );

            if (result.rows.length === 0) {
                throw new Error('Order not found');
            }

            // Add to history
            await client.query(
                `INSERT INTO order_status_history (order_id, status, changed_by, notes) 
                 VALUES ($1, 'cancelled', $2, 'Order deleted by admin')`,
                [orderId, userId]
            );

            await client.query('COMMIT');

            // Emit socket event
            if (global.emitOrderDeleted) {
                global.emitOrderDeleted(orderId);
            }

            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new OrderService();
