import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production server URL (matching the API configuration)
const DEFAULT_SOCKET_URL = 'http://161.97.66.69';
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL
    || process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')
    || DEFAULT_SOCKET_URL;

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    /**
     * Initialize Socket.IO connection
     */
    async connect() {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const user = JSON.parse(await AsyncStorage.getItem('user'));

            // Connect to backend Socket.IO server
            console.log(`[Socket.IO] Connecting to ${SOCKET_URL}`);
            this.socket = io(SOCKET_URL, {
                transports: ['websocket'],
                auth: {
                    token
                }
            });

            this.socket.on('connect', () => {
                console.log('✅ Socket.IO connected:', this.socket.id);
                this.connected = true;

                // Join role-specific room
                if (user && user.role) {
                    this.socket.emit('join:role', user.role);
                }
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Socket.IO disconnected');
                this.connected = false;
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });

        } catch (error) {
            console.error('Failed to connect socket:', error);
        }
    }

    /**
     * Disconnect socket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    /**
     * Join order room for real-time updates
     */
    joinOrder(orderId) {
        if (this.socket && this.connected) {
            this.socket.emit('join:order', orderId);
        }
    }

    /**
     * Listen for new pickup orders (couriers only)
     */
    onNewPickupAvailable(callback) {
        if (this.socket) {
            this.socket.on('order:new_pickup_available', callback);
        }
    }

    /**
     * Listen for new delivery orders (couriers only)
     */
    onNewDeliveryAvailable(callback) {
        if (this.socket) {
            this.socket.on('order:new_delivery_available', callback);
        }
    }

    /**
     * Listen for order accepted events
     */
    onOrderAccepted(callback) {
        if (this.socket) {
            this.socket.on('order:accepted', callback);
        }
    }

    /**
     * Listen for order status updates
     */
    onOrderStatusUpdated(callback) {
        if (this.socket) {
            this.socket.on('order:status_updated', callback);
        }
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        if (this.socket) {
            this.socket.removeAllListeners();
        }
    }

    /**
     * Generic on listener
     */
    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    /**
     * Generic off listener
     */
    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }

    /**
     * Check if socket is connected
     */
    isConnected() {
        return this.connected && this.socket !== null;
    }
}

export default new SocketService();
