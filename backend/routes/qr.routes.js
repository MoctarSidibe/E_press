const express = require('express');
const router = express.Router();
const qrService = require('../services/qr.service');
const notificationService = require('../services/notification.service');
const orderService = require('../services/order.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Validate QR code
router.post('/validate', authMiddleware, async (req, res) => {
    try {
        const { qr_data } = req.body;

        const validatedData = qrService.validateQRData(qr_data);

        // Get order details
        const order = await orderService.getOrderById(validatedData.orderId);

        res.json({
            valid: true,
            order
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Scan order at checkpoint
router.post('/scan/:orderId', authMiddleware, async (req, res) => {
    try {
        const { orderId } = req.params;
        const {
            checkpoint,      // 'picked_up', 'received', 'ready', 'delivered'
            item_count,
            latitude,
            longitude,
            signature_data,
            photos = []
        } = req.body;

        const userId = req.user.id;

        // Update order based on checkpoint
        let newStatus = checkpoint;
        let notes = '';

        switch (checkpoint) {
            case 'picked_up':
                // Update pickup count
                await orderService.updatePickupCount(orderId, item_count, userId);
                newStatus = 'picked_up';
                break;
            case 'received':
                // Reception at cleaning center
                await orderService.updateReceptionCount(orderId, item_count, userId);
                newStatus = 'in_facility';
                break;
            case 'ready':
                newStatus = 'ready';
                // Notify couriers for delivery
                await notificationService.notifyAvailableDeliveryCouriers(orderId);
                break;
            case 'delivered':
                await orderService.updateDeliveryCount(orderId, item_count, userId);
                newStatus = 'delivered';
                break;
        }

        // Helper to map checkpoint to DB allowed types
        let dbType = null;
        if (checkpoint === 'picked_up') dbType = 'pickup';
        else if (checkpoint === 'delivered') dbType = 'delivery';

        // Update order status
        const updatedOrder = await orderService.updateOrderStatus(orderId, newStatus, userId, notes);

        // Save signature if provided
        if (signature_data && dbType) {
            await orderService.saveSignature(orderId, dbType, signature_data, req.user.full_name || req.user.email);
        }

        // Save photos if provided
        if (photos && photos.length > 0 && dbType) {
            for (const photo of photos) {
                await orderService.savePhoto(orderId, dbType, photo, userId);
            }
        } else if (photos && photos.length > 0 && checkpoint === 'issue') {
            // Allow issue photos
            for (const photo of photos) {
                await orderService.savePhoto(orderId, 'issue', photo, userId);
            }
        }

        res.json({
            success: true,
            order: updatedOrder,
            message: `Order scanned at ${checkpoint}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available orders for courier
router.get('/courier/available', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({ error: 'Access denied. Drivers only.' });
        }

        const { type } = req.query; // 'pickup_available' or 'delivery_available'

        const availableOrders = await notificationService.getAvailableOrders(
            req.user.id,
            type || 'pickup_available'
        );

        res.json(availableOrders);
    } catch (error) {
        // Log error to file for debugging
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../server_errors.log');
        const logMessage = `${new Date().toISOString()} - ERROR in /courier/available: ${error.message}\n${error.stack}\n\n`;
        fs.appendFileSync(logPath, logMessage);

        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Accept order (courier)
router.post('/courier/accept/:orderId', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({ error: 'Access denied. Drivers only.' });
        }

        const { orderId } = req.params;
        const { notification_id, type } = req.body; // type: 'pickup' or 'delivery'

        // Accept the notification
        await notificationService.acceptNotification(notification_id, req.user.id);

        // Assign courier to order
        if (type === 'pickup') {
            await orderService.assignPickupDriver(orderId, req.user.id);
        } else {
            await orderService.assignDeliveryDriver(orderId, req.user.id);
        }

        // Mark other notifications as read
        await notificationService.markOthersAsRead(orderId, req.user.id);

        const order = await orderService.getOrderById(orderId);

        res.json({
            success: true,
            order,
            message: 'Order accepted successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
