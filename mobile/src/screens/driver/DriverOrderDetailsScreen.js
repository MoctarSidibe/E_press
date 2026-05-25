import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LeafletMapComponent from '../../components/map/LeafletMapComponent';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import { ordersAPI, driverAPI } from '../../services/api';
import socketService from '../../services/socket';
import theme from '../../theme/theme';
import * as Location from 'expo-location';

const DriverOrderDetailsScreen = ({ navigation, route }) => {
    const { orderId, order: initialOrder } = route.params || {};
    const insets = useSafeAreaInsets();
    const [order, setOrder] = useState(initialOrder);
    const [loading, setLoading] = useState(!initialOrder);
    const [accepting, setAccepting] = useState(false);
    const [distance, setDistance] = useState(null);
    const [currentDriverId, setCurrentDriverId] = useState(null);
    const [isPickupDriver, setIsPickupDriver] = useState(false);
    const [isDeliveryDriver, setIsDeliveryDriver] = useState(false);
    const [driverCoords, setDriverCoords] = useState(null);

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('📍 Order Details focused - refreshing');
            loadOrderDetails();
            fetchDriverLocation(); // Fetch GPS immediately
        }, [orderId])
    );

    // Fetch driver GPS immediately on mount
    const fetchDriverLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            console.log('📍 Driver GPS:', location.coords.latitude, location.coords.longitude);
            setDriverCoords({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
        } catch (error) {
            console.error('Error getting driver location:', error);
        }
    };

    useEffect(() => {
        loadCurrentDriver();
        fetchDriverLocation(); // Get GPS right away
        if (!initialOrder) {
            loadOrderDetails();
        } else {
            checkDriverType(initialOrder);
        }
    }, [orderId]);

    // Real-time status updates via Socket.IO
    useEffect(() => {
        if (!orderId) return;

        // Join the order room to receive updates
        socketService.joinOrder(orderId);

        const handleStatusUpdate = (data) => {
            console.log('📦 Order status updated (DriverOrderDetails):', data);
            if (data.orderId === orderId) {
                // Update local state with new status
                setOrder(prev => prev ? { ...prev, status: data.status } : prev);
                // Optionally reload full order for complete data
                loadOrderDetails();
            }
        };

        socketService.on('order:status_updated', handleStatusUpdate);

        return () => {
            socketService.off('order:status_updated');
        };
    }, [orderId]);

    useEffect(() => {
        if (order) {
            checkDriverType(order);
        }
    }, [order, currentDriverId]);

    const loadCurrentDriver = async () => {
        try {
            const user = JSON.parse(await AsyncStorage.getItem('user'));
            setCurrentDriverId(user?.id);
        } catch (error) {
            console.error('Failed to load current driver:', error);
        }
    };

    const checkDriverType = (orderData) => {
        if (!currentDriverId || !orderData) return;

        setIsPickupDriver(parseInt(orderData.pickup_driver_id) === parseInt(currentDriverId));
        setIsDeliveryDriver(parseInt(orderData.delivery_driver_id) === parseInt(currentDriverId));
    };

    const calculateDistance = async () => {
        if (!order) return;

        try {
            // Request location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }

            // Get driver's current location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const driverLat = location.coords.latitude;
            const driverLon = location.coords.longitude;

            // Store driver coords for map
            setDriverCoords({ latitude: driverLat, longitude: driverLon });

            // Get target location (pickup for pickup driver, delivery for delivery driver)
            let targetLat, targetLon;
            if (isDeliveryDriver) {
                targetLat = parseFloat(order.delivery_latitude || order.delivery_lat || 0);
                targetLon = parseFloat(order.delivery_longitude || order.delivery_lng || 0);
            } else {
                // Default to pickup
                targetLat = parseFloat(order.pickup_latitude || order.pickup_lat || 0);
                targetLon = parseFloat(order.pickup_longitude || order.pickup_lng || 0);
            }

            if (!targetLat || !targetLon) return;

            // Haversine formula for distance
            const R = 6371; // Earth's radius in km
            const dLat = (targetLat - driverLat) * Math.PI / 180;
            const dLon = (targetLon - driverLon) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(driverLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = R * c;

            setDistance(dist.toFixed(1));
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const loadOrderDetails = async () => {
        try {
            const response = await ordersAPI.getById(orderId);
            setOrder(response.data);
            calculateDistance();
        } catch (error) {
            console.error('Failed to load order:', error);
            Alert.alert('Error', 'Failed to load order details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const openMaps = (latitude, longitude, label) => {
        if (!latitude || !longitude) {
            Alert.alert('No Location', 'Location coordinates not available');
            return;
        }

        const scheme = Platform.select({
            ios: 'maps:',
            android: 'geo:'
        });
        const url = Platform.select({
            ios: `${scheme}?q=${latitude},${longitude}&ll=${latitude},${longitude}`,
            android: `${scheme}${latitude},${longitude}?q=${latitude},${longitude}(${label})`
        });

        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(url);
                } else {
                    // Fallback to Google Maps web
                    const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                    return Linking.openURL(webUrl);
                }
            })
            .catch((err) => {
                console.error('Failed to open maps:', err);
                Alert.alert('Error', 'Failed to open maps');
            });
    };

    const handleAcceptOrder = async () => {
        try {
            setAccepting(true);

            // Determine if this is pickup or delivery based on order status
            const type = (!order.pickup_driver_id) ? 'pickup' : 'delivery';

            // Use driverAPI.acceptOrder which uses the simpler /driver/orders/:id/accept endpoint
            await driverAPI.acceptOrder(orderId);

            Alert.alert(
                'Success!',
                `You've accepted this ${type} order. It's now in your orders list.`,
                [
                    {
                        text: 'Go to My Orders',
                        onPress: () => navigation.navigate('DriverOrders')
                    },
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error) {
            console.error('Failed to accept order:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to accept order. It may have been accepted by another driver.');
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Chargement des détails...</Text>
            </View>
        );
    }

    if (!order) return null;

    // Check if order is available for acceptance (not assigned to me or anyone else yet)
    // The previous logic was if (!)pickup_driver_id.
    // If I am viewing it from "My Orders", I am the driver.
    // If I am viewing from "Available", I am not the driver.
    // Simple check: can I accept it? Only if neither pickup/delivery driver is set (depending on stage)
    // But simplified: if I'm viewing details, the button logic determines this.

    // For now, let's assume if we are navigated here, we see details.
    // Acceptance logic is handled by button visibility.

    // Check if I am the assigned driver (needs current user ID, but we don't have it easily here without auth context)
    // We'll rely on order status and ID presence.

    const isPickupAssigned = !!order.pickup_driver_id;
    const isDeliveryAssigned = !!order.delivery_driver_id;

    // Correct logic: 
    // - If trying to accept pickup (status pending), ensure no pickup driver
    // - If trying to accept delivery (status ready), ensure no delivery driver
    // - We can use order status to determine what we are looking for
    let canAccept = false;
    if (order.status === 'pending') {
        canAccept = !isPickupAssigned;
    } else if (order.status === 'ready') {
        canAccept = !isDeliveryAssigned;
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Commande #{order.order_number}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* QR Code (Scanner for driver? No, Driver scans customer. This is just order info) */}
                {/* Actually driver doesn't need to show QR. Customer shows QR. Driver scans. */}
                {/* But maybe useful for reference? We'll keep it small or remove it. Let's keep it consistent. */}
                <View style={styles.qrContainer}>
                    <View style={styles.qrWrapper}>
                        <QRCodeDisplay
                            value={JSON.stringify({ id: order.id, num: order.order_number })}
                            size={120}
                        />
                    </View>
                    <Text style={styles.qrLabel}>Référence commande</Text>
                </View>

                {/* Order Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Informations commande</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Statut :</Text>
                        <Text style={[styles.infoValue, { color: theme.colors.primary }]}>
                            {order.status?.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Articles :</Text>
                        <Text style={styles.infoValue}>
                            {order.confirmed_item_count || order.customer_estimated_count || 0} pièces
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Total :</Text>
                        <Text style={styles.infoValue}>
                            {(parseFloat(order.total || 0) * 100).toFixed(0)} Fcfa
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Paiement :</Text>
                        <Text style={styles.infoValue}>
                            {order.payment_method === 'cash' ? 'Espèces à la collecte' : order.payment_method?.toUpperCase()}
                        </Text>
                    </View>
                    {distance && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Distance :</Text>
                            <Text style={[styles.infoValue, { color: theme.colors.success }]}>
                                ~{distance} km
                            </Text>
                        </View>
                    )}
                </View>

                {/* Detailed Items List - Critical for courier verification */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="hanger" size={18} color={theme.colors.text} />
                        {' '}Articles à collecter ({order.items?.length || order.confirmed_item_count || 0})
                    </Text>
                    {order.items && order.items.length > 0 ? (
                        order.items.map((item, index) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <View style={styles.itemQtyBadge}>
                                        <Text style={styles.itemQtyText}>{item.quantity}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName}>{item.category_name || item.name}</Text>
                                        {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
                                    </View>
                                </View>
                                <Text style={styles.itemPrice}>
                                    {((parseFloat(item.price_per_item || 0) * item.quantity) * 100).toFixed(0)} Fcfa
                                </Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noItemsBox}>
                            <MaterialCommunityIcons name="information" size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.noItemsText}>
                                Le client a estimé {order.customer_estimated_count || order.confirmed_item_count || 0} article(s)
                            </Text>
                        </View>
                    )}
                </View>

                {/* Map and Address - Show only relevant for driver type */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {isPickupDriver ? 'Pickup Location' : isDeliveryDriver ? 'Delivery Location' : 'Route Information'}
                    </Text>

                    {/* Embedded Map - Driver to Target */}
                    <View style={styles.mapContainer}>
                        <LeafletMapComponent
                            driverLocation={driverCoords}
                            origin={isDeliveryDriver ? null : {
                                latitude: parseFloat(order.pickup_latitude || order.pickup_lat || 0),
                                longitude: parseFloat(order.pickup_longitude || order.pickup_lng || 0)
                            }}
                            destination={isDeliveryDriver ? {
                                latitude: parseFloat(order.delivery_latitude || order.delivery_lat || 0),
                                longitude: parseFloat(order.delivery_longitude || order.delivery_lng || 0)
                            } : null}
                        />
                    </View>

                    {/* Show ONLY pickup address for pickup driver */}
                    {isPickupDriver && (
                        <View style={styles.addressCard}>
                            <View style={[styles.addressHeader, { borderBottomWidth: 2, borderBottomColor: theme.colors.primary, paddingBottom: 4 }]}>
                                <MaterialCommunityIcons name="map-marker-up" size={20} color={theme.colors.primary} />
                                <Text style={styles.addressTitle}>Pickup Address</Text>
                                <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: 'bold', marginLeft: 'auto' }}>YOUR DESTINATION</Text>
                            </View>
                            <Text style={styles.addressText}>{order.pickup_address || 'Not specified'}</Text>
                            <TouchableOpacity
                                style={styles.navigateButton}
                                onPress={() => {
                                    const lat = order.pickup_latitude || order.pickup_lat;
                                    const lng = order.pickup_longitude || order.pickup_lng;
                                    if (lat && lng) {
                                        openMaps(lat, lng, 'Pickup Location');
                                    } else {
                                        Alert.alert('No Location', 'Coordinates unavailable');
                                    }
                                }}
                            >
                                <MaterialCommunityIcons name="navigation" size={16} color={theme.colors.primary} />
                                <Text style={styles.navigateText}>Open in Google Maps</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Show ONLY delivery address for delivery driver */}
                    {isDeliveryDriver && (
                        <View style={styles.addressCard}>
                            <View style={[styles.addressHeader, { borderBottomWidth: 2, borderBottomColor: theme.colors.success, paddingBottom: 4 }]}>
                                <MaterialCommunityIcons name="map-marker-down" size={20} color={theme.colors.success} />
                                <Text style={styles.addressTitle}>Delivery Address</Text>
                                <Text style={{ color: theme.colors.success, fontSize: 10, fontWeight: 'bold', marginLeft: 'auto' }}>YOUR DESTINATION</Text>
                            </View>
                            <Text style={styles.addressText}>{order.delivery_address || 'Not specified'}</Text>
                            <TouchableOpacity
                                style={styles.navigateButton}
                                onPress={() => {
                                    const lat = order.delivery_latitude || order.delivery_lat;
                                    const lng = order.delivery_longitude || order.delivery_lng;
                                    if (lat && lng) {
                                        openMaps(lat, lng, 'Delivery Location');
                                    } else {
                                        Alert.alert('No Location', 'Coordinates unavailable');
                                    }
                                }}
                            >
                                <MaterialCommunityIcons name="map-marker-down" size={16} color={theme.colors.success} />
                                <Text style={styles.navigateText}>Open in Google Maps</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* For orders not yet accepted, show both for preview */}
                    {!isPickupDriver && !isDeliveryDriver && (
                        <>
                            <View style={styles.addressCard}>
                                <View style={styles.addressHeader}>
                                    <MaterialCommunityIcons name="map-marker-up" size={20} color={theme.colors.primary} />
                                    <Text style={styles.addressTitle}>Pickup Address</Text>
                                </View>
                                <Text style={styles.addressText}>{order.pickup_address || 'Not specified'}</Text>
                            </View>

                            <View style={styles.addressCard}>
                                <View style={styles.addressHeader}>
                                    <MaterialCommunityIcons name="map-marker-down" size={20} color={theme.colors.success} />
                                    <Text style={styles.addressTitle}>Delivery Address</Text>
                                </View>
                                <Text style={styles.addressText}>{order.delivery_address || 'Not specified'}</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Customer Contact */}
                {order.customer_phone && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Customer Contact</Text>
                        <TouchableOpacity
                            style={styles.contactButton}
                            onPress={() => {
                                Linking.openURL(`tel:${order.customer_phone}`).catch(err =>
                                    Alert.alert('Error', 'Could not open dialer')
                                );
                            }}
                        >
                            <MaterialCommunityIcons name="phone" size={24} color={theme.colors.primary} />
                            <Text style={styles.contactText}>Call Customer</Text>
                            <Text style={{ color: theme.colors.textSecondary }}>
                                ({order.customer_name || 'Customer'})
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Comments/Notes */}
                {(order.special_instructions || order.notes) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Special Instructions</Text>
                        <Text style={styles.commentText}>{order.special_instructions || order.notes}</Text>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer Actions */}
            {canAccept ? (
                <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : theme.spacing.lg }]}>
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={handleAcceptOrder}
                        disabled={accepting}
                    >
                        {accepting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
                                <Text style={styles.acceptButtonText}>Accept Order</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            ) : (
                // Show scan button ONLY for their specific task, hide after completion
                (isPickupDriver && ['pickup_assigned', 'assigned', 'pending'].includes(order.status)) ? (
                    <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : theme.spacing.lg }]}>
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}
                            onPress={() => navigation.navigate('PickupOrder', { orderId: order.id })}
                        >
                            <MaterialCommunityIcons name="package-up" size={24} color="#fff" />
                            <Text style={styles.scanButtonText}>Démarrer la collecte</Text>
                        </TouchableOpacity>
                    </View>
                ) : (isPickupDriver && ['driver_en_route_pickup', 'arrived_pickup'].includes(order.status)) ? (
                    <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : theme.spacing.lg }]}>
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: theme.colors.warning }]}
                            onPress={() => navigation.navigate('PickupOrder', { orderId: order.id })}
                        >
                            <MaterialCommunityIcons name="restore" size={24} color="#fff" />
                            <Text style={styles.scanButtonText}>Reprendre la collecte</Text>
                        </TouchableOpacity>
                    </View>
                ) : (isDeliveryDriver && ['in_transit', 'out_for_delivery', 'ready_for_delivery', 'picked_up', 'cleaning', 'ready'].includes(order.status)) ? (
                    <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : theme.spacing.lg }]}>
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: theme.colors.success }]}
                            onPress={() => navigation.navigate('DeliveryOrder', { orderId: order.id })}
                        >
                            <MaterialCommunityIcons name="package-down" size={24} color="#fff" />
                            <Text style={styles.scanButtonText}>Démarrer la livraison</Text>
                        </TouchableOpacity>
                    </View>
                ) : (isDeliveryDriver && ['driver_en_route_delivery', 'arrived_delivery'].includes(order.status)) ? (
                    <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : theme.spacing.lg }]}>
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: theme.colors.warning }]}
                            onPress={() => navigation.navigate('DeliveryOrder', { orderId: order.id })}
                        >
                            <MaterialCommunityIcons name="restore" size={24} color="#fff" />
                            <Text style={styles.scanButtonText}>Reprendre la livraison</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Explicitly check for completed states before showing "Completed"
                    // Pickup Driver Completed: picked_up, received, ready, in_transit, delivered
                    (isPickupDriver && ['picked_up', 'received', 'ready', 'in_transit', 'delivered', 'out_for_delivery', 'ready_for_delivery'].includes(order.status)) ||
                    // Delivery Driver Completed: delivered
                    (isDeliveryDriver && ['delivered'].includes(order.status))
                ) ? (
                    <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : theme.spacing.lg }]}>
                        <View style={[styles.completedButton]}>
                            <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.success} />
                            <Text style={styles.completedButtonText}>
                                {isPickupDriver ? 'Pickup Completed ✓' : 'Delivery Completed ✓'}
                            </Text>
                        </View>
                    </View>
                ) : null
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingTop: 50, // improved header spacing
        paddingBottom: theme.spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    qrWrapper: {
        padding: theme.spacing.md,
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.sm,
    },
    qrLabel: {
        marginTop: theme.spacing.sm,
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.textSecondary,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.sm,
    },
    sectionTitle: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    infoLabel: {
        color: theme.colors.textSecondary,
    },
    infoValue: {
        fontWeight: '600',
        color: theme.colors.text,
    },
    addressCard: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
    },
    addressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    addressTitle: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: '600',
        color: theme.colors.text,
    },
    addressText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    navigateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
    },
    navigateText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
    },
    contactText: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        fontWeight: '500',
    },
    commentText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.text,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    // Item list styles
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    itemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: theme.spacing.sm,
    },
    itemQtyBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemQtyText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.sm,
        fontWeight: 'bold',
    },
    itemName: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        fontWeight: '500',
    },
    itemNotes: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    itemPrice: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.primary,
        fontWeight: '600',
        marginLeft: theme.spacing.md,
    },
    noItemsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
    },
    noItemsText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    footer: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.success,
        paddingVertical: theme.spacing.md + 4,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.sm,
    },
    acceptButtonText: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: '#fff',
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md + 4,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.sm,
    },
    scanButtonText: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: '#fff',
    },
    completedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
        paddingVertical: theme.spacing.md + 4,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.sm,
        borderWidth: 2,
        borderColor: theme.colors.success,
    },
    completedButtonText: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    mapContainer: {
        height: 400,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
});

export default DriverOrderDetailsScreen;
