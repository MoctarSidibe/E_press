import * as Location from 'expo-location';
import { driverAPI } from './api';

class LocationTrackingService {
    constructor() {
        this.isTracking = false;
        this.locationSubscription = null;
        this.intervalId = null;
    }

    /**
     * Request location permissions
     */
    async requestPermissions() {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

        if (foregroundStatus !== 'granted') {
            throw new Error('Location permission denied');
        }

        // Request background permission (Android 10+)
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

        return {
            foreground: foregroundStatus === 'granted',
            background: backgroundStatus === 'granted'
        };
    }

    /**
     * Start tracking driver location
     */
    async startTracking() {
        try {
            // Request permissions first
            const permissions = await this.requestPermissions();

            if (!permissions.foreground) {
                console.error('Foreground location permission not granted');
                return false;
            }

            this.isTracking = true;
            console.log('📍 Location tracking started');

            // Watch location changes
            this.locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 30000, // Update every 30 seconds
                    distanceInterval: 50 // Or when moved 50 meters
                },
                async (location) => {
                    await this.updateLocation(location);
                }
            );

            return true;
        } catch (error) {
            console.error('Failed to start location tracking:', error);
            return false;
        }
    }

    /**
     * Stop tracking
     */
    stopTracking() {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isTracking = false;
        console.log('📍 Location tracking stopped');
    }

    /**
     * Update location on backend
     */
    async updateLocation(location) {
        try {
            const { latitude, longitude, altitude, accuracy, heading, speed } = location.coords;

            await driverAPI.updateLocation({
                latitude,
                longitude,
                altitude,
                accuracy,
                heading,
                speed,
                timestamp: location.timestamp
            });

            console.log('📍 Location updated:', { latitude, longitude });
        } catch (error) {
            console.error('Failed to update location:', error);
        }
    }

    /**
     * Get current location once
     */
    async getCurrentLocation() {
        try {
            const permissions = await this.requestPermissions();

            if (!permissions.foreground) {
                throw new Error('Location permission not granted');
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });

            return location;
        } catch (error) {
            console.error('Failed to get current location:', error);
            throw error;
        }
    }

    /**
     * Check if tracking is active
     */
    getIsTracking() {
        return this.isTracking;
    }
}

export default new LocationTrackingService();
