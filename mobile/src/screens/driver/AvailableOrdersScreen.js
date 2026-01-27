import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Dimensions,
    Platform,
    Animated
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI } from '../../services/api';
import socketService from '../../services/socket';
import theme from '../../theme/theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const SPACING = (width - CARD_WIDTH) / 2;

const AvailableOrdersScreen = ({ navigation }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [acceptingOrderId, setAcceptingOrderId] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // Map ref
    const mapRef = useRef(null);
    const flatListRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadLocation();
        loadAvailableOrders();
        setupSocketListeners();

        return () => {
            socketService.removeAllListeners();
        };
    }, []);

    const loadLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const location = await Location.getCurrentPositionAsync({});
            const newUserLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            };
            setUserLocation(newUserLocation);

            // Auto-center map on user location if no orders are focused yet
            if (mapRef.current) {
                mapRef.current.animateToRegion(newUserLocation, 1000);
            }
        } catch (error) {
            console.warn('Location error:', error);
        }
    };

    const setupSocketListeners = () => {
        socketService.onNewPickupAvailable(() => loadAvailableOrders());
        socketService.onNewDeliveryAvailable(() => loadAvailableOrders());
        socketService.onOrderAccepted(() => loadAvailableOrders());
    };

    const loadAvailableOrders = async () => {
        try {
            console.log('[AvailableOrders] Fetching orders...');
            // Get pickups and deliveries
            const [pickupRes, deliveryRes] = await Promise.all([
                ordersAPI.getAvailableForCourier('pickup_available'),
                ordersAPI.getAvailableForCourier('delivery_available')
            ]);

            // Tag them with type
            const pickups = (pickupRes.data || []).map(o => ({ ...o, type: 'pickup' }));
            const deliveries = (deliveryRes.data || []).map(o => ({ ...o, type: 'delivery' }));

            const allOrders = [...pickups, ...deliveries];
            setOrders(allOrders);
        } catch (error) {
            console.error('[AvailableOrders] Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptOrder = async (order) => {
        Alert.alert(
            'Accept Order',
            `Accept this ${order.type}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Acccepter',
                    onPress: async () => {
                        setAcceptingOrderId(order.id);
                        try {
                            await ordersAPI.acceptOrder(order.id, {
                                notification_id: order.notification_id,
                                type: order.type
                            });

                            // Navigate to specific active order screen
                            if (order.type === 'pickup') {
                                navigation.navigate('PickupOrder', { orderId: order.id });
                            } else {
                                navigation.navigate('DeliveryOrder', { orderId: order.id });
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to accept order.');
                        } finally {
                            setAcceptingOrderId(null);
                            loadAvailableOrders();
                        }
                    }
                }
            ]
        );
    };

    const onScrollToIndex = (index) => {
        if (!orders[index]) return;
        const order = orders[index];
        const lat = order.type === 'pickup' ? order.pickup_lat : order.delivery_lat;
        const lng = order.type === 'pickup' ? order.pickup_lng : order.delivery_lng;

        if (lat && lng && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 500);
        }
    };

    // Called when scrolling the flatlist manually
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            const index = viewableItems[0].index;
            onScrollToIndex(index);
        }
    }).current;

    const renderOrderCard = ({ item, index }) => {
        const isPickup = item.type === 'pickup';
        const address = isPickup ? item.pickup_address : item.delivery_address;

        const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
        ];

        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View style={[styles.cardContainer, { transform: [{ scale }] }]}>
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.cardHeader}>
                        <View style={[styles.badge, isPickup ? styles.pickupBadge : styles.deliveryBadge]}>
                            <MaterialCommunityIcons
                                name={isPickup ? "package-up" : "package-down"}
                                size={16}
                                color="#fff"
                            />
                            <Text style={styles.badgeText}>{isPickup ? 'PICKUP' : 'DELIVERY'}</Text>
                        </View>
                        {item.is_express && (
                            <View style={styles.expressBadge}>
                                <MaterialCommunityIcons name="flash" size={14} color="#fff" />
                                <Text style={styles.badgeText}>EXPRESS</Text>
                            </View>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.cardContent}>
                        <Text style={styles.customerName}>{item.customer_name}</Text>
                        <Text style={styles.address} numberOfLines={2}>
                            {address}
                        </Text>
                        <Text style={styles.itemsText}>
                            {item.confirmed_item_count} items • Order #{item.order_number}
                        </Text>
                    </View>

                    {/* Button */}
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptOrder(item)}
                        disabled={acceptingOrderId === item.id}
                    >
                        {acceptingOrderId === item.id ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.acceptButtonText}>ACCEPT ORDER</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    const renderDots = () => {
        if (orders.length <= 1) return null;

        return (
            <View style={styles.pagination}>
                {orders.map((_, i) => {
                    const inputRange = [
                        (i - 1) * width,
                        i * width,
                        (i + 1) * width,
                    ];
                    const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.8, 1.4, 0.8],
                        extrapolate: 'clamp',
                    });
                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.4, 1, 0.4],
                        extrapolate: 'clamp',
                    });
                    return (
                        <Animated.View
                            key={i}
                            style={[
                                styles.dot,
                                { opacity, transform: [{ scale }] },
                            ]}
                        />
                    );
                })}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Full Screen Map */}
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_DEFAULT}
                initialRegion={userLocation || {
                    latitude: 0,
                    longitude: 0,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
            >
                {orders.map((order) => {
                    const lat = order.type === 'pickup' ? order.pickup_lat : order.delivery_lat;
                    const lng = order.type === 'pickup' ? order.pickup_lng : order.delivery_lng;

                    if (!lat || !lng) return null;

                    return (
                        <Marker
                            key={order.id}
                            coordinate={{ latitude: parseFloat(lat), longitude: parseFloat(lng) }}
                        >
                            <View style={[styles.marker, order.type === 'pickup' ? styles.pickupMarker : styles.deliveryMarker]}>
                                <MaterialCommunityIcons
                                    name={order.type === 'pickup' ? "package-up" : "package-down"}
                                    size={20}
                                    color="#fff"
                                />
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {/* Header Overlay */}
            <View style={styles.headerOverlay}>
                <Text style={styles.headerTitle}>Available Orders</Text>
                <TouchableOpacity onPress={loadAvailableOrders} style={styles.refreshButton}>
                    <MaterialCommunityIcons name="refresh" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>



            {/* Recenter Button - Restored & Moved Left */}
            <TouchableOpacity
                style={styles.recenterButton}
                onPress={() => {
                    if (userLocation && mapRef.current) {
                        mapRef.current.animateToRegion({
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        });
                    } else {
                        loadLocation();
                    }
                }}
            >
                <MaterialCommunityIcons name="crosshairs-gps" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            {/* Bottom Carousel for Orders */}
            <View style={styles.orderCarousel}>
                {renderDots()}
                <Animated.FlatList
                    ref={flatListRef}
                    data={orders}
                    renderItem={renderOrderCard}
                    keyExtractor={item => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={width} // Snap to full width
                    decelerationRate="fast"
                    contentContainerStyle={orders.length === 0 ? styles.emptyListContent : styles.carouselContent}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <MaterialCommunityIcons name="clipboard-text-off-outline" size={48} color={theme.colors.textSecondary} />
                            </View>
                            <Text style={styles.emptyText}>No available orders</Text>
                            <TouchableOpacity onPress={loadAvailableOrders} style={styles.retryButton}>
                                <Text style={styles.retryText}>Check again</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orderCarousel: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        height: 250,
        justifyContent: 'flex-end',
    },
    carouselContent: {
        paddingHorizontal: 0,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: width, // Ensure it takes full width for centering
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        marginHorizontal: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    cardContainer: {
        width: width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    card: {
        width: width * 0.85,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    headerOverlay: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    refreshButton: {
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    recenterButton: {
        position: 'absolute',
        left: 20,
        bottom: 300,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 25,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 4,
    },
    pickupBadge: { backgroundColor: theme.colors.primary },
    deliveryBadge: { backgroundColor: theme.colors.secondary },
    expressBadge: {
        backgroundColor: theme.colors.warning,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 4,
        marginLeft: 8
    },
    badgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 10,
    },
    customerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    address: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        lineHeight: 20,
    },
    itemsText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        backgroundColor: '#f5f5f5',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    acceptButton: {
        backgroundColor: '#000',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    marker: {
        padding: 6,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    pickupMarker: { backgroundColor: theme.colors.primary },
    deliveryMarker: { backgroundColor: theme.colors.secondary },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff', // White text on map background
        marginBottom: 15,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    retryButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        elevation: 3,
    },
    retryText: {
        color: '#000',
        fontWeight: 'bold',
    },
});

export default AvailableOrdersScreen;
