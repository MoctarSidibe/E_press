import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from './api';

// Expo Go (SDK 53+) dropped Android remote-push support. getExpoPushTokenAsync()
// either throws or returns a degraded token that the server rejects. Detect Expo
// Go and skip the whole token flow so we don't pollute the dev console with
// errors. Real pushes work in dev clients and production builds.
const IS_EXPO_GO = Constants.appOwnership === 'expo'
    || Constants.executionEnvironment === 'storeClient';

// Configure how notifications behave when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

class NotificationService {
    constructor() {
        this.token = null;
    }

    /**
     * Request permission, fetch the Expo push token, and POST it to the backend
     * so the server can deliver remote pushes (order updates, KYC decisions).
     * Safe to call multiple times — backend upserts by user.
     */
    async registerForPushNotificationsAsync() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (!Device.isDevice) {
            console.log('[Push] simulator — skipping push token registration');
            return null;
        }

        if (IS_EXPO_GO) {
            // Expo Go can't deliver remote pushes since SDK 53. Local notifications
            // still work fine. Build a dev client (eas build --profile development)
            // to test remote push end-to-end.
            console.log('[Push] Expo Go detected — remote push disabled, local notifications still work');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('[Push] permission denied');
            return null;
        }

        try {
            // projectId is required by the new Expo push API. It lives in app config
            // under extra.eas.projectId (set in app.config.js).
            const projectId =
                Constants.expoConfig?.extra?.eas?.projectId ||
                Constants.easConfig?.projectId;

            const tokenResponse = await Notifications.getExpoPushTokenAsync(
                projectId ? { projectId } : undefined
            );
            const token = tokenResponse.data;
            this.token = token;

            // Persist on the backend. Auth interceptor in api.js attaches the JWT.
            try {
                await api.post('/users/push-token', { token, platform: Platform.OS });
                console.log('[Push] token registered with backend');
            } catch (err) {
                // Non-fatal — local notifications still work. Server will rely on
                // socket events for online users in the meantime.
                console.warn('[Push] backend register failed:', err.message);
            }
            return token;
        } catch (error) {
            console.log('[Push] error getting token:', error.message);
            return null;
        }
    }

    /**
     * Tell the backend to forget this device's token. Called from AuthContext
     * during logout so the next user on this phone doesn't inherit pushes.
     */
    async unregisterFromBackend() {
        try {
            await api.delete('/users/push-token');
        } catch (err) {
            // Best-effort — common to fail on no-network logout.
            console.warn('[Push] backend unregister failed:', err.message);
        }
        this.token = null;
    }

    // Schedule a local notification
    async scheduleNotification(title, body, data = {}) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
            },
            trigger: null, // null means show immediately
        });
    }

    // Send a local notification (alias for schedule with null trigger)
    async sendLocalNotification(title, body, data = {}) {
        return this.scheduleNotification(title, body, data);
    }
}

export default new NotificationService();
