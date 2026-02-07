import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';
import notificationService from '../services/notification';

const NotificationController = () => {
    const { user } = useAuth();
    const { t } = useTranslation();

    useEffect(() => {
        if (!user) return;

        // request permissions on mount
        notificationService.registerForPushNotificationsAsync();

        const handleNewPickup = (data) => {
            if (user.role === 'driver') {
                notificationService.scheduleNotification(
                    'New Pickup Available 📦',
                    `Order #${data.order_number} is ready for pickup at ${data.pickup_address}`
                );
            }
        };

        const handleNewDelivery = (data) => {
            if (user.role === 'driver') {
                notificationService.scheduleNotification(
                    'New Delivery Available 🚚',
                    `Order #${data.order_number} is ready for delivery to ${data.customer_name}`
                );
            }
        };

        const handleStatusUpdate = (data) => {
            if (user.role === 'customer') {
                // Map status to friendly text
                let statusText = data.status;
                if (data.status === 'picked_up') statusText = 'picked up';
                if (data.status === 'in_facility') statusText = 'arrived at facility';
                if (data.status === 'cleaning') statusText = 'being cleaned';
                if (data.status === 'ready') statusText = 'ready for delivery';
                if (data.status === 'out_for_delivery') statusText = 'out for delivery';
                if (data.status === 'delivered') statusText = 'delivered';

                notificationService.scheduleNotification(
                    'Order Update 🔔',
                    `Your order #${data.orderId.substring(0, 8)}... is now ${statusText}`
                );
            }
        };

        const handleOrderAccepted = (data) => {
            if (user.role === 'customer') {
                notificationService.scheduleNotification(
                    'Driver Assigned 👤',
                    `${data.courierName} has accepted your order`
                );
            }
        };

        // Register listeners
        socketService.onNewPickupAvailable(handleNewPickup);
        socketService.onNewDeliveryAvailable(handleNewDelivery);
        socketService.onOrderStatusUpdated(handleStatusUpdate);
        socketService.onOrderAccepted(handleOrderAccepted);

        return () => {
            // Clean up is complex because socketService.off logic is simple and might remove other listeners
            // But for now, since this component is at App level, it unmounts only on logout/close
            // We can leave it active or rely on socketService implementation
        };
    }, [user]);

    return null; // This component handles logic only, no UI
};

export default NotificationController;
