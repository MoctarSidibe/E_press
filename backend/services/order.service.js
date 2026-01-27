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
            const tax = (subtotal + deliveryFee + expressFee) * 0.1;
            const total = subtotal + deliveryFee + expressFee + tax;

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
                    status,
                    order_comment, item_comment,
                    confirmed_item_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING *`,
                [
                    orderNumber, customerId,
                    orderData.pickupLocationId, orderData.deliveryLocationId,
                    orderData.pickupType || 'immediate', orderData.pickupScheduledAt,
                    orderData.isExpress || false, orderData.specialInstructions,
                    orderData.paymentMethod || 'cash',
                    subtotal, deliveryFee, expressFee, tax, total,
                    'pending',
                    orderData.orderComment || null,
                    orderData.itemComment || null,
                    orderData.items.length
                ]
            );

            const order = orderResult.rows[0];

            // 3.5 Generate and Update QR Code with real ID
            const qrDataString = qrService.generateQRData(order);
            const qrCodeData = await qrService.generateQRCode(qrDataString);

            await client.query(
                'UPDATE orders SET qr_code_data = $1 WHERE id = $2',
                [qrCodeData, order.id]
            );

            // Update local order object for return
            order.qr_code_data = qrCodeData;

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

            await client.query('COMMIT');

            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
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

        return result.rows[0];
    }

    // NEW: Update reception/delivery count
    async updateReceptionCount(orderId, itemCount, userId) {
        const result = await db.query(
            `UPDATE orders 
             SET updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 
             RETURNING *`,
            [orderId]
        );

        if (result.rows.length === 0) {
            throw new Error('Order not found');
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

        return updatedOrder;
    }

    // Assign driver (compatibility alias for assignPickupDriver)
    async assignDriver(orderId, driverId) {
        return await this.assignPickupDriver(orderId, driverId);
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
