import React, { useState, useEffect, useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { categoriesAPI, ordersAPI, locationsAPI } from '../../services/api';
import { getClothingIcon } from '../../config/icons';
import theme from '../../theme/theme';
import PhotoCapture from '../../components/PhotoCapture';
import { useReceiptPDF } from '../../hooks/useReceiptPDF';
import OrderReceipt from '../../components/OrderReceipt';

const NewOrderScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1); // 1: Items, 2: Locations, 3: Schedule, 4: Payment
    const [categories, setCategories] = useState([]);
    const [groupedItems, setGroupedItems] = useState({});
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Order data
    const [orderData, setOrderData] = useState({
        items: [], // {categoryId, quantity, notes}
        pickupLocationId: null,
        deliveryLocationId: null,
        pickupType: 'immediate', // 'immediate' or 'scheduled'
        pickupScheduledAt: null,
        isExpress: false,
        specialInstructions: '',
        paymentMethod: 'cash',
    });

    // Add Location State
    const [showAddLocation, setShowAddLocation] = useState(false);
    const [newLocation, setNewLocation] = useState({ label: '', address: '', latitude: null, longitude: null });
    const [addingLocation, setAddingLocation] = useState(false);
    const [editingLocationId, setEditingLocationId] = useState(null); // Track which location is being edited

    // GPS Location State
    const [locationPermission, setLocationPermission] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [mapRegion, setMapRegion] = useState(null);
    const [markerCoordinate, setMarkerCoordinate] = useState(null);
    const [fetchingLocation, setFetchingLocation] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

    // Business hours configuration (can be moved to config later)
    const businessHours = {
        openTime: 8, // 8 AM
        closeTime: 18, // 6 PM
        operatingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday (0 = Sunday)
    };

    // Time slots for scheduled pickup
    const timeSlots = [
        { id: 'morning', label: 'Morning', time: '9:00 - 11:00 AM', hours: { start: 9, end: 11 } },
        { id: 'midday', label: 'Midday', time: '11:00 AM - 2:00 PM', hours: { start: 11, end: 14 } },
        { id: 'afternoon', label: 'Afternoon', time: '2:00 - 4:00 PM', hours: { start: 14, end: 16 } },
        { id: 'evening', label: 'Evening', time: '4:00 - 6:00 PM', hours: { start: 16, end: 18 } },
    ];

    // QR Tracking V1 - New states
    const [orderPhotos, setOrderPhotos] = useState([]);
    const [orderComment, setOrderComment] = useState('');
    const [itemComment, setItemComment] = useState('');
    const [showReceipt, setShowReceipt] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);

    // Refs for scrolling and category tracking
    const scrollRef = useRef(null);
    const categoryRefs = useRef({});

    // Safe area insets for Android bottom nav
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadData();
    }, []);

    // Handle auto-selection from params
    useEffect(() => {
        if (!loading && categories.length > 0) {
            // Handle multiple pre-selected items from home screen
            if (route.params?.preSelectedItems && Array.isArray(route.params.preSelectedItems)) {
                const items = route.params.preSelectedItems.map(item => ({
                    categoryId: item.categoryId,
                    quantity: item.quantity,
                    notes: ''
                }));
                setOrderData(prev => ({
                    ...prev,
                    items
                }));

                // Scroll down to show the selected items indicator
                setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: 150, animated: true });
                }, 500);
            }
            // Handle single pre-selected category (legacy support)
            else if (route.params?.preSelectedCategory) {
                const category = route.params.preSelectedCategory;
                const exists = orderData.items.some(item => item.categoryId === category.id);
                if (!exists) {
                    setOrderData(prev => ({
                        ...prev,
                        items: [...prev.items, { categoryId: category.id, quantity: 1, notes: '' }]
                    }));
                }

                // Scroll down to show the selected items indicator
                setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: 150, animated: true });
                }, 500);
            }
        }
    }, [loading, route.params, categories]);

    const loadData = async () => {
        try {
            const [categoriesRes, locationsRes] = await Promise.all([
                categoriesAPI.getAll(),
                locationsAPI.getAll(),
            ]);
            setCategories(categoriesRes.data);

            // Group data
            const groups = {
                'Clothing': [],
                'Household': [],
                'Accessories': []
            };
            categoriesRes.data.forEach(cat => {
                const name = cat.name.toLowerCase();
                if (name.includes('sheet') || name.includes('towel') || name.includes('blanket') || name.includes('pillow') || name.includes('duvet') || name.includes('curtain')) {
                    groups['Household'].push(cat);
                } else if (name.includes('tie') || name.includes('scarf') || name.includes('glove')) {
                    groups['Accessories'].push(cat);
                } else {
                    groups['Clothing'].push(cat);
                }
            });
            setGroupedItems(groups);

            setLocations(locationsRes.data);

            // Only set default pickup location if not already set
            const defaultLocation = locationsRes.data.find(loc => loc.is_default);
            if (defaultLocation && !orderData.pickupLocationId && !orderData.deliveryLocationId) {
                setOrderData(prev => ({
                    ...prev,
                    pickupLocationId: defaultLocation.id,
                    deliveryLocationId: defaultLocation.id,
                }));
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('customer.newOrder.failedLoadData'));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (categoryId) => {
        const existingIndex = orderData.items.findIndex(item => item.categoryId === categoryId);

        if (existingIndex >= 0) {
            // Remove item
            setOrderData({
                ...orderData,
                items: orderData.items.filter((_, i) => i !== existingIndex),
            });
        } else {
            // Add item
            setOrderData({
                ...orderData,
                items: [...orderData.items, { categoryId, quantity: 1, notes: '' }],
            });
        }
    };

    const updateItemQuantity = (categoryId, quantity) => {
        setOrderData({
            ...orderData,
            items: orderData.items.map(item =>
                item.categoryId === categoryId ? { ...item, quantity } : item
            ),
        });
    };

    const handleDateChange = (event, date) => {
        setShowDatePicker(false);
        if (event.type === 'set' && date) {
            setSelectedDate(date);
            // Reset time slot when date changes
            setSelectedTimeSlot(null);
            setOrderData({ ...orderData, pickupScheduledAt: null });
        }
    };

    const handleTimeSlotSelect = (slot) => {
        if (!selectedDate) {
            Alert.alert(t('customer.newOrder.selectDateFirst'), t('customer.newOrder.selectDateFirstMessage'));
            return;
        }

        setSelectedTimeSlot(slot);

        // Combine date and time slot start hour
        const scheduledDateTime = new Date(selectedDate);
        scheduledDateTime.setHours(slot.hours.start, 0, 0, 0);

        setOrderData({
            ...orderData,
            pickupScheduledAt: scheduledDateTime.toISOString(),
        });
    };

    // Scroll to top whenever step changes
    // Track previous step to trigger scroll only on step change
    const previousStepRef = useRef(step);

    useEffect(() => {
        previousStepRef.current = step;
    }, [step]);

    const handleContentSizeChange = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ y: 0, animated: false });
        }
    };

    const goToNextStep = () => {
        if (step < 4) {
            setStep(step + 1);
        }
    };

    const goToPreviousStep = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const isDateValid = (date) => {
        const day = date.getDay();
        return businessHours.operatingDays.includes(day);
    };

    const getMinimumDate = () => {
        // Minimum is tomorrow (can be adjusted for same-day pickup)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    };

    const calculateTotal = () => {
        let subtotal = 0;
        orderData.items.forEach(item => {
            const category = categories.find(c => c.id === item.categoryId);
            if (category) {
                const price = orderData.isExpress ? category.express_price : category.base_price;
                subtotal += price * item.quantity;
            }
        });

        const deliveryFee = 2.00;
        const expressFee = orderData.isExpress ? subtotal * 0.2 : 0;
        const tax = (subtotal + deliveryFee + expressFee) * 0.1;
        const total = subtotal + deliveryFee + expressFee + tax;

        return { subtotal, deliveryFee, expressFee, tax, total };
    };

    const { downloadPDF } = useReceiptPDF();

    const resetForm = () => {
        setOrderData({
            items: [],
            pickupLocationId: defaultLocationId, // Will be re-set from locations
            deliveryLocationId: defaultLocationId,
            pickupType: 'immediate',
            pickupScheduledAt: null,
            isExpress: false,
            specialInstructions: '',
            paymentMethod: 'cash',
        });
        setOrderPhotos([]);
        setOrderComment('');
        setItemComment('');
        setStep(1);
        setCreatedOrder(null);
    };

    // Calculate default location ID for reset
    const defaultLocationId = locations.find(loc => loc.is_default)?.id || null;

    const handleSubmitOrder = async () => {
        // Validation
        if (orderData.items.length === 0) {
            Alert.alert(t('common.error'), t('customer.newOrder.selectOneItem'));
            return;
        }

        if (!orderData.pickupLocationId || !orderData.deliveryLocationId) {
            Alert.alert(t('common.error'), t('customer.newOrder.selectPickupDelivery'));
            return;
        }

        if (orderData.pickupType === 'scheduled' && !orderData.pickupScheduledAt) {
            Alert.alert(t('common.error'), t('customer.newOrder.selectPickupTime'));
            return;
        }

        setSubmitting(true);

        try {
            // Include photos and comments in order data
            const orderPayload = {
                ...orderData,
                orderComment,
                itemComment,
            };

            const response = await ordersAPI.create(orderPayload);
            const newOrder = response.data;

            // Upload photos if any
            if (orderPhotos.length > 0) {
                console.log(`[NewOrder] Uploading ${orderPhotos.length} photos...`);

                for (const photoUri of orderPhotos) {
                    try {
                        // Read file as Base64
                        const base64 = await FileSystem.readAsStringAsync(photoUri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });

                        const photoData = `data:image/jpeg;base64,${base64}`;

                        await ordersAPI.addPhoto(newOrder.id, {
                            photoType: 'item',
                            photoUrl: photoData,
                            notes: 'Order creation photo'
                        });
                    } catch (photoError) {
                        console.error('[NewOrder] Failed to upload photo:', photoError);
                        // Continue uploading other photos even if one fails
                    }
                }
            }

            // Store order for receipt display
            setCreatedOrder(newOrder);

            // Show success alert with Direct PDF option
            Alert.alert(
                'Order Placed Successfully!',
                `Your order #${newOrder.order_number} has been created.`,
                [
                    {
                        text: 'View Receipt',
                        onPress: () => setShowReceipt(true)
                    },
                    {
                        text: 'Download PDF',
                        onPress: async () => {
                            await downloadPDF(newOrder);
                            resetForm();
                            navigation.navigate('Home');
                        }
                    },
                    {
                        text: 'Go Home',
                        style: 'cancel',
                        onPress: () => {
                            resetForm();
                            navigation.navigate('Home');
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('[NewOrderScreen] Order submission error:', error);
            console.error('[NewOrderScreen] Error details:', JSON.stringify(error.response?.data, null, 2));
            Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddLocation = async () => {
        if (!newLocation.label || !newLocation.address) {
            Alert.alert(t('common.error'), t('customer.newOrder.fillAllFields'));
            return;
        }

        setAddingLocation(true);
        try {
            if (editingLocationId) {
                // Update existing location
                const response = await locationsAPI.update(editingLocationId, newLocation);
                setLocations(locations.map(loc =>
                    loc.id === editingLocationId ? response.data : loc
                ));
                Alert.alert(t('common.success'), t('customer.newOrder.locationUpdated'));
            } else {
                // Create new location
                const response = await locationsAPI.create(newLocation);
                setLocations([...locations, response.data]);
                Alert.alert(t('common.success'), t('customer.newOrder.locationAdded'));
            }

            setShowAddLocation(false);
            setNewLocation({ label: '', address: '', latitude: null, longitude: null });
            setEditingLocationId(null);
            setMapRegion(null);
            setMarkerCoordinate(null);
        } catch (error) {
            console.error('[NewOrderScreen] Location save error:', error);
            Alert.alert(t('common.error'), t('customer.newOrder.failedSaveLocation'));
        } finally {
            setAddingLocation(false);
        }
    };

    const handleEditLocation = (location) => {
        setEditingLocationId(location.id);
        // Create a deep copy to prevent reference issues
        setNewLocation({
            label: String(location.label || ''),
            address: String(location.address || ''),
            latitude: location.latitude,
            longitude: location.longitude
        });

        // Set map if coordinates exist
        if (location.latitude && location.longitude) {
            // Convert to numbers to ensure .toFixed() works properly
            const coords = {
                latitude: parseFloat(location.latitude),
                longitude: parseFloat(location.longitude)
            };
            setMarkerCoordinate({ ...coords });
            setMapRegion({
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });
        }

        setShowAddLocation(true);
    };


    const handleDuplicateLocation = async (location) => {
        try {
            // Create a copy with " (Copy)" appended to the label
            const duplicatedLocation = {
                label: `${location.label} (Copy)`,
                address: location.address,
                latitude: location.latitude,
                longitude: location.longitude
            };

            const response = await locationsAPI.create(duplicatedLocation);
            setLocations([...locations, response.data]);
            Alert.alert('Success', 'Location duplicated successfully. You can now edit it separately.');
        } catch (error) {
            console.error('[NewOrderScreen] Duplicate location error:', error);
            Alert.alert('Error', 'Failed to duplicate location');
        }
    };

    const handleDeleteLocation = (locationId) => {
        Alert.alert(
            t('customer.newOrder.deleteLocation'),
            t('customer.newOrder.deleteLocationConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await locationsAPI.delete(locationId);
                            setLocations(locations.filter(loc => loc.id !== locationId));

                            // Clear selection if deleted location was selected
                            if (orderData.pickupLocationId === locationId) {
                                setOrderData(prev => ({ ...prev, pickupLocationId: null }));
                            }
                            if (orderData.deliveryLocationId === locationId) {
                                setOrderData(prev => ({ ...prev, deliveryLocationId: null }));
                            }

                            Alert.alert(t('common.success'), t('customer.newOrder.locationDeleted'));
                        } catch (error) {
                            console.error('[NewOrderScreen] Delete location error:', error);
                            Alert.alert(t('common.error'), t('customer.newOrder.failedDeleteLocation'));
                        }
                    }
                }
            ]
        );
    };

    // GPS Location Functions
    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === 'granted');

            if (status === 'granted') {
                getCurrentLocation();
            } else {
                Alert.alert(
                    t('common.permissionNeeded'),
                    t('customer.newOrder.permissionNeededMessage'),
                    [{ text: t('common.ok') }]
                );
            }
        } catch (error) {
            console.error('Permission error:', error);
        }
    };

    const getCurrentLocation = async () => {
        setFetchingLocation(true);
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            };

            setCurrentLocation(coords);
            setMarkerCoordinate(coords);

            // Set map region with appropriate zoom level
            const region = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.005,  // Closer zoom
                longitudeDelta: 0.005,
            };

            setMapRegion(region);

            // Auto-fill address via reverse geocoding
            reverseGeocode(coords);
        } catch (error) {
            console.error('Location error:', error);
            Alert.alert(
                t('customer.newOrder.locationError'),
                t('customer.newOrder.locationErrorMessage'),
                [{ text: t('common.ok') }]
            );
        } finally {
            setFetchingLocation(false);
        }
    };

    const reverseGeocode = async (coords) => {
        try {
            const result = await Location.reverseGeocodeAsync(coords);
            if (result[0]) {
                const addr = result[0];
                const formattedAddress = [
                    addr.street,
                    addr.name,
                    addr.city,
                    addr.region,
                    addr.postalCode
                ].filter(Boolean).join(', ');

                setNewLocation(prev => ({
                    ...prev,
                    address: formattedAddress,
                    latitude: coords.latitude,
                    longitude: coords.longitude
                }));
            }
        } catch (error) {
            console.warn('Reverse geocoding failed:', error);
            // Still save coordinates even if reverse geocoding fails
            setNewLocation(prev => ({
                ...prev,
                latitude: coords.latitude,
                longitude: coords.longitude
            }));
        }
    };

    const handleMapPress = (event) => {
        const coordinate = event.nativeEvent.coordinate;
        setMarkerCoordinate(coordinate);
        reverseGeocode(coordinate);
    };

    const handleMarkerDragEnd = (event) => {
        const coordinate = event.nativeEvent.coordinate;
        setMarkerCoordinate(coordinate);
        reverseGeocode(coordinate);
    };

    const handleOpenAddLocation = () => {
        setShowAddLocation(true);
        // Request location permission when modal opens
        requestLocationPermission();
    };

    const handleCloseAddLocation = () => {
        setShowAddLocation(false);
        setNewLocation({ label: '', address: '', latitude: null, longitude: null });
        setEditingLocationId(null);
        setMapRegion(null);
        setMarkerCoordinate(null);
        setCurrentLocation(null);
    };

    const renderAddLocationModal = () => (
        <Modal
            visible={showAddLocation}
            animationType="slide"
            transparent={false}
            onRequestClose={handleCloseAddLocation}
        >
            <View style={styles.modalContainer}>
                {/* Header */}
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={handleCloseAddLocation}>
                        <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalHeaderTitle}>
                        {editingLocationId ? t('customer.newOrder.editLocation') : t('customer.newOrder.addNewLocation')}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                    {/* Real-Time Map */}
                    <View style={styles.realMapContainer}>
                        {mapRegion && markerCoordinate ? (
                            <>
                                <MapView
                                    style={styles.realMap}
                                    initialRegion={mapRegion}
                                    region={mapRegion}
                                    showsUserLocation={true}
                                    showsMyLocationButton={false}
                                    showsCompass={true}
                                    zoomEnabled={true}
                                    scrollEnabled={true}
                                    pitchEnabled={false}
                                    rotateEnabled={false}
                                    loadingEnabled={true}
                                    loadingIndicatorColor={theme.colors.primary}
                                    onPress={handleMapPress}
                                >
                                    {markerCoordinate && markerCoordinate.latitude && markerCoordinate.longitude && (
                                        <Marker
                                            coordinate={markerCoordinate}
                                            title={t('customer.newOrder.deliveryLocation')}
                                            description={t('customer.newOrder.dragToAdjust')}
                                            pinColor={theme.colors.primary}
                                            draggable={true}
                                            onDragEnd={handleMarkerDragEnd}
                                        />
                                    )}
                                </MapView>
                                <View style={styles.accuracyBadge}>
                                    <MaterialCommunityIcons name="crosshairs-gps" size={12} color={theme.colors.success} />
                                    <Text style={styles.accuracyText}>GPS Active</Text>
                                </View>
                                {markerCoordinate && typeof markerCoordinate.latitude === 'number' && typeof markerCoordinate.longitude === 'number' && (
                                    <View style={styles.coordsOverlay}>
                                        <Text style={styles.coordsOverlayText}>
                                            ðŸ“ {markerCoordinate.latitude.toFixed(6)}, {markerCoordinate.longitude.toFixed(6)}
                                        </Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={styles.mapLoadingContainer}>
                                <ActivityIndicator
                                    size="large"
                                    color={theme.colors.primary}
                                    style={{ marginBottom: theme.spacing.md }}
                                />
                                <MaterialCommunityIcons
                                    name="map-marker-outline"
                                    size={64}
                                    color={theme.colors.textTertiary}
                                />
                                <Text style={styles.mapLoadingText}>
                                    {fetchingLocation ? 'Detecting your location...' : 'Tap GPS button to detect location'}
                                </Text>
                            </View>
                        )}

                        {/* GPS Detection Button */}
                        <TouchableOpacity
                            style={styles.gpsFloatingButton}
                            onPress={getCurrentLocation}
                            disabled={fetchingLocation}
                        >
                            {fetchingLocation ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <MaterialCommunityIcons
                                    name="crosshairs-gps"
                                    size={24}
                                    color="#fff"
                                />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Map Instructions */}
                    {mapRegion && markerCoordinate && (
                        <View style={styles.mapInstructionBanner}>
                            <MaterialCommunityIcons name="gesture-tap" size={18} color={theme.colors.info} />
                            <Text style={styles.mapInstructionText}>
                                Tap map or drag marker to adjust position
                            </Text>
                        </View>
                    )}

                    {/* Form Fields */}
                    <View style={styles.formContainer}>
                        <Text style={styles.formLabel}>Label</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder={t('customer.newOrder.placeholderLabel')}
                            placeholderTextColor={theme.colors.textTertiary}
                            value={newLocation.label}
                            onChangeText={(text) => setNewLocation({ ...newLocation, label: text })}
                        />

                        <Text style={styles.formLabel}>Address</Text>
                        <TextInput
                            style={[styles.modalInput, styles.addressInput]}
                            placeholder={t('customer.newOrder.placeholderAddress')}
                            placeholderTextColor={theme.colors.textTertiary}
                            value={newLocation.address}
                            onChangeText={(text) => setNewLocation({ ...newLocation, address: text })}
                            multiline
                            numberOfLines={3}
                        />

                        {markerCoordinate && (
                            <View style={styles.coordinatesInfo}>
                                <MaterialCommunityIcons name="map-marker-check" size={16} color={theme.colors.success} />
                                <Text style={styles.coordinatesText}>
                                    GPS coordinates saved
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalActionButton, styles.saveLocationButton]}
                            onPress={handleAddLocation}
                            disabled={addingLocation}
                        >
                            {addingLocation ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                                    <Text style={styles.saveLocationButtonText}>
                                        {editingLocationId ? 'Update Location' : 'Save Location'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View >
        </Modal >
    );

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Items</Text>
            <Text style={styles.stepSubtitle}>Choose the items you want to clean</Text>

            {/* Express Service Toggle - MOVED TO TOP */}
            <TouchableOpacity
                style={styles.expressToggle}
                onPress={() => setOrderData({ ...orderData, isExpress: !orderData.isExpress })}
            >
                <View style={styles.expressInfo}>
                    <MaterialCommunityIcons name="flash" size={24} color={theme.colors.warning} />
                    <View>
                        <Text style={styles.expressTitle}>Express Service</Text>
                        <Text style={styles.expressSubtitle}>24-hour delivery (+20%)</Text>
                    </View>
                </View>
                <View style={[styles.toggle, orderData.isExpress && styles.toggleActive]}>
                    <View style={[styles.toggleThumb, orderData.isExpress && styles.toggleThumbActive]} />
                </View>
            </TouchableOpacity>

            {/* Selected Items Indicator */}
            {orderData.items.length > 0 && (
                <View style={styles.selectedItemsContainer}>
                    <Text style={styles.selectedItemsTitle}>
                        Selected ({orderData.items.length} {orderData.items.length === 1 ? 'item' : 'items'})
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.selectedItemsScroll}
                        contentContainerStyle={styles.selectedItemsContent}
                    >
                        {orderData.items.map((item) => {
                            const category = categories.find(c => c.id === item.categoryId);
                            if (!category) return null;

                            return (
                                <View key={item.categoryId} style={styles.selectedItemChip}>
                                    <Text style={styles.selectedItemName}>{category.name}</Text>
                                    <View style={styles.selectedItemBadge}>
                                        <Text style={styles.selectedItemQuantity}>Ã—{item.quantity}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => toggleItem(item.categoryId)}
                                        style={styles.selectedItemRemove}
                                    >
                                        <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.error} />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            <View style={styles.categoryList}>
                {['Clothing', 'Household', 'Accessories'].map(group => (
                    groupedItems[group]?.length > 0 && (
                        <View key={group} style={{ marginBottom: theme.spacing.lg }}>
                            <Text style={{
                                fontSize: 18,
                                fontWeight: 'bold',
                                color: theme.colors.text,
                                marginBottom: theme.spacing.sm,
                                marginTop: theme.spacing.sm
                            }}>
                                {group}
                            </Text>
                            {groupedItems[group].map((category) => {
                                const isSelected = orderData.items.some(item => item.categoryId === category.id);
                                const selectedItem = orderData.items.find(item => item.categoryId === category.id);

                                return (
                                    <TouchableOpacity
                                        key={category.id}
                                        ref={ref => categoryRefs.current[category.id] = ref}
                                        style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
                                        onPress={() => toggleItem(category.id)}
                                    >
                                        <View style={styles.categoryInfo}>
                                            <View style={styles.categoryIconContainer}>
                                                {(() => {
                                                    const normalizedName = category.name.toLowerCase();
                                                    let gifSource = null;

                                                    if (normalizedName.includes('shirt') && !normalizedName.includes('t-shirt') && !normalizedName.includes('sweat')) {
                                                        gifSource = require('../../../assets/images/shirt.gif');
                                                    } else if (normalizedName.includes('t-shirt')) {
                                                        gifSource = require('../../../assets/images/t-shirt.gif');
                                                    } else if (normalizedName.includes('polo')) {
                                                        gifSource = require('../../../assets/images/polo.gif');
                                                    } else if (normalizedName.includes('pants') || normalizedName.includes('trouser') || normalizedName.includes('pantalon') || normalizedName.includes('jean')) {
                                                        gifSource = require('../../../assets/images/pants.gif');
                                                    } else if (normalizedName.includes('dress')) {
                                                        gifSource = require('../../../assets/images/dress (1).gif');
                                                    } else if (normalizedName.includes('baby') || normalizedName.includes('bÃ©bÃ©')) {
                                                        gifSource = require('../../../assets/images/baby-clothes.gif');
                                                    } else if (normalizedName.includes('bed') || normalizedName.includes('drap')) { // Bedsheet
                                                        gifSource = require('../../../assets/images/bed.gif');
                                                    } else if (normalizedName.includes('combinaison') || normalizedName.includes('coverall')) {
                                                        gifSource = require('../../../assets/images/coverall (1).gif');
                                                    } else if (normalizedName.includes('curtain') || normalizedName.includes('rideau')) {
                                                        gifSource = require('../../../assets/images/curtain.gif');
                                                    } else if (normalizedName.includes('sweatshirt')) {
                                                        gifSource = require('../../../assets/images/hooded-sweatshirt.gif');
                                                    } else if (normalizedName.includes('leather') || normalizedName.includes('cuir')) {
                                                        gifSource = require('../../../assets/images/leather-jacket.gif');
                                                    } else if (normalizedName.includes('coat') || normalizedName.includes('manteau') || normalizedName.includes('jacket')) {
                                                        gifSource = require('../../../assets/images/jacket.gif');
                                                    } else if (normalizedName.includes('panties') || normalizedName.includes('culotte')) {
                                                        gifSource = require('../../../assets/images/panties.gif');
                                                    } else if (normalizedName.includes('pillow') || normalizedName.includes('oreiller')) {
                                                        gifSource = require('../../../assets/images/pillow.gif');
                                                    } else if (normalizedName.includes('shoe') || normalizedName.includes('chaussure')) {
                                                        gifSource = require('../../../assets/images/shoes (1).gif');
                                                    } else if (normalizedName.includes('short')) {
                                                        gifSource = require('../../../assets/images/short.gif');
                                                    } else if (normalizedName.includes('skirt') || normalizedName.includes('jupe')) {
                                                        gifSource = require('../../../assets/images/skirt.gif');
                                                    } else if (normalizedName.includes('sock') || normalizedName.includes('chaussette')) {
                                                        gifSource = require('../../../assets/images/socks (1).gif');
                                                    } else if (normalizedName.includes('sweater') || normalizedName.includes('pull')) {
                                                        gifSource = require('../../../assets/images/sweater.gif');
                                                    } else if (normalizedName.includes('towel') || normalizedName.includes('serviette')) {
                                                        gifSource = require('../../../assets/images/towels.gif');
                                                    } else if (normalizedName.includes('vest') || normalizedName.includes('gilet')) {
                                                        gifSource = require('../../../assets/images/vest.gif');
                                                    } else if (normalizedName.includes('hoodie')) {
                                                        gifSource = require('../../../assets/images/hoodie.gif');
                                                    } else if (normalizedName.includes('tie') || normalizedName.includes('cravate')) {
                                                        gifSource = require('../../../assets/images/professionality.gif');
                                                    } else if (normalizedName.includes('uniform') || normalizedName.includes('officer') || normalizedName.includes('officier')) {
                                                        gifSource = require('../../../assets/images/customs-officer.gif');
                                                    } else if (normalizedName.includes('suit') || normalizedName.includes('costume')) {
                                                        gifSource = require('../../../assets/images/suit.gif');
                                                    } else if (normalizedName.includes('underwear') || normalizedName.includes('sous-vÃªtement')) {
                                                        gifSource = require('../../../assets/images/bikini.gif');
                                                    } else if (normalizedName.includes('sportswear') || normalizedName.includes('sport')) {
                                                        gifSource = require('../../../assets/images/basketball-equipment.gif');
                                                    }

                                                    if (gifSource) {
                                                        return (
                                                            <Image
                                                                source={gifSource}
                                                                style={{ width: 40, height: 40 }}
                                                                contentFit="contain"
                                                                cachePolicy="memory-disk"
                                                            />
                                                        );
                                                    }

                                                    // Fallback to MaterialCommunityIcons
                                                    return (
                                                        <MaterialCommunityIcons
                                                            name={getClothingIcon(category.icon_name)}
                                                            size={32}
                                                            color={isSelected ? theme.colors.primary : theme.colors.text}
                                                        />
                                                    );
                                                })()}
                                            </View>
                                            <View style={styles.categoryText}>
                                                <Text style={[styles.categoryName, isSelected && styles.textSelected]}>
                                                    {category.name}
                                                </Text>
                                                <Text style={styles.categoryPrice}>
                                                    ${parseFloat(category.base_price).toFixed(2)}
                                                    {orderData.isExpress && ` â†’ $${parseFloat(category.express_price).toFixed(2)}`}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Checkmark indicator when selected */}
                                        {isSelected && !selectedItem && (
                                            <View style={styles.checkmarkContainer}>
                                                <MaterialCommunityIcons
                                                    name="check-circle"
                                                    size={24}
                                                    color={theme.colors.success}
                                                />
                                            </View>
                                        )}

                                        {isSelected && selectedItem && (
                                            <View style={styles.quantityControl}>
                                                <TouchableOpacity
                                                    onPress={() => updateItemQuantity(category.id, Math.max(1, selectedItem.quantity - 1))}
                                                    style={styles.quantityButton}
                                                >
                                                    <MaterialCommunityIcons name="minus" size={20} color={theme.colors.primary} />
                                                </TouchableOpacity>
                                                <Text style={styles.quantityText}>{selectedItem.quantity}</Text>
                                                <TouchableOpacity
                                                    onPress={() => updateItemQuantity(category.id, selectedItem.quantity + 1)}
                                                    style={styles.quantityButton}
                                                >
                                                    <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )
                ))}
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Locations</Text>
            <Text style={styles.stepSubtitle}>Select pickup and delivery locations</Text>

            {/* Info Banner */}
            <View style={styles.locationInfoBanner}>
                <MaterialCommunityIcons name="information" size={20} color={theme.colors.info} />
                <Text style={styles.locationInfoText}>
                    You can choose the same address or different addresses for pickup and delivery
                </Text>
            </View>

            {locations.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="map-marker-outline" size={48} color={theme.colors.textTertiary} />
                    <Text style={styles.emptyText}>No saved locations</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleOpenAddLocation}
                    >
                        <Text style={styles.addButtonText}>Add Location</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    {/* Manage Locations Section */}
                    <View style={styles.manageLocationsSection}>
                        <Text style={styles.manageLocationsTitle}>Manage Locations</Text>
                        <TouchableOpacity
                            style={styles.addLocationButtonTop}
                            onPress={handleOpenAddLocation}
                        >
                            <MaterialCommunityIcons name="plus-circle" size={20} color={theme.colors.primary} />
                            <Text style={styles.addLocationButtonText}>{t('customer.newOrder.addNewLocation')}</Text>
                        </TouchableOpacity>

                        {/* Location Management List */}
                        {locations.map((location) => (
                            <View key={`manage-${location.id}`} style={styles.manageLocationItem}>
                                <View style={styles.manageLocationInfo}>
                                    <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
                                    <View style={styles.locationText}>
                                        <Text style={styles.locationLabel}>{location.label}</Text>
                                        <Text style={styles.locationAddress} numberOfLines={1}>{location.address}</Text>
                                    </View>
                                </View>
                                <View style={styles.locationActions}>
                                    <TouchableOpacity
                                        style={styles.locationActionButton}
                                        onPress={() => handleDuplicateLocation(location)}
                                    >
                                        <MaterialCommunityIcons name="content-copy" size={18} color={theme.colors.info} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.locationActionButton}
                                        onPress={() => handleEditLocation(location)}
                                    >
                                        <MaterialCommunityIcons name="pencil" size={18} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.locationActionButton}
                                        onPress={() => handleDeleteLocation(location.id)}
                                    >
                                        <MaterialCommunityIcons name="delete" size={18} color={theme.colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Pickup Location Selection */}
                    <Text style={styles.sectionLabel}>Pickup Location</Text>
                    {locations.map((location) => (
                        <TouchableOpacity
                            key={`pickup-${location.id}`}
                            style={[
                                styles.locationItem,
                                orderData.pickupLocationId === location.id && styles.locationItemSelected,
                            ]}
                            onPress={() => setOrderData({ ...orderData, pickupLocationId: location.id })}
                        >
                            <MaterialCommunityIcons
                                name={orderData.pickupLocationId === location.id ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                                size={24}
                                color={orderData.pickupLocationId === location.id ? theme.colors.primary : theme.colors.textSecondary}
                            />
                            <View style={styles.locationText}>
                                <Text style={styles.locationLabel}>{location.label}</Text>
                                <Text style={styles.locationAddress}>{location.address}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {/* Delivery Location Selection */}
                    <Text style={[styles.sectionLabel, { marginTop: theme.spacing.lg }]}>{t('customer.newOrder.deliveryLocation')}</Text>
                    {locations.map((location) => (
                        <TouchableOpacity
                            key={`delivery-${location.id}`}
                            style={[
                                styles.locationItem,
                                orderData.deliveryLocationId === location.id && styles.locationItemSelected,
                            ]}
                            onPress={() => setOrderData({ ...orderData, deliveryLocationId: location.id })}
                        >
                            <MaterialCommunityIcons
                                name={orderData.deliveryLocationId === location.id ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                                size={24}
                                color={orderData.deliveryLocationId === location.id ? theme.colors.primary : theme.colors.textSecondary}
                            />
                            <View style={styles.locationText}>
                                <Text style={styles.locationLabel}>{location.label}</Text>
                                <Text style={styles.locationAddress}>{location.address}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Pickup Schedule</Text>
            <Text style={styles.stepSubtitle}>When should we pick up your laundry?</Text>

            {/* Pickup Type Selection */}
            <View style={styles.pickupTypeContainer}>
                <TouchableOpacity
                    style={[
                        styles.pickupTypeCard,
                        orderData.pickupType === 'immediate' && styles.pickupTypeCardActive,
                    ]}
                    onPress={() => setOrderData({ ...orderData, pickupType: 'immediate', pickupScheduledAt: null })}
                >
                    <MaterialCommunityIcons
                        name="flash"
                        size={32}
                        color={orderData.pickupType === 'immediate' ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.pickupTypeTitle, orderData.pickupType === 'immediate' && styles.textSelected]}>
                        Pick Up Now
                    </Text>
                    <Text style={styles.pickupTypeDesc}>Driver will be assigned immediately</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.pickupTypeCard,
                        orderData.pickupType === 'scheduled' && styles.pickupTypeCardActive,
                    ]}
                    onPress={() => setOrderData({ ...orderData, pickupType: 'scheduled' })}
                >
                    <MaterialCommunityIcons
                        name="calendar"
                        size={32}
                        color={orderData.pickupType === 'scheduled' ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.pickupTypeTitle, orderData.pickupType === 'scheduled' && styles.textSelected]}>
                        Schedule Pickup
                    </Text>
                    <Text style={styles.pickupTypeDesc}>Choose a specific date and time</Text>
                </TouchableOpacity>
            </View>

            {/* Date/Time Selection for Scheduled */}
            {orderData.pickupType === 'scheduled' && (
                <View style={styles.scheduleSection}>
                    {/* Step 1: Select Date */}
                    <View style={styles.scheduleStep}>
                        <Text style={styles.scheduleStepLabel}>1. Select Pickup Date</Text>
                        <TouchableOpacity
                            style={styles.dateSelectButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary} />
                            <Text style={[styles.dateSelectText, selectedDate && styles.dateSelectedText]}>
                                {selectedDate
                                    ? selectedDate.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })
                                    : 'Choose a date'}
                            </Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={selectedDate || getMinimumDate()}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                                minimumDate={getMinimumDate()}
                            />
                        )}
                    </View>

                    {/* Step 2: Select Time Slot */}
                    {selectedDate && (
                        <View style={styles.scheduleStep}>
                            <Text style={styles.scheduleStepLabel}>2. Select Time Slot</Text>
                            <View style={styles.timeSlotsContainer}>
                                {timeSlots.map((slot) => (
                                    <TouchableOpacity
                                        key={slot.id}
                                        style={[
                                            styles.timeSlotCard,
                                            selectedTimeSlot?.id === slot.id && styles.timeSlotCardActive,
                                        ]}
                                        onPress={() => handleTimeSlotSelect(slot)}
                                    >
                                        <MaterialCommunityIcons
                                            name="clock-outline"
                                            size={24}
                                            color={selectedTimeSlot?.id === slot.id ? theme.colors.primary : theme.colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.timeSlotLabel,
                                            selectedTimeSlot?.id === slot.id && styles.timeSlotLabelActive,
                                        ]}>
                                            {slot.label}
                                        </Text>
                                        <Text style={styles.timeSlotTime}>{slot.time}</Text>
                                        {selectedTimeSlot?.id === slot.id && (
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={20}
                                                color={theme.colors.primary}
                                                style={styles.timeSlotCheck}
                                            />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Confirmation */}
                    {orderData.pickupScheduledAt && (
                        <View style={styles.scheduleConfirmation}>
                            <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.success} />
                            <View style={styles.scheduleConfirmationText}>
                                <Text style={styles.scheduleConfirmationTitle}>Pickup Scheduled</Text>
                                <Text style={styles.scheduleConfirmationDetail}>
                                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    {' â€¢ '}
                                    {selectedTimeSlot?.time}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Business Hours Info */}
                    <View style={styles.businessHoursInfo}>
                        <MaterialCommunityIcons name="information" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.businessHoursText}>
                            We operate {businessHours.openTime}AM - {businessHours.closeTime}PM, Monday to Saturday
                        </Text>
                    </View>
                </View>
            )}

            {/* Special Instructions */}
            <View style={styles.instructionsSection}>
                <Text style={styles.sectionLabel}>Special Instructions (Optional)</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Add any special instructions for the driver..."
                    placeholderTextColor={theme.colors.textTertiary}
                    value={orderData.specialInstructions}
                    onChangeText={(text) => setOrderData({ ...orderData, specialInstructions: text })}
                    multiline
                    numberOfLines={4}
                />
            </View>

            {/* Order Comment */}
            <View style={styles.instructionsSection}>
                <Text style={styles.sectionLabel}>Order Comment (Optional)</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="General order notes (e.g., 'Need by Friday for wedding')"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={orderComment}
                    onChangeText={setOrderComment}
                    multiline
                    numberOfLines={3}
                />
            </View>

            {/* Item Comment */}
            <View style={styles.instructionsSection}>
                <Text style={styles.sectionLabel}>Item Notes (Optional)</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Specific item notes (e.g., 'Red wine stain on blue shirt sleeve')"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={itemComment}
                    onChangeText={setItemComment}
                    multiline
                    numberOfLines={3}
                />
            </View>

            {/* Photo Capture */}
            <PhotoCapture
                photos={orderPhotos}
                onPhotosChange={setOrderPhotos}
                maxPhotos={5}
            />
        </View>
    );

    const renderStep4 = () => {
        const pricing = calculateTotal();

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Payment & Review</Text>
                <Text style={styles.stepSubtitle}>Review your order and select payment method</Text>

                {/* Order Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Order Summary</Text>

                    {orderData.items.map((item) => {
                        const category = categories.find(c => c.id === item.categoryId);
                        if (!category) return null;

                        return (
                            <View key={item.categoryId} style={styles.summaryItem}>
                                <Text style={styles.summaryItemText}>
                                    {category.name} x{item.quantity}
                                </Text>
                                <Text style={styles.summaryItemPrice}>
                                    ${((orderData.isExpress ? category.express_price : category.base_price) * item.quantity).toFixed(2)}
                                </Text>
                            </View>
                        );
                    })}

                    <View style={styles.divider} />

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemText}>Subtotal</Text>
                        <Text style={styles.summaryItemPrice}>${pricing.subtotal.toFixed(2)}</Text>
                    </View>

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemText}>Delivery Fee</Text>
                        <Text style={styles.summaryItemPrice}>${pricing.deliveryFee.toFixed(2)}</Text>
                    </View>

                    {orderData.isExpress && (
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryItemText}>Express Fee</Text>
                            <Text style={styles.summaryItemPrice}>${pricing.expressFee.toFixed(2)}</Text>
                        </View>
                    )}

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemText}>Tax (10%)</Text>
                        <Text style={styles.summaryItemPrice}>${pricing.tax.toFixed(2)}</Text>
                    </View>

                    <View style={[styles.divider, { marginVertical: theme.spacing.sm }]} />

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryTotal}>Total</Text>
                        <Text style={styles.summaryTotalPrice}>${pricing.total.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Payment Method */}
                <View style={styles.paymentSection}>
                    <Text style={styles.sectionLabel}>Payment Method</Text>

                    {/* Cash on Delivery */}
                    <TouchableOpacity
                        style={[
                            styles.paymentOption,
                            orderData.paymentMethod === 'cash' && styles.paymentOptionSelected,
                        ]}
                        onPress={() => setOrderData({ ...orderData, paymentMethod: 'cash' })}
                    >
                        <MaterialCommunityIcons
                            name="cash"
                            size={24}
                            color={orderData.paymentMethod === 'cash' ? theme.colors.primary : theme.colors.textSecondary}
                        />
                        <Text style={[
                            styles.paymentText,
                            orderData.paymentMethod === 'cash' && styles.textSelected,
                        ]}>
                            Cash on Delivery
                        </Text>
                        {orderData.paymentMethod === 'cash' && (
                            <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.primary} />
                        )}
                    </TouchableOpacity>

                    {/* Airtel Money - Disabled */}
                    <View style={[styles.paymentOption, styles.paymentOptionDisabled]}>
                        <Image
                            source={require('../../../assets/images/airtel_logo.png')}
                            style={styles.paymentLogo}
                            resizeMode="contain"
                        />
                        <Text style={[styles.paymentText, styles.paymentTextDisabled]}>
                            Airtel Money
                        </Text>
                        <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>BientÃ´t Disponible</Text>
                        </View>
                    </View>

                    {/* Moov Money - Disabled */}
                    <View style={[styles.paymentOption, styles.paymentOptionDisabled]}>
                        <Image
                            source={require('../../../assets/images/moov_money_logo.png')}
                            style={styles.paymentLogo}
                            resizeMode="contain"
                        />
                        <Text style={[styles.paymentText, styles.paymentTextDisabled]}>
                            Moov Money
                        </Text>
                        <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>BientÃ´t Disponible</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
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
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Order</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
                {[1, 2, 3, 4].map((s) => (
                    <View key={s} style={[styles.progressDot, s <= step && styles.progressDotActive]} />
                ))}
            </View>

            {/* Content */}
            {/* Content */}
            <ScrollView
                ref={scrollRef}
                style={styles.content}
                onContentSizeChange={handleContentSizeChange}
            >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
                {step > 1 && (
                    <TouchableOpacity
                        style={[styles.footerButton, styles.backFooterButton]}
                        onPress={() => setStep(step - 1)}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                )}

                {step < 4 ? (
                    <TouchableOpacity
                        style={[styles.footerButton, styles.nextButton, step === 1 && { flex: 1 }]}
                        onPress={() => setStep(step + 1)}
                        disabled={step === 1 && orderData.items.length === 0}
                    >
                        <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.footerButton, styles.submitButton]}
                        onPress={handleSubmitOrder}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Place Order</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
            {renderAddLocationModal()}

            {/* Receipt Modal */}
            {showReceipt && createdOrder && (
                <OrderReceipt
                    order={createdOrder}
                    visible={showReceipt}
                    onClose={() => {
                        setShowReceipt(false);
                        navigation.navigate('Orders');
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    progressDot: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.border,
    },
    progressDotActive: {
        backgroundColor: theme.colors.primary,
    },
    content: {
        flex: 1,
    },
    stepContent: {
        padding: theme.spacing.lg,
    },
    stepTitle: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    stepSubtitle: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    categoryList: {
        marginBottom: theme.spacing.md,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryItemSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIconContainer: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryText: {
        marginLeft: theme.spacing.md,
    },
    categoryName: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
    },
    categoryPrice: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    textSelected: {
        color: theme.colors.primary,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    quantityButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityText: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.primary,
        minWidth: 24,
        textAlign: 'center',
    },
    expressToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        ...theme.shadows.sm,
    },
    expressInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    expressTitle: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
    },
    expressSubtitle: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.border,
        padding: 2,
        justifyContent: 'center',
    },
    toggleActive: {
        backgroundColor: theme.colors.primary,
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },
    sectionLabel: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    locationItemSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    locationText: {
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    locationLabel: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
    },
    locationAddress: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    locationItemWrapper: {
        marginBottom: theme.spacing.sm,
    },
    locationActions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.xs,
        justifyContent: 'flex-end',
    },
    locationActionButton: {
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    addLocationButtonTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        borderStyle: 'dashed',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    addLocationButtonText: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.primary,
    },
    locationInfoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.info + '15',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.info,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    locationInfoText: {
        flex: 1,
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.text,
        lineHeight: 20,
    },
    manageLocationsSection: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    manageLocationsTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    manageLocationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    manageLocationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    pickupTypeContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    pickupTypeCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    pickupTypeCardActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    pickupTypeTitle: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
    },
    pickupTypeDesc: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        textAlign: 'center',
    },
    scheduleSection: {
        marginBottom: theme.spacing.lg,
    },
    scheduleStep: {
        marginBottom: theme.spacing.lg,
    },
    scheduleStepLabel: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    dateSelectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        borderWidth: 2,
        borderColor: theme.colors.border,
        gap: theme.spacing.sm,
    },
    dateSelectText: {
        flex: 1,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
    },
    dateSelectedText: {
        color: theme.colors.text,
        fontWeight: theme.fonts.weights.medium,
    },
    timeSlotsContainer: {
        gap: theme.spacing.sm,
    },
    timeSlotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },
    timeSlotCardActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    timeSlotLabel: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
        marginLeft: theme.spacing.sm,
        flex: 1,
    },
    timeSlotLabelActive: {
        color: theme.colors.primary,
    },
    timeSlotTime: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
    },
    timeSlotCheck: {
        position: 'absolute',
        top: theme.spacing.sm,
        right: theme.spacing.sm,
    },
    scheduleConfirmation: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success + '15',
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.success,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    scheduleConfirmationText: {
        flex: 1,
    },
    scheduleConfirmationTitle: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    scheduleConfirmationDetail: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
    },
    businessHoursInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.sm,
    },
    businessHoursText: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: theme.spacing.lg,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        width: '100%',
        ...theme.shadows.lg,
    },
    modalTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginTop: theme.spacing.md,
    },
    modalButton: {
        flex: 1,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
    },
    cancelButtonText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    addButton: {
        marginTop: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    datePickerSection: {
        marginBottom: theme.spacing.lg,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
        ...theme.shadows.sm,
    },
    datePickerText: {
        flex: 1,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
    },
    scheduleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.info + '10',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        marginTop: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    scheduleInfoText: {
        flex: 1,
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.info,
    },
    instructionsSection: {
        marginTop: theme.spacing.md,
    },
    textArea: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    summaryCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.md,
    },
    summaryTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    summaryItemText: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
    },
    summaryItemPrice: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        fontWeight: theme.fonts.weights.medium,
    },
    summaryTotal: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
    },
    summaryTotalPrice: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.sm,
    },
    paymentSection: {
        marginTop: theme.spacing.md,
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: theme.spacing.md,
    },
    paymentOptionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    paymentText: {
        flex: 1,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        fontWeight: theme.fonts.weights.medium,
    },
    paymentOptionDisabled: {
        opacity: 0.6,
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
    },
    paymentTextDisabled: {
        color: theme.colors.textSecondary,
    },
    paymentLogo: {
        width: 28,
        height: 28,
    },
    comingSoonBadge: {
        backgroundColor: theme.colors.warning + '20',
        borderRadius: theme.borderRadius.full,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.warning,
    },
    comingSoonText: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.warning,
        fontWeight: theme.fonts.weights.semibold,
    },
    footer: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        gap: theme.spacing.md,
        ...theme.shadows.lg,
    },
    footerButton: {
        flex: 1,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backFooterButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    backButtonText: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
    },
    nextButton: {
        backgroundColor: theme.colors.primary,
    },
    nextButtonText: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: '#fff',
    },
    submitButton: {
        backgroundColor: theme.colors.success,
    },
    submitButtonText: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: '#fff',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    emptyText: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
    },
    addButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
    },
    checkmarkContainer: {
        position: 'absolute',
        top: theme.spacing.sm,
        right: theme.spacing.sm,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 2,
    },
    selectedItemsContainer: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
    },
    selectedItemsTitle: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.primary,
        marginBottom: theme.spacing.sm,
    },
    selectedItemsScroll: {
        flexGrow: 0,
    },
    selectedItemsContent: {
        gap: theme.spacing.sm,
    },
    selectedItemChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.xs,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        gap: theme.spacing.xs,
    },
    selectedItemName: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.text,
        fontWeight: theme.fonts.weights.medium,
    },
    selectedItemBadge: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
    },
    selectedItemQuantity: {
        fontSize: theme.fonts.sizes.xs,
        color: '#fff',
        fontWeight: theme.fonts.weights.bold,
    },
    selectedItemRemove: {
        padding: theme.spacing.xs,
    },
    // GPS Location Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
    },
    modalHeaderTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
    },
    modalScroll: {
        flex: 1,
    },
    realMapContainer: {
        height: 320,
        backgroundColor: theme.colors.surface,
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    realMap: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    mapLoadingContainer: {
        flex: 1,
        height: 320,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    mapLoadingText: {
        marginTop: theme.spacing.md,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    gpsFloatingButton: {
        position: 'absolute',
        right: theme.spacing.lg,
        bottom: theme.spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    accuracyBadge: {
        position: 'absolute',
        top: theme.spacing.md,
        left: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.md,
        gap: 4,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    accuracyText: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.success,
        fontWeight: theme.fonts.weights.semibold,
    },
    coordsOverlay: {
        position: 'absolute',
        bottom: 80,
        left: theme.spacing.md,
        right: theme.spacing.md,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    coordsOverlayText: {
        fontSize: theme.fonts.sizes.xs,
        color: '#fff',
        fontFamily: 'monospace',
    },
    formContainer: {
        padding: theme.spacing.lg,
    },
    formLabel: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    addressInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    coordinatesInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success + '10',
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.md,
        gap: theme.spacing.xs,
    },
    coordinatesText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.success,
        fontWeight: theme.fonts.weights.medium,
    },
    modalActions: {
        padding: theme.spacing.lg,
        paddingTop: 0,
        marginBottom: theme.spacing.xl,
    },
    modalActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    saveLocationButton: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.md,
    },
    saveLocationButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
    },
    // Footer navigation styles
    footer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    footerButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backFooterButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    backButtonText: {
        color: theme.colors.text,
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
    },
    nextButton: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.md,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.bold,
    },
    submitButton: {
        backgroundColor: theme.colors.success,
        ...theme.shadows.md,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.bold,
    },
    mapInstructionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.info + '15',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    mapInstructionText: {
        flex: 1,
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.info,
        fontWeight: theme.fonts.weights.medium,
    },
});

export default NewOrderScreen;
