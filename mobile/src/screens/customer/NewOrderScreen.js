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
    Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NativeMapPicker from '../../components/map/NativeMapPicker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { categoriesAPI, ordersAPI, locationsAPI, couponsAPI, pointsAPI, API_BASE } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isOnline } from '../../services/syncService';
import { buildOfflineOrder, buildOfflineQRContent } from '../../utils/orderCode';
import { saveOfflineOrder } from '../../db/localDB';
import theme from '../../theme/theme';

// ─── GIF icon map (mirrors HomeScreen / GuestHomeScreen) ──────────────────────
const GIF_ICONS = {
    'human-male':           require('../../../assets/images/ensemble Homme.gif'),
    'human-female':         require('../../../assets/images/ensemble Dame.gif'),
    'human':                require('../../../assets/images/debardeur.gif'),
    'briefcase':            require('../../../assets/images/suit.gif'),
    'tshirt-crew':          require('../../../assets/images/t-shirt.gif'),
    'tshirt-crew-outline':  require('../../../assets/images/long-sleeves.gif'),
    'underwear':            require('../../../assets/images/short.gif'),
    'coat':                 require('../../../assets/images/peignoir-de-bain.gif'),
    'towel':                require('../../../assets/images/towels.gif'),
    'shirt':                require('../../../assets/images/shirt.gif'),
    't-shirt':              require('../../../assets/images/t-shirt.gif'),
    'polo':                 require('../../../assets/images/polo.gif'),
    'vest':                 require('../../../assets/images/vest.gif'),
    'long-sleeves':         require('../../../assets/images/long-sleeves.gif'),
    'sweater':              require('../../../assets/images/sweater.gif'),
    'hoodie':               require('../../../assets/images/hoodie.gif'),
    'jacket':               require('../../../assets/images/jacket.gif'),
    'leather':              require('../../../assets/images/leather-jacket.gif'),
    'pants':                require('../../../assets/images/pants.gif'),
    'short':                require('../../../assets/images/short.gif'),
    'skirt':                require('../../../assets/images/skirt.gif'),
    'dress':                require('../../../assets/images/dress.gif'),
    'suit':                 require('../../../assets/images/suit.gif'),
    'tuxedo':               require('../../../assets/images/tuxedo.gif'),
    'coverall':             require('../../../assets/images/coverall.gif'),
    'clothes':              require('../../../assets/images/clothes.gif'),
    'towels':               require('../../../assets/images/towels.gif'),
    'bed':                  require('../../../assets/images/bed.gif'),
    'curtain':              require('../../../assets/images/curtain.gif'),
    'socks':                require('../../../assets/images/socks.gif'),
    'bra':                  require('../../../assets/images/bra.gif'),
    'bikini':               require('../../../assets/images/bikini.gif'),
    'boxer':                require('../../../assets/images/boxer-shorts.gif'),
    'ensemble-dame':        require('../../../assets/images/ensemble Dame.gif'),
    'ensemble-homme':       require('../../../assets/images/ensemble Homme.gif'),
    'debardeur':            require('../../../assets/images/debardeur.gif'),
    'pantalon-dame':        require('../../../assets/images/pantalon dame.gif'),
    'jupe-plisse':          require('../../../assets/images/jupe plisse.gif'),
    'robe-simple':          require('../../../assets/images/robe simple.gif'),
    'robe-de-mariee':       require('../../../assets/images/robe de mariage.gif'),
    'robe-soiree':          require('../../../assets/images/robe de soirée.gif'),
    'peignoir':             require('../../../assets/images/peignoir-de-bain.gif'),
    'paire-de-drap':        require('../../../assets/images/Paire de drap.gif'),
    'customs-officer':      require('../../../assets/images/customs-officer.gif'),
};
const DEFAULT_GIF = require('../../../assets/images/clothes.gif');


const getGif = (iconName, categoryName, gifUrl) => {
    if (gifUrl) return { uri: `${API_BASE}${gifUrl}` };
    const n = (categoryName || '').toLowerCase();
    if (n.includes('mariage'))                              return GIF_ICONS['robe-de-mariee'];
    if (n.includes('soirée') || n.includes('soiree'))      return GIF_ICONS['robe-soiree'];
    if (n.includes('robe'))                                 return GIF_ICONS['robe-simple'];
    if (n.includes('ensemble') && n.includes('homme'))      return GIF_ICONS['ensemble-homme'];
    if (n.includes('ensemble') && n.includes('dame'))       return GIF_ICONS['ensemble-dame'];
    if (n.includes('ensemble'))                             return GIF_ICONS['ensemble-homme'];
    if (n.includes('pantalon') && n.includes('dame'))       return GIF_ICONS['pantalon-dame'];
    if (n.includes('jupe') && n.includes('pliss'))          return GIF_ICONS['jupe-plisse'];
    if (n.includes('paire') && n.includes('drap'))          return GIF_ICONS['paire-de-drap'];
    if (n.includes('peignoir'))                             return GIF_ICONS['peignoir'];
    if (n.includes('combinaison'))                          return GIF_ICONS['coverall'];
    if (n.includes('costume'))                              return GIF_ICONS['suit'];
    if (n.includes('tenue'))                                return GIF_ICONS['customs-officer'];
    if (n.includes('cuir'))                                 return GIF_ICONS['leather'];
    if (n.includes('débardeur') || n.includes('debardeur')) return GIF_ICONS['debardeur'];
    if (n.includes('chemise'))                              return GIF_ICONS['shirt'];
    if (n.includes('blouson') || n.includes('veste'))       return GIF_ICONS['jacket'];
    if (n.includes('jupe'))                                 return GIF_ICONS['skirt'];
    if (n.includes('pantalon'))                             return GIF_ICONS['pants'];
    if (n.includes('culotte'))                              return GIF_ICONS['short'];
    if (n.includes('drap') || n.includes('couvre'))         return GIF_ICONS['bed'];
    if (n.includes('serviette'))                            return GIF_ICONS['towels'];
    if (n.includes('rideau'))                               return GIF_ICONS['curtain'];
    if (!iconName) return DEFAULT_GIF;
    const key = iconName.toLowerCase();
    if (GIF_ICONS[key]) return GIF_ICONS[key];
    const found = Object.keys(GIF_ICONS).find(k => key.includes(k) || k.includes(key));
    return found ? GIF_ICONS[found] : DEFAULT_GIF;
};
import PhotoCapture from '../../components/PhotoCapture';
import { useReceiptPDF } from '../../hooks/useReceiptPDF';
import OrderReceipt from '../../components/OrderReceipt';

const NewOrderScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [step, setStep] = useState(1); // 1: Items, 2: Locations, 3: Schedule, 4: Payment
    const [categories, setCategories] = useState([]);
    const [groupedItems, setGroupedItems] = useState({});
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [couponResult, setCouponResult] = useState(null); // { valid, discountAmount, coupon }
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState(null);

    // Points redemption state
    const [userPoints, setUserPoints] = useState(user?.pointsBalance || 0);
    const [pointsToRedeem, setPointsToRedeem] = useState(0);
    const [pointsValueFcfa, setPointsValueFcfa] = useState(5);
    const [minRedemptionPoints, setMinRedemptionPoints] = useState(100);
    const [maxRedemptionPercent, setMaxRedemptionPercent] = useState(50);
    const [expressPercentage, setExpressPercentage] = useState(20);

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
        couponCode: null,
        pointsToRedeem: 0,
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
    const [mapType, setMapType] = useState('standard');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [reverseGeocoding, setReverseGeocoding] = useState(false);
    const searchTimerRef = useRef(null);

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
        loadPointsBalance();
    }, []);

    const loadPointsBalance = async () => {
        try {
            const res = await pointsAPI.getBalance();
            setUserPoints(res.data.pointsBalance || 0);
            setPointsValueFcfa(res.data.pointsValueFcfa || 5);
            setMinRedemptionPoints(res.data.minRedemptionPoints || 100);
            setMaxRedemptionPercent(res.data.maxRedemptionPercent || 50);
            setExpressPercentage(res.data.expressPercentage ?? 20);
        } catch (e) {
            // non-fatal
        }
    };

    const validateCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError(null);
        setCouponResult(null);
        try {
            const pricing = calculateTotal();
            const res = await couponsAPI.validate(couponCode.trim(), pricing.total * 100);
            setCouponResult(res.data);
            setOrderData(prev => ({ ...prev, couponCode: couponCode.trim() }));
        } catch (e) {
            setCouponError(e.response?.data?.error || 'Invalid coupon code');
            setOrderData(prev => ({ ...prev, couponCode: null }));
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setCouponCode('');
        setCouponResult(null);
        setCouponError(null);
        setOrderData(prev => ({ ...prev, couponCode: null }));
    };

    const handlePointsChange = (val) => {
        const { subtotal, deliveryFee, expressFee } = calculateTotal();
        const orderTotal = subtotal + deliveryFee + expressFee;
        // Max redeemable = min(user balance, cap by max_redemption_percent of order)
        const maxFcfa = orderTotal * maxRedemptionPercent / 100;
        const maxByPercent = Math.floor(maxFcfa / (pointsValueFcfa / 100));
        const maxPts = Math.min(userPoints, maxByPercent);
        const pts = Math.min(Math.max(0, parseInt(val) || 0), maxPts);
        setPointsToRedeem(pts);
        setOrderData(prev => ({ ...prev, pointsToRedeem: pts }));
    };

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

            // Group data by French barème categories
            const groupsConfig = {
                'Ensembles & Professionnel': ['ensemble', 'costume', 'combinaison'],
                'Vêtements':                 ['chemise', 'haut', 't-shirt', 'polo', 'débardeur', 'pantalon', 'jupe', 'culotte', 'robe', 'blouson', 'peignoir'],
                'Linge de maison':           ['drap', 'couvre', 'serviette', 'rideau'],
            };
            const groups = Object.fromEntries(Object.keys(groupsConfig).map(k => [k, []]));
            categoriesRes.data.forEach(cat => {
                const name = cat.name.toLowerCase();
                let placed = false;
                for (const [groupKey, keywords] of Object.entries(groupsConfig)) {
                    if (keywords.some(kw => name.includes(kw))) {
                        groups[groupKey].push(cat);
                        placed = true;
                        break;
                    }
                }
                if (!placed) groups['Vêtements'].push(cat);
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
            const status = error.response?.status;
            const msg = status === 401
                ? t('errors.unauthorized')
                : t('customer.newOrder.failedLoadData');
            Alert.alert(t('common.error'), msg);
            console.error('[NewOrderScreen] loadData error:', error?.response?.data || error);
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
                subtotal += category.base_price * item.quantity;
            }
        });

        const deliveryFee = 2.00;
        const expressFee = orderData.isExpress ? subtotal * (expressPercentage / 100) : 0;
        const beforeDiscount = subtotal + deliveryFee + expressFee;
        const pointsDiscount = Math.min(
            pointsToRedeem * pointsValueFcfa / 100, // convert to same unit (prices are in centimes / 100)
            beforeDiscount * maxRedemptionPercent / 100
        );
        const total = Math.max(0, beforeDiscount - pointsDiscount);

        return { subtotal, deliveryFee, expressFee, pointsDiscount, total };
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

        // ── OFFLINE FALLBACK ──────────────────────────────────────────────
        if (!isOnline()) {
            try {
                const pickupLoc   = locations.find(l => l.id === orderData.pickupLocationId);
                const deliveryLoc = locations.find(l => l.id === orderData.deliveryLocationId);

                const offlinePayload = {
                    items:            orderData.items,
                    pickup_address:   pickupLoc?.address  || pickupLoc?.label  || '',
                    delivery_address: deliveryLoc?.address || deliveryLoc?.label || '',
                    pickup_lat:       pickupLoc?.latitude  || null,
                    pickup_lng:       pickupLoc?.longitude || null,
                    is_express:       orderData.isExpress,
                    payment_method:   orderData.paymentMethod,
                    special_instructions: orderData.specialInstructions,
                    total_amount:     0,  // recalculated server-side on sync
                };

                const { payload, sig, client_code, client_nonce } =
                    await buildOfflineOrder(offlinePayload, user.id);

                const localId  = crypto.randomUUID();
                const qrContent = await buildOfflineQRContent(localId, payload, sig);

                saveOfflineOrder({
                    id: localId, client_code, client_nonce, sig,
                    user_id: user.id, payload, qr_content: qrContent,
                });

                setSubmitting(false);

                Alert.alert(
                    t('offlineOrder.alert.title'),
                    t('offlineOrder.alert.message', { code: client_code }),
                    [
                        {
                            text: t('offlineOrder.alert.viewQr'),
                            onPress: () => navigation.navigate('OfflineOrderConfirm', {
                                client_code, qr_content: qrContent, local_id: localId,
                            }),
                        },
                        {
                            text: t('offlineOrder.alert.home'),
                            style: 'cancel',
                            onPress: () => { resetForm(); navigation.navigate('Home'); },
                        },
                    ]
                );
                return;
            } catch (offlineErr) {
                setSubmitting(false);
                Alert.alert('Erreur', `Impossible de sauvegarder la commande hors ligne : ${offlineErr.message}`);
                return;
            }
        }
        // ── END OFFLINE FALLBACK ──────────────────────────────────────────

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
                'Commande passée avec succès !',
                `Votre commande #${newOrder.order_number} a été créée.`,
                [
                    {
                        text: 'Voir le reçu',
                        onPress: () => setShowReceipt(true)
                    },
                    {
                        text: 'Télécharger le PDF',
                        onPress: async () => {
                            await downloadPDF(newOrder);
                            resetForm();
                            navigation.navigate('Home');
                        }
                    },
                    {
                        text: 'Accueil',
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
            Alert.alert('Erreur', error.response?.data?.error || error.message || 'Impossible de créer la commande');
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
                    [
                        { text: t('common.ok') },
                        { text: t('common.settings'), onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.error('Permission error:', error);
        }
    };

    const getCurrentLocation = async () => {
        setFetchingLocation(true);
        try {
            // Pre-check permission so we never call getCurrentPositionAsync
            // without authorization (that throws a noisy "Not authorized" error).
            // User can still tap the map manually to set the location.
            const perm = await Location.getForegroundPermissionsAsync();
            if (perm.status !== 'granted') {
                console.warn('[Location] permission not granted — skipping GPS fetch');
                return;
            }

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
            // Permission errors are normal user behavior — warn, no alert.
            // Real failures (GPS disabled, timeout) still surface in the Alert.
            const isPermissionError = /authorized|permission/i.test(error?.message || '');
            if (isPermissionError) {
                console.warn('[Location] denied:', error.message);
            } else {
                console.warn('[Location] failed:', error.message);
                Alert.alert(
                    t('customer.newOrder.locationError'),
                    t('customer.newOrder.locationErrorMessage'),
                    [{ text: t('common.ok') }]
                );
            }
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
        const coordinate = event.nativeEvent?.coordinate || event;
        setMarkerCoordinate(coordinate);
        handleMapTap(coordinate);
    };

    const handleMarkerDragEnd = (event) => {
        const coordinate = event.nativeEvent?.coordinate || event;
        setMarkerCoordinate(coordinate);
        handleMapTap(coordinate);
    };

    // Called when user taps the map — reverse geocodes via expo-location (no external API, no 403)
    const handleMapTap = async (coords) => {
        if (!coords || typeof coords.latitude !== 'number') return;
        setMarkerCoordinate(coords);
        setReverseGeocoding(true);
        try {
            const result = await Location.reverseGeocodeAsync(coords);
            if (result?.[0]) {
                const r = result[0];
                const parts = [r.name, r.street, r.district, r.subregion, r.city, r.region, r.country]
                    .filter(Boolean);
                // Deduplicate consecutive identical parts
                const deduped = parts.filter((p, i) => p !== parts[i - 1]);
                const address = deduped.join(', ');
                setNewLocation(prev => ({ ...prev, address, latitude: coords.latitude, longitude: coords.longitude }));
                setSearchQuery(address);
            } else {
                setNewLocation(prev => ({ ...prev, latitude: coords.latitude, longitude: coords.longitude }));
            }
        } catch (e) {
            setNewLocation(prev => ({ ...prev, latitude: coords.latitude, longitude: coords.longitude }));
        } finally {
            setReverseGeocoding(false);
        }
    };

    // Forward address search — Photon by Komoot (free, OSM-based, no API key, no 403)
    const handleSearchQueryChange = (text) => {
        setSearchQuery(text);
        setNewLocation(prev => ({ ...prev, address: text }));
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (text.length < 3) { setSearchResults([]); return; }
        searchTimerRef.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5&lang=fr`
                );
                const data = await res.json();
                if (data?.features) {
                    setSearchResults(data.features.map(f => ({
                        place_id: f.properties.osm_id,
                        lat: f.geometry.coordinates[1],
                        lon: f.geometry.coordinates[0],
                        display_name: [
                            f.properties.name,
                            f.properties.street,
                            f.properties.city,
                            f.properties.state,
                            f.properties.country,
                        ].filter(Boolean).join(', '),
                    })));
                } else {
                    setSearchResults([]);
                }
            } catch (e) {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 500);
    };

    // When user picks a search result
    const handleSelectSearchResult = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const coords = { latitude: lat, longitude: lng };
        setMarkerCoordinate(coords);
        // Setting mapRegion triggers NativeMapPicker.animateToRegion via useEffect
        setMapRegion({ ...coords, latitudeDelta: 0.004, longitudeDelta: 0.004 });
        setNewLocation(prev => ({ ...prev, address: result.display_name, latitude: lat, longitude: lng }));
        setSearchQuery(result.display_name);
        setSearchResults([]);
    };

    const handleOpenAddLocation = () => {
        setShowAddLocation(true);
        // Show a default region immediately so map appears before GPS resolves
        setMapRegion({ latitude: 0.3924, longitude: 9.4536, latitudeDelta: 0.05, longitudeDelta: 0.05 });
        // Then try to get real location
        requestLocationPermission();
    };

    const handleCloseAddLocation = () => {
        setShowAddLocation(false);
        setNewLocation({ label: '', address: '', latitude: null, longitude: null });
        setEditingLocationId(null);
        setMapRegion(null);
        setMarkerCoordinate(null);
        setCurrentLocation(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const renderAddLocationModal = () => (
        <Modal
            visible={showAddLocation}
            animationType="slide"
            transparent={false}
            onRequestClose={handleCloseAddLocation}
        >
            <View style={styles.addrModalRoot}>

                {/* ── Header ───────────────────────────────────── */}
                <View style={styles.addrHeader}>
                    <View style={styles.addrHeaderAccent} />
                    <TouchableOpacity style={styles.addrHeaderClose} onPress={handleCloseAddLocation}>
                        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={styles.addrHeaderCenter}>
                        <MaterialCommunityIcons name="map-marker-plus-outline" size={22} color={theme.colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.addrHeaderTitle}>
                            {editingLocationId ? 'Modifier l’adresse' : 'Nouvelle adresse'}
                        </Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* ── Search bar ───────────────────────────────── */}
                <View style={styles.addrSearchSection}>
                    <View style={[styles.addrSearchPill, searchResults.length > 0 && styles.addrSearchPillOpen]}>
                        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.addrSearchInput}
                            placeholder="Rechercher une adresse, un quartier..."
                            placeholderTextColor={theme.colors.textTertiary}
                            value={searchQuery}
                            onChangeText={handleSearchQueryChange}
                            returnKeyType="search"
                            autoCorrect={false}
                        />
                        {searchLoading
                            ? <ActivityIndicator size="small" color={theme.colors.primary} />
                            : reverseGeocoding
                                ? <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={theme.colors.primary} />
                                : searchQuery.length > 0
                                    ? <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                                        <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textTertiary} />
                                      </TouchableOpacity>
                                    : null
                        }
                    </View>

                    {/* Dropdown */}
                    {searchResults.length > 0 && (
                        <View style={styles.addrDropdown}>
                            {searchResults.map((r, i) => (
                                <TouchableOpacity
                                    key={r.place_id || i}
                                    style={[styles.addrDropItem, i < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight }]}
                                    onPress={() => handleSelectSearchResult(r)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.addrDropIcon}>
                                        <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
                                    </View>
                                    <Text style={styles.addrDropText} numberOfLines={2}>{r.display_name}</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.textTertiary} style={{ flexShrink: 0 }} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Map (native react-native-maps, OSM/Esri tiles) ── */}
                <View style={styles.addrMapWrap}>
                    {fetchingLocation && !mapRegion ? (
                        <View style={styles.addrMapPlaceholder}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={styles.addrMapPlaceholderText}>Détection GPS...</Text>
                        </View>
                    ) : (
                        <NativeMapPicker
                            style={styles.realMap}
                            region={mapRegion}
                            markerCoordinate={markerCoordinate}
                            mapType={mapType}
                            onLocationChange={handleMapTap}
                            showUserLocation={true}
                        />
                    )}

                    {/* Floating controls */}
                    <TouchableOpacity style={styles.addrGpsBtn} onPress={getCurrentLocation} disabled={fetchingLocation}>
                        {fetchingLocation
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#fff" />
                        }
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.addrSatBtn}
                        onPress={() => setMapType(prev => prev === 'standard' ? 'satellite' : 'standard')}
                    >
                        <MaterialCommunityIcons
                            name={mapType === 'standard' ? 'satellite-variant' : 'map-outline'}
                            size={17}
                            color={theme.colors.primary}
                        />
                    </TouchableOpacity>

                    {/* Tap-to-pin hint / confirmed badge */}
                    {markerCoordinate ? (
                        <View style={[styles.addrMapBadge, { backgroundColor: theme.colors.success + '22', borderColor: theme.colors.success + '44' }]}>
                            <MaterialCommunityIcons name="map-marker-check" size={13} color={theme.colors.success} />
                            <Text style={[styles.addrMapBadgeText, { color: theme.colors.success }]}>Position pinée</Text>
                        </View>
                    ) : mapRegion ? (
                        <View style={[styles.addrMapBadge, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '40' }]}>
                            <MaterialCommunityIcons name="gesture-tap" size={13} color={theme.colors.primary} />
                            <Text style={[styles.addrMapBadgeText, { color: theme.colors.primary }]}>Touchez pour placer</Text>
                        </View>
                    ) : null}
                </View>

                {/* ── Form panel ───────────────────────────────── */}
                <View style={styles.addrPanel}>

                    {/* Label field */}
                    <View style={styles.addrInputGroup}>
                        <View style={styles.addrInputIcon}>
                            <MaterialCommunityIcons name="home-map-marker" size={16} color={theme.colors.primary} />
                        </View>
                        <View style={styles.addrInputBody}>
                            <Text style={styles.addrInputLabel}>Nom du lieu</Text>
                            <TextInput
                                style={styles.addrInput}
                                placeholder="Ex : Domicile, Bureau, Parent..."
                                placeholderTextColor={theme.colors.textTertiary}
                                value={newLocation.label}
                                onChangeText={(text) => setNewLocation({ ...newLocation, label: text })}
                                returnKeyType="next"
                            />
                        </View>
                    </View>

                    <View style={styles.addrDivider} />

                    {/* Address field */}
                    <View style={styles.addrInputGroup}>
                        <View style={styles.addrInputIcon}>
                            <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.primary} />
                        </View>
                        <View style={styles.addrInputBody}>
                            <Text style={styles.addrInputLabel}>Adresse complète</Text>
                            <TextInput
                                style={styles.addrInput}
                                placeholder="Rue, quartier, ville..."
                                placeholderTextColor={theme.colors.textTertiary}
                                value={newLocation.address}
                                onChangeText={(text) => setNewLocation({ ...newLocation, address: text })}
                                returnKeyType="done"
                            />
                        </View>
                        {markerCoordinate && (
                            <View style={styles.addrGpsDot}>
                                <MaterialCommunityIcons name="crosshairs-gps" size={13} color={theme.colors.success} />
                            </View>
                        )}
                    </View>

                    {/* Save button */}
                    <TouchableOpacity
                        style={[styles.addrSaveBtn, (!newLocation.label || !newLocation.address) && styles.addrSaveBtnDisabled]}
                        onPress={handleAddLocation}
                        disabled={addingLocation || !newLocation.label || !newLocation.address}
                        activeOpacity={0.85}
                    >
                        {addingLocation
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <>
                                <MaterialCommunityIcons name={editingLocationId ? 'check-circle-outline' : 'map-marker-check'} size={20} color="#fff" />
                                <Text style={styles.addrSaveBtnText}>
                                    {editingLocationId ? 'Enregistrer les modifications' : 'Enregistrer cette adresse'}
                                </Text>
                              </>
                        }
                    </TouchableOpacity>
                </View>

            </View>
        </Modal>
    );

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Sélectionner les articles</Text>
            <Text style={styles.stepSubtitle}>Choisissez les articles à nettoyer</Text>

            {/* Express Service Toggle - MOVED TO TOP */}
            <TouchableOpacity
                style={styles.expressToggle}
                onPress={() => setOrderData({ ...orderData, isExpress: !orderData.isExpress })}
            >
                <View style={styles.expressInfo}>
                    <MaterialCommunityIcons name="flash" size={24} color={theme.colors.warning} />
                    <View>
                        <Text style={styles.expressTitle}>Service Express</Text>
                        <Text style={styles.expressSubtitle}>Livraison en 24h (+{expressPercentage}%)</Text>
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
                        Sélectionnés ({orderData.items.length} {orderData.items.length === 1 ? 'article' : 'articles'})
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
                                    <Text style={styles.selectedItemName}>{category.name_fr || category.name}</Text>
                                    <View style={styles.selectedItemBadge}>
                                        <Text style={styles.selectedItemQuantity}>×{item.quantity}</Text>
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
                {Object.keys(groupedItems).map(group => (
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
                                                <Image
                                                    source={getGif(category.icon_name, category.name_fr || category.name, category.gif_url)}
                                                    style={{ width: 44, height: 44 }}
                                                    contentFit="contain"
                                                    cachePolicy="memory-disk"
                                                />
                                            </View>
                                            <View style={styles.categoryText}>
                                                <Text style={[styles.categoryName, isSelected && styles.textSelected]}>
                                                    {category.name_fr || category.name}
                                                </Text>
                                                <Text style={styles.categoryPrice}>
                                                    {(parseFloat(category.base_price) * 100).toFixed(0)} Fcfa
                                                    {orderData.isExpress && ` (+${expressPercentage}% express)`}
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
                                                    <MaterialCommunityIcons name="minus" size={18} color={theme.colors.primary} />
                                                </TouchableOpacity>
                                                <Text style={styles.quantityText}>{selectedItem.quantity}</Text>
                                                <TouchableOpacity
                                                    onPress={() => updateItemQuantity(category.id, selectedItem.quantity + 1)}
                                                    style={styles.quantityButton}
                                                >
                                                    <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
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
            <Text style={styles.stepTitle}>Adresses</Text>
            <Text style={styles.stepSubtitle}>Sélectionnez les adresses de collecte et de livraison</Text>

            {/* Info Banner */}
            <View style={styles.locationInfoBanner}>
                <MaterialCommunityIcons name="information" size={20} color={theme.colors.info} />
                <Text style={styles.locationInfoText}>
                    Vous pouvez choisir la même adresse ou des adresses différentes pour la collecte et la livraison
                </Text>
            </View>

            {locations.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="map-marker-outline" size={48} color={theme.colors.textTertiary} />
                    <Text style={styles.emptyText}>Aucune adresse enregistrée</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleOpenAddLocation}
                    >
                        <Text style={styles.addButtonText}>Ajouter une adresse</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    {/* Manage Locations Section */}
                    <View style={styles.manageLocationsSection}>
                        <Text style={styles.manageLocationsTitle}>Gérer les adresses</Text>
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
                    <Text style={styles.sectionLabel}>Adresse de collecte</Text>
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
            <Text style={styles.stepTitle}>Planification de la collecte</Text>
            <Text style={styles.stepSubtitle}>Quand devons-nous récupérer votre linge ?</Text>

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
                        Collecte immédiate
                    </Text>
                    <Text style={styles.pickupTypeDesc}>Un livreur sera assigné immédiatement</Text>
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
                        Planifier la collecte
                    </Text>
                    <Text style={styles.pickupTypeDesc}>Choisissez une date et une heure précises</Text>
                </TouchableOpacity>
            </View>

            {/* Date/Time Selection for Scheduled */}
            {orderData.pickupType === 'scheduled' && (
                <View style={styles.scheduleSection}>
                    {/* Step 1: Select Date */}
                    <View style={styles.scheduleStep}>
                        <Text style={styles.scheduleStepLabel}>1. Sélectionner la date</Text>
                        <TouchableOpacity
                            style={styles.dateSelectButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary} />
                            <Text style={[styles.dateSelectText, selectedDate && styles.dateSelectedText]}>
                                {selectedDate
                                    ? selectedDate.toLocaleDateString('fr-FR', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })
                                    : 'Choisir une date'}
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
                            <Text style={styles.scheduleStepLabel}>2. Choisir le créneau horaire</Text>
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
                                <Text style={styles.scheduleConfirmationTitle}>Collecte planifiée</Text>
                                <Text style={styles.scheduleConfirmationDetail}>
                                    {selectedDate?.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' })}
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
                            Nous opérons de {businessHours.openTime}h à {businessHours.closeTime}h, du lundi au samedi
                        </Text>
                    </View>
                </View>
            )}

            {/* Special Instructions */}
            <View style={styles.instructionsSection}>
                <Text style={styles.sectionLabel}>Instructions spéciales (Optionnel)</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Ajoutez des instructions spéciales pour le livreur..."
                    placeholderTextColor={theme.colors.textTertiary}
                    value={orderData.specialInstructions}
                    onChangeText={(text) => setOrderData({ ...orderData, specialInstructions: text })}
                    multiline
                    numberOfLines={4}
                />
            </View>

            {/* Order Comment */}
            <View style={styles.instructionsSection}>
                <Text style={styles.sectionLabel}>Commentaire de commande (Optionnel)</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Notes générales (ex: 'Prêt vendredi pour mariage')"
                    placeholderTextColor={theme.colors.textTertiary}
                    value={orderComment}
                    onChangeText={setOrderComment}
                    multiline
                    numberOfLines={3}
                />
            </View>

            {/* Item Comment */}
            <View style={styles.instructionsSection}>
                <Text style={styles.sectionLabel}>Notes sur les articles (Optionnel)</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Notes spécifiques (ex: 'Tache de vin rouge sur la manche de la chemise bleue')"
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
                <Text style={styles.stepTitle}>Paiement & Récapitulatif</Text>
                <Text style={styles.stepSubtitle}>Vérifiez votre commande et choisissez le mode de paiement</Text>

                {/* Order Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Récapitulatif de commande</Text>

                    {orderData.items.map((item) => {
                        const category = categories.find(c => c.id === item.categoryId);
                        if (!category) return null;

                        return (
                            <View key={item.categoryId} style={styles.summaryItem}>
                                <Text style={styles.summaryItemText}>
                                    {category.name_fr || category.name} x{item.quantity}
                                </Text>
                                <Text style={styles.summaryItemPrice}>
                                    {((category.base_price * item.quantity) * 100).toFixed(0)} Fcfa
                                </Text>
                            </View>
                        );
                    })}

                    <View style={styles.divider} />

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemText}>Sous-total</Text>
                        <Text style={styles.summaryItemPrice}>{(pricing.subtotal * 100).toFixed(0)} Fcfa</Text>
                    </View>

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryItemText}>Frais de livraison</Text>
                        <Text style={styles.summaryItemPrice}>{(pricing.deliveryFee * 100).toFixed(0)} Fcfa</Text>
                    </View>

                    {orderData.isExpress && (
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryItemText}>Supplément Express</Text>
                            <Text style={styles.summaryItemPrice}>{(pricing.expressFee * 100).toFixed(0)} Fcfa</Text>
                        </View>
                    )}

                    {pointsToRedeem > 0 && (
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryItemText, { color: '#FFD700' }]}>
                                Points ({pointsToRedeem} pts)
                            </Text>
                            <Text style={[styles.summaryItemPrice, { color: '#FFD700' }]}>
                                -{(pricing.pointsDiscount * 100).toFixed(0)} Fcfa
                            </Text>
                        </View>
                    )}

                    <View style={[styles.divider, { marginVertical: theme.spacing.sm }]} />

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryTotal}>Total</Text>
                        <Text style={styles.summaryTotalPrice}>{(pricing.total * 100).toFixed(0)} Fcfa</Text>
                    </View>
                </View>

                {/* Coupon Code */}
                <View style={styles.paymentSection}>
                    <Text style={styles.sectionLabel}>Code Coupon</Text>
                    {couponResult ? (
                        <View style={styles.couponApplied}>
                            <MaterialCommunityIcons name="tag-check" size={20} color={theme.colors.success} />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.couponAppliedTitle}>{couponResult.coupon.name}</Text>
                                <Text style={styles.couponAppliedDiscount}>
                                    -{couponResult.discountAmount.toFixed(0)} Fcfa économisés
                                </Text>
                            </View>
                            <TouchableOpacity onPress={removeCoupon}>
                                <MaterialCommunityIcons name="close-circle" size={22} color={theme.colors.error} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.couponRow}>
                            <TextInput
                                style={styles.couponInput}
                                placeholder="Entrez un code coupon"
                                value={couponCode}
                                onChangeText={setCouponCode}
                                autoCapitalize="characters"
                                placeholderTextColor={theme.colors.textTertiary}
                            />
                            <TouchableOpacity
                                style={styles.couponApplyBtn}
                                onPress={validateCoupon}
                                disabled={couponLoading || !couponCode.trim()}
                            >
                                {couponLoading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={styles.couponApplyText}>Appliquer</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    )}
                    {couponError && (
                        <Text style={styles.couponErrorText}>{couponError}</Text>
                    )}
                </View>

                {/* Points Redemption */}
                {userPoints >= minRedemptionPoints && (
                    <View style={styles.paymentSection}>
                        <Text style={styles.sectionLabel}>Utiliser mes points</Text>
                        <View style={styles.pointsRedeemCard}>
                            <View style={styles.pointsRedeemHeader}>
                                <MaterialCommunityIcons name="star-circle" size={22} color="#FFD700" />
                                <Text style={styles.pointsBalanceText}>
                                    Vous avez <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>{userPoints}</Text> points
                                </Text>
                            </View>
                            <Text style={styles.pointsHint}>
                                Min {minRedemptionPoints} pts · 1 pt = {pointsValueFcfa} Fcfa · max {maxRedemptionPercent}% de la commande
                            </Text>
                            <View style={styles.pointsInputRow}>
                                <TouchableOpacity
                                    style={styles.pointsStepBtn}
                                    onPress={() => handlePointsChange(pointsToRedeem - minRedemptionPoints)}
                                >
                                    <MaterialCommunityIcons name="minus" size={18} color={theme.colors.primary} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.pointsInput}
                                    keyboardType="numeric"
                                    value={String(pointsToRedeem)}
                                    onChangeText={handlePointsChange}
                                />
                                <TouchableOpacity
                                    style={styles.pointsStepBtn}
                                    onPress={() => handlePointsChange(pointsToRedeem + minRedemptionPoints)}
                                >
                                    <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
                                </TouchableOpacity>
                                <Text style={styles.pointsDiscountPreview}>
                                    = {(pointsToRedeem * pointsValueFcfa).toFixed(0)} Fcfa déduits
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Payment Method */}
                <View style={styles.paymentSection}>
                    <Text style={styles.sectionLabel}>Mode de paiement</Text>

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
                            Paiement à la collecte
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
                            <Text style={styles.comingSoonText}>Bientôt Disponible</Text>
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
                            <Text style={styles.comingSoonText}>Bientôt Disponible</Text>
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
                <Text style={styles.headerTitle}>Nouvelle Commande</Text>
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
                        <Text style={styles.backButtonText}>Retour</Text>
                    </TouchableOpacity>
                )}

                {step < 4 ? (
                    <TouchableOpacity
                        style={[styles.footerButton, styles.nextButton, step === 1 && { flex: 1 }]}
                        onPress={() => setStep(step + 1)}
                        disabled={step === 1 && orderData.items.length === 0}
                    >
                        <Text style={styles.nextButtonText}>Suivant</Text>
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
                            <Text style={styles.submitButtonText}>Passer la commande</Text>
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
        marginRight: theme.spacing.sm, // Add space between info and quantity controls
    },
    categoryIconContainer: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryText: {
        marginLeft: theme.spacing.md,
        flex: 1,
        flexShrink: 1, // Allow text to shrink to prevent overlap
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
        flexWrap: 'wrap', // Allow text to wrap if needed
    },
    textSelected: {
        color: theme.colors.primary,
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm, // Reduced from md for more compact layout
    },
    quantityButton: {
        width: 28, // Reduced from 32
        height: 28, // Reduced from 32
        borderRadius: 14, // Half of width/height
        backgroundColor: theme.colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityText: {
        fontSize: theme.fonts.sizes.md, // Reduced from lg
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.primary,
        minWidth: 20, // Reduced from 24
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
    // Coupon styles
    couponRow: { flexDirection: 'row', gap: theme.spacing.sm },
    couponInput: {
        flex: 1, borderWidth: 1.5, borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.lg, paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm, fontSize: theme.fonts.sizes.md,
        color: theme.colors.text, backgroundColor: theme.colors.surface,
    },
    couponApplyBtn: {
        backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.lg, justifyContent: 'center', alignItems: 'center',
    },
    couponApplyText: { color: '#fff', fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md },
    couponApplied: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9',
        borderRadius: theme.borderRadius.lg, padding: theme.spacing.md,
        borderWidth: 1, borderColor: theme.colors.success,
    },
    couponAppliedTitle: { fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text },
    couponAppliedDiscount: { fontSize: theme.fonts.sizes.sm, color: theme.colors.success, fontWeight: theme.fonts.weights.bold },
    couponErrorText: { color: theme.colors.error, fontSize: theme.fonts.sizes.sm, marginTop: theme.spacing.xs },
    // Points redemption styles
    pointsRedeemCard: {
        backgroundColor: '#1a1a2e', borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
    },
    pointsRedeemHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 4 },
    pointsBalanceText: { fontSize: theme.fonts.sizes.md, color: '#fff' },
    pointsHint: { fontSize: theme.fonts.sizes.xs, color: 'rgba(255,255,255,0.5)', marginBottom: theme.spacing.sm },
    pointsInputRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    pointsStepBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    pointsInput: {
        width: 70, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: theme.borderRadius.md, paddingVertical: 4, color: '#fff',
        fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold,
    },
    pointsDiscountPreview: { fontSize: theme.fonts.sizes.md, color: '#FFD700', fontWeight: theme.fonts.weights.bold },
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
        height: 240,
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
        right: 10,
        bottom: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
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
    // ─── Address modal styles ────────────────────────────────────────
    addrModalRoot: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    addrHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 52,
        paddingBottom: 14,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        position: 'relative',
    },
    addrHeaderAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: theme.colors.primary,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    addrHeaderClose: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addrHeaderCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addrHeaderTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: 0.2,
    },
    addrSearchSection: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        zIndex: 20,
    },
    addrSearchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    addrSearchPillOpen: {
        borderColor: theme.colors.primary,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomWidth: 0,
    },
    addrSearchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: 0,
    },
    addrDropdown: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderTopWidth: 0,
        borderColor: theme.colors.primary,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#00D4D4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
    },
    addrDropItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    addrDropIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.primary + '18',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        flexShrink: 0,
    },
    addrDropText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.text,
        lineHeight: 17,
        marginRight: 6,
    },
    addrMapWrap: {
        flex: 1,
        position: 'relative',
        backgroundColor: theme.colors.background,
    },
    addrMapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 32,
    },
    addrMapPlaceholderIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addrMapPlaceholderText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    addrGpsBtn: {
        position: 'absolute',
        right: 14,
        bottom: 14,
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    addrSatBtn: {
        position: 'absolute',
        right: 14,
        bottom: 70,
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
    },
    addrMapBadge: {
        position: 'absolute',
        bottom: 14,
        left: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        gap: 5,
    },
    addrMapBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    addrPanel: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    addrInputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    addrInputIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        flexShrink: 0,
    },
    addrInputBody: {
        flex: 1,
    },
    addrInputLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    addrInput: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
        paddingVertical: 4,
    },
    addrGpsDot: {
        marginLeft: 8,
        flexShrink: 0,
    },
    addrDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginLeft: 44,
        marginVertical: 2,
    },
    addrSaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: theme.colors.primary,
        borderRadius: 14,
        height: 52,
        marginTop: 16,
        elevation: 4,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    addrSaveBtnDisabled: {
        backgroundColor: theme.colors.textTertiary,
        elevation: 0,
        shadowOpacity: 0,
    },
    addrSaveBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.3,
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
