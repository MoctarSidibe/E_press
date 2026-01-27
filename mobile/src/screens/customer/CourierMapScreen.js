import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import socketService from '../../services/socket';
import theme from '../../theme/theme';

const CourierMapScreen = ({ navigation }) => {
    const mapRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [availableCouriers, setAvailableCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followUser, setFollowUser] = useState(true);

    useEffect(() => {
        requestLocationPermission();
        setupSocketListeners();

        return () => {
            socketService.removeAllListeners();
        };
    }, []);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Location permission is required to show nearby couriers');
                setLoading(false);
                return;
            }

            // Get current location
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            setLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            });

            setLoading(false);

            // Watch location updates
            Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 10000, // Update every 10 seconds
                    distanceInterval: 50, // Or when moved 50 meters
                },
                (newLocation) => {
                    const newCoords = {
                        latitude: newLocation.coords.latitude,
                        longitude: newLocation.coords.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    };

                    setLocation(newCoords);

                    if (followUser && mapRef.current) {
                        mapRef.current.animateToRegion(newCoords, 1000);
                    }
                }
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to get location');
            setLoading(false);
        }
    };

    const setupSocketListeners = () => {
        // Listen for courier location updates
        // This would need backend to broadcast courier locations
        // For now, we'll simulate it

        // In production, backend would emit:
        // io.emit('couriers:locations', [...courierLocations])

        // Mock data for demo
        setTimeout(() => {
            setAvailableCouriers([
                {
                    id: '1',
                    name: 'John Doe',
                    latitude: location?.latitude + 0.005 || 0,
                    longitude: location?.longitude + 0.003 || 0,
                    isAvailable: true,
                    currentOrders: 2,
                },
                {
                    id: '2',
                    name: 'Jane Smith',
                    latitude: location?.latitude - 0.007 || 0,
                    longitude: location?.longitude + 0.005 || 0,
                    isAvailable: true,
                    currentOrders: 1,
                }
            ]);
        }, 2000);
    };

    const centerOnUser = () => {
        if (location && mapRef.current) {
            mapRef.current.animateToRegion(location, 1000);
            setFollowUser(true);
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    if (loading || !location) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Finding nearby couriers...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={location}
                showsUserLocation
                showsMyLocationButton={false}
                onRegionChangeComplete={() => setFollowUser(false)}
            >
                {/* Service radius circle */}
                <Circle
                    center={{
                        latitude: location.latitude,
                        longitude: location.longitude
                    }}
                    radius={2000} // 2km radius
                    fillColor="rgba(30, 136, 229, 0.1)"
                    strokeColor="rgba(30, 136, 229, 0.5)"
                    strokeWidth={2}
                />

                {/* Available couriers */}
                {availableCouriers.map((courier) => {
                    const distance = calculateDistance(
                        location.latitude,
                        location.longitude,
                        courier.latitude,
                        courier.longitude
                    );

                    return (
                        <Marker
                            key={courier.id}
                            coordinate={{
                                latitude: courier.latitude,
                                longitude: courier.longitude
                            }}
                            title={courier.name}
                            description={`${distance.toFixed(1)} km away • ${courier.currentOrders} active orders`}
                        >
                            <View style={styles.courierMarker}>
                                <MaterialCommunityIcons
                                    name="car"
                                    size={24}
                                    color="#fff"
                                />
                                {courier.isAvailable && <View style={styles.availableDot} />}
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Available Couriers</Text>
                    <Text style={styles.headerSubtitle}>{availableCouriers.length} nearby</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <View style={styles.infoBadge}>
                        <MaterialCommunityIcons name="map-marker-radius" size={20} color={theme.colors.primary} />
                        <Text style={styles.infoBadgeText}>2km radius</Text>
                    </View>
                    <View style={styles.infoBadge}>
                        <View style={styles.availableDotLegend} />
                        <Text style={styles.infoBadgeText}>Available now</Text>
                    </View>
                </View>
                <Text style={styles.infoText}>
                    Showing couriers available for immediate pickup in your area
                </Text>
            </View>

            {/* Center on user button */}
            <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
                <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={24}
                    color={followUser ? theme.colors.primary : theme.colors.textSecondary}
                />
            </TouchableOpacity>

            {/* Courier list */}
            <View style={styles.courierList}>
                <Text style={styles.courierListTitle}>Nearby Couriers</Text>
                {availableCouriers.map((courier) => {
                    const distance = calculateDistance(
                        location.latitude,
                        location.longitude,
                        courier.latitude,
                        courier.longitude
                    );

                    return (
                        <View key={courier.id} style={styles.courierItem}>
                            <View style={styles.courierIcon}>
                                <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
                                {courier.isAvailable && <View style={styles.availableDotSmall} />}
                            </View>
                            <View style={styles.courierInfo}>
                                <Text style={styles.courierName}>{courier.name}</Text>
                                <Text style={styles.courierDistance}>{distance.toFixed(1)} km away</Text>
                            </View>
                            <View style={styles.courierOrders}>
                                <Text style={styles.courierOrdersText}>{courier.currentOrders}</Text>
                                <Text style={styles.courierOrdersLabel}>orders</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        ...theme.shadows.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
    },
    headerSubtitle: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    infoCard: {
        position: 'absolute',
        top: 120,
        left: theme.spacing.lg,
        right: theme.spacing.lg,
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        ...theme.shadows.lg,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    infoBadgeText: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.text,
        fontWeight: theme.fonts.weights.medium,
    },
    availableDotLegend: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.success,
    },
    infoText: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.textSecondary,
    },
    centerButton: {
        position: 'absolute',
        right: theme.spacing.lg,
        bottom: 280,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.lg,
    },
    courierMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        ...theme.shadows.md,
    },
    availableDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.success,
        borderWidth: 2,
        borderColor: '#fff',
    },
    courierList: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        maxHeight: 250,
        ...theme.shadows.xl,
    },
    courierListTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    courierItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    courierIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
        position: 'relative',
    },
    availableDotSmall: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.success,
        borderWidth: 2,
        borderColor: '#fff',
    },
    courierInfo: {
        flex: 1,
    },
    courierName: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
    },
    courierDistance: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    courierOrders: {
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    courierOrdersText: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.primary,
    },
    courierOrdersLabel: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.textSecondary,
    },
});

export default CourierMapScreen;
