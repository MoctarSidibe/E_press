import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Linking,
    Platform,
    Dimensions,
    Animated
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { routingService } from '../../services/routing.service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI } from '../../services/api';
import PhotoCapture from '../../components/PhotoCapture';
import SignaturePad from '../../components/SignaturePad';
import OrderReceipt from '../../components/OrderReceipt';
import theme from '../../theme/theme';

const { height } = Dimensions.get('window');

const PickupOrderScreen = ({ navigation, route }) => {
    const { orderId } = route.params;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Route state
    const [userLocation, setUserLocation] = useState(null);
    const [routeCoords, setRouteCoords] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);

    // Form state
    const [itemCount, setItemCount] = useState('');
    const [photos, setPhotos] = useState([]);
    const [signature, setSignature] = useState(null);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [notes, setNotes] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [showQR, setShowQR] = useState(false);

    // Location Tracking
    const locationSubscription = useRef(null);

    useEffect(() => {
        loadOrder();
        startLocationTracking();

        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    // Get Real-time Driver Location
    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            // Initial position
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            // Watch for updates
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10, // Update every 10 meters
                    timeInterval: 5000    // Minimum 5 seconds between updates
                },
                (newLocation) => {
                    const { latitude, longitude } = newLocation.coords;
                    setUserLocation({ latitude, longitude });

                    // Optional: Animate camera if tracking mode is enabled
                    // if (trackingEnabled && mapRef.current) ...
                }
            );
        } catch (error) {
            console.warn('Location error:', error);
        }
    };

    const loadOrder = async () => {
        try {
            const response = await ordersAPI.getById(orderId);
            setOrder(response.data);
            // Pre-fill expected item count
            setItemCount(response.data.confirmed_item_count?.toString() || '');
        } catch (error) {
            Alert.alert('Error', 'Failed to load order');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    // Status update handler
    const handleStatusUpdate = async (newStatus) => {
        if (loading) return;

        try {
            await ordersAPI.updateStatus(orderId, newStatus);
            // Optimistic update
            setOrder(prev => ({ ...prev, status: newStatus }));

            // If arriving, zoom in to pickup
            if (newStatus === 'arrived_pickup' && coords && mapRef.current) {
                mapRef.current.animateToRegion({
                    ...coords,
                    latitudeDelta: 0.002,
                    longitudeDelta: 0.002
                }, 1000);
            }
        } catch (error) {
            console.error('Status update failed:', error);
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const getPrimaryActionButton = () => {
        if (!order) return null;

        switch (order.status) {
            case 'assigned':
            case 'pending':
                return {
                    label: 'START TRIP',
                    color: theme.colors.primary,
                    icon: 'car-connected',
                    onPress: () => handleStatusUpdate('driver_en_route_pickup')
                };
            case 'driver_en_route_pickup':
                return {
                    label: 'I HAVE ARRIVED',
                    color: theme.colors.success,
                    icon: 'map-marker-check',
                    onPress: () => handleStatusUpdate('arrived_pickup')
                };
            case 'arrived_pickup':
                return {
                    label: 'START PICKUP',
                    color: theme.colors.primary,
                    icon: 'package-variant-closed',
                    onPress: () => {
                        // Ensure bottom sheet opens
                        if (!isExpanded) {
                            toggleBottomSheet();
                        }
                    }
                };
            default:
                return {
                    label: 'VIEW DETAILS',
                    color: theme.colors.textSecondary,
                    icon: 'chevron-up',
                    onPress: toggleBottomSheet
                };
        }
    };

    const actionButton = getPrimaryActionButton();

    const handleNavigate = () => {
        if (!coords) {
            Alert.alert("Error", "Location coordinates missing");
            return;
        }

        const { latitude, longitude } = coords;

        // External Navigation
        const url = Platform.select({
            ios: `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
            android: `google.navigation:q=${latitude},${longitude}&mode=d`
        });

        Linking.openURL(url).catch(() => {
            const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
            Linking.openURL(webUrl);
        });
    };

    const handleScanQR = () => {
        navigation.navigate('QRScanner', {
            orderId,
            onScan: (scannedOrder) => {
                setIsVerified(true);
                Alert.alert('QR Verified', `Order #${scannedOrder.order_number} confirmed`);
            }
        });
    };

    const handleSaveSignature = (signatureData) => {
        setSignature(signatureData);
        setShowSignaturePad(false);
        Alert.alert('Success', 'Signature captured');
    };

    const handleSubmit = async () => {
        console.log('Submit Triggered', { itemCount, signatureStr: signature ? 'yes' : 'no', photosCount: photos.length });

        // Logic Enforcement: Must have arrived
        if (order.status !== 'arrived_pickup' && order.status !== 'picked_up') {
            Alert.alert('Action Required', 'Please tap "I HAVE ARRIVED" first.');
            return;
        }

        // Validation
        if (!itemCount || itemCount === '0') {
            Alert.alert('Error', 'Please enter item count');
            return;
        }

        if (!signature) {
            Alert.alert('Error', 'Customer signature is required');
            return;
        }

        if (photos.length === 0) {
            Alert.alert(
                'No Photos',
                'It\'s recommended to take photos. Continue without photos?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Continue', onPress: submitPickup }
                ]
            );
            return;
        }

        await submitPickup();
    };

    const submitPickup = async () => {
        setSubmitting(true);

        try {
            const scanData = {
                checkpoint: 'picked_up',
                item_count: parseInt(itemCount),
                signature_data: signature,
                photos: photos, // Array of URIs
                notes
            };

            await ordersAPI.scanOrder(orderId, scanData);

            Alert.alert(
                'Success',
                'Pickup completed successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Available')
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to complete pickup');
        } finally {
            setSubmitting(false);
        }
    };

    // Animation for bottom sheet
    const [isExpanded, setIsExpanded] = useState(false);
    const bottomSheetHeight = useRef(new Animated.Value(height * 0.35)).current;

    // Map Ref
    const mapRef = useRef(null);

    const toggleBottomSheet = () => {
        const targetHeight = isExpanded ? height * 0.35 : height * 0.85;

        Animated.spring(bottomSheetHeight, {
            toValue: targetHeight,
            useNativeDriver: false,
            friction: 6,
            tension: 40
        }).start();

        setIsExpanded(!isExpanded);
    };

    // Helper to get coordinates robustly
    const getOrderCoordinates = () => {
        if (!order) return null;

        // Try pickup_location object first (if backend returns this structure)
        if (order.pickup_location?.latitude && order.pickup_location?.longitude) {
            return {
                latitude: parseFloat(order.pickup_location.latitude),
                longitude: parseFloat(order.pickup_location.longitude)
            };
        }

        // Fallback to flat properties (if backend returns this structure like in list view)
        if (order.pickup_lat && order.pickup_lng) {
            return {
                latitude: parseFloat(order.pickup_lat),
                longitude: parseFloat(order.pickup_lng)
            };
        }

        return null;
    };

    const coords = getOrderCoordinates();

    // Fetch Route when we have both points
    useEffect(() => {
        if (userLocation && coords) {
            fetchRoute();
        }
    }, [userLocation, order]);

    const fetchRoute = async () => {
        if (!userLocation || !coords) return;

        const result = await routingService.getRoute(userLocation, coords);
        if (result) {
            setRouteCoords(result.coordinates);
            setRouteInfo({
                distance: result.distance,
                duration: result.duration
            });

            // Zoom map to fit route
            if (mapRef.current) {
                mapRef.current.fitToCoordinates(result.coordinates, {
                    edgePadding: { top: 100, right: 50, bottom: height * 0.35 + 50, left: 50 },
                    animated: true,
                });
            }
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
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
                initialRegion={{
                    latitude: coords?.latitude || 0,
                    longitude: coords?.longitude || 0,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
            >
                {/* Route Line */}
                {routeCoords.length > 0 && (
                    <Polyline
                        coordinates={routeCoords}
                        strokeColor={theme.colors.primary}
                        strokeWidth={4}
                    />
                )}

                {coords && (
                    <Marker
                        coordinate={coords}
                        title="Pickup Location"
                        description={order.pickup_address}
                    >
                        <View style={styles.markerContainer}>
                            <MaterialCommunityIcons name="package-up" size={24} color="#fff" />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Top Route Info Card */}
            {routeInfo && order?.status === 'driver_en_route_pickup' && (
                <View style={styles.routeInfoCard}>
                    <View style={styles.routeStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{(routeInfo.distance / 1000).toFixed(1)}</Text>
                            <Text style={styles.statLabel}>km</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{Math.ceil(routeInfo.duration / 60)}</Text>
                            <Text style={styles.statLabel}>min</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Top Overlay Controls */}
            <View style={styles.topOverlay}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNavigate} style={styles.navigateButton}>
                    <MaterialCommunityIcons name="navigation" size={20} color="#fff" />
                    <Text style={styles.navigateText}>NAVIGATE</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet Order Details */}
            <Animated.View style={[styles.bottomSheet, { height: bottomSheetHeight }]}>
                {/* Drag Handle / Header */}
                <TouchableOpacity activeOpacity={0.9} onPress={toggleBottomSheet} style={styles.sheetHeader}>
                    <View style={styles.handleIndicator} />
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.customerName}>{order.customer_name}</Text>
                            <Text style={styles.orderNumber}>Order #{order.order_number}</Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* Action Row */}
                    <View style={styles.actionRow}>
                        {actionButton && (
                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: actionButton.color }]}
                                onPress={actionButton.onPress}
                            >
                                <MaterialCommunityIcons name={actionButton.icon} size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.primaryButtonText}>{actionButton.label}</Text>
                            </TouchableOpacity>
                        )}

                        {/* Secondary External Map Button */}
                        <TouchableOpacity style={styles.mapButton} onPress={handleNavigate}>
                            <MaterialCommunityIcons name="google-maps" size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {/* Scrollable Content */}
                <ScrollView
                    style={styles.sheetContent}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Customer Info */}
                    <View style={styles.section}>
                        <View style={styles.customerRow}>
                            <View style={styles.customerAvatar}>
                                <Text style={styles.customerInitials}>
                                    {order.customer_name?.substring(0, 2).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.customerInfo}>
                                <Text style={styles.customerName}>{order.customer_name}</Text>
                                <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}>
                                    <Text style={styles.customerPhone}>{order.customer_phone}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.callButton}
                                onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}
                            >
                                <MaterialCommunityIcons name="phone" size={24} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Actions Grid */}
                    <View style={styles.actionGrid}>
                        <TouchableOpacity style={styles.actionCard} onPress={() => setShowQR(true)}>
                            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                                <MaterialCommunityIcons
                                    name="qrcode"
                                    size={28}
                                    color={theme.colors.primary}
                                />
                            </View>
                            <Text style={styles.actionLabel}>Show QR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, isVerified && { borderColor: theme.colors.success, backgroundColor: theme.colors.success + '10' }]}
                            onPress={handleScanQR}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: isVerified ? theme.colors.success + '20' : theme.colors.secondary + '20' }]}>
                                <MaterialCommunityIcons
                                    name={isVerified ? "check-decagram" : "qrcode-scan"}
                                    size={28}
                                    color={isVerified ? theme.colors.success : theme.colors.secondary}
                                />
                            </View>
                            <Text style={[styles.actionLabel, isVerified && { color: theme.colors.success, fontWeight: 'bold' }]}>
                                {isVerified ? 'Verified' : 'Scan QR'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={() => setShowSignaturePad(true)}>
                            <View style={[styles.actionIcon, { backgroundColor: signature ? theme.colors.success + '20' : theme.colors.primary + '20' }]}>
                                <MaterialCommunityIcons
                                    name={signature ? "check-circle" : "draw"}
                                    size={28}
                                    color={signature ? theme.colors.success : theme.colors.primary}
                                />
                            </View>
                            <Text style={styles.actionLabel}>{signature ? "Signed" : "Signature"}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Verification & Items */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Verification</Text>
                        <View style={styles.countContainer}>
                            <TouchableOpacity
                                style={styles.countButton}
                                onPress={() => setItemCount(Math.max(0, parseInt(itemCount || 0) - 1).toString())}
                            >
                                <MaterialCommunityIcons name="minus" size={24} color={theme.colors.primary} />
                            </TouchableOpacity>
                            <View style={styles.countDisplay}>
                                <TextInput
                                    style={styles.countInput}
                                    value={itemCount}
                                    onChangeText={setItemCount}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                />
                                <Text style={styles.countLabel}>Items</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.countButton}
                                onPress={() => setItemCount((parseInt(itemCount || 0) + 1).toString())}
                            >
                                <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                        {itemCount && parseInt(itemCount) !== order.confirmed_item_count && (
                            <View style={styles.warningBox}>
                                <MaterialCommunityIcons name="alert" size={20} color={theme.colors.warning} />
                                <Text style={styles.warningText}>
                                    Mismatch: Expected {order.confirmed_item_count}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Photos */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Photos</Text>
                        <PhotoCapture
                            photos={photos}
                            onPhotosChange={setPhotos}
                            maxPhotos={5}
                        />
                    </View>

                    <View style={{ height: 20 }} />
                </ScrollView>

                {/* Fixed Footer Logic inside Bottom Sheet */}
                <View style={styles.sheetFooter}>
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (submitting || (order && order.status !== 'arrived_pickup')) && styles.submitButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>CONFIRM PICKUP</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Signature Pad Modal */}
            <SignaturePad
                visible={showSignaturePad}
                onSave={handleSaveSignature}
                onCancel={() => setShowSignaturePad(false)}
            />

            {/* Order QR Receipt Modal */}
            <OrderReceipt
                visible={showQR}
                order={order}
                onClose={() => setShowQR(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerContainer: {
        backgroundColor: theme.colors.primary,
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },
    topOverlay: {
        position: 'absolute',
        top: 80, // Increased to avoid battery/status bar overlap
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    iconButton: {
        width: 45,
        height: 45,
        backgroundColor: '#fff',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    navigateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        height: 45,
        borderRadius: 25,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    navigateText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
        overflow: 'hidden',
    },
    sheetHeader: {
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    handleIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#e0e0e0',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 15,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    headerAddress: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        width: '90%',
    },
    sheetContent: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    customerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    customerInitials: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    customerInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 2,
    },
    customerPhone: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    callButton: {
        width: 45,
        height: 45,
        borderRadius: 23,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        gap: 15,
    },
    actionCard: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 15,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    countContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#eee',
    },
    countButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        elevation: 1,
    },
    countDisplay: {
        alignItems: 'center',
        minWidth: 80,
    },
    countInput: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center',
        padding: 0,
    },
    countLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginTop: 4,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.warning + '15',
        padding: 10,
        borderRadius: 10,
        marginTop: 10,
        gap: 8,
    },
    warningText: {
        color: theme.colors.warning,
        fontSize: 13,
        fontWeight: '600',
    },
    sheetFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    // New Styles
    routeInfoCard: {
        position: 'absolute',
        top: 110,
        alignSelf: 'center',
        backgroundColor: '#000',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 50,
    },
    routeStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    statValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#ccc',
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: '#444',
    },
    statusBadge: {
        backgroundColor: '#000',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    orderNumber: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        gap: 10,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    mapButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
});

export default PickupOrderScreen;
