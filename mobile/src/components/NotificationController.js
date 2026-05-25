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

        // Permissions + (real) push-token register. Skipped in Expo Go.
        notificationService.registerForPushNotificationsAsync();

        // Open the Socket.IO connection for this session. Previously dead code
        // never called connect(), so socket-based notifications didn't work at
        // all. Now also properly torn down in the cleanup below.
        socketService.connect();

        const handleNewPickup = (data) => {
            if (user.role === 'driver') {
                notificationService.scheduleNotification(
                    'Nouvelle collecte disponible 📦',
                    `Commande #${data.order_number} prête à collecter${data.pickup_address ? ` (${data.pickup_address})` : ''}`
                );
            }
        };

        const handleNewDelivery = (data) => {
            if (user.role === 'driver') {
                notificationService.scheduleNotification(
                    'Nouvelle livraison disponible 🚚',
                    `Commande #${data.order_number} prête à livrer${data.customer_name ? ` à ${data.customer_name}` : ''}`
                );
            }
        };

        const handleStatusUpdate = (data) => {
            if (user.role === 'customer') {
                const labels = {
                    picked_up:        'collectée',
                    in_facility:      'arrivée à la laverie',
                    cleaning:         'en nettoyage',
                    ready:            'prête à la livraison',
                    out_for_delivery: 'en livraison',
                    delivered:        'livrée',
                };
                const label = labels[data.status] || data.status;
                notificationService.scheduleNotification(
                    'Mise à jour de commande 🔔',
                    `Votre commande #${String(data.orderId).substring(0, 8)}… est ${label}`
                );
            }
        };

        const handleOrderAccepted = (data) => {
            if (user.role === 'customer') {
                notificationService.scheduleNotification(
                    'Livreur attribué 👤',
                    `${data.courierName || 'Un livreur'} a accepté votre commande`
                );
            }
        };

        socketService.onNewPickupAvailable(handleNewPickup);
        socketService.onNewDeliveryAvailable(handleNewDelivery);
        socketService.onOrderStatusUpdated(handleStatusUpdate);
        socketService.onOrderAccepted(handleOrderAccepted);

        // Cleanup runs on logout AND on user-change. Without this, listeners
        // stacked up across re-renders and the socket stayed open after logout.
        return () => {
            socketService.removeAllListeners();
            socketService.disconnect();
        };
    }, [user]);

    return null; // No UI — logic only.
};

export default NotificationController;
