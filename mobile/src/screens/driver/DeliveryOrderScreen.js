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
    Animated,
} from 'react-native';
import OpenStreetMap from '../../components/map/OpenStreetMap';
import * as Location from 'expo-location';
import { routingService } from '../../services/routing.service';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI } from '../../services/api';
import PhotoCapture from '../../components/PhotoCapture';
import SignaturePad from '../../components/SignaturePad';
import OrderReceipt from '../../components/OrderReceipt';
import theme from '../../theme/theme';

const SCREEN_H = Dimensions.get('window').height;
const COLLAPSED_H = 170;
const EXPANDED_H = SCREEN_H - 80;

const ACTIVE_STATUSES = ['driver_en_route_delivery', 'arrived_delivery'];

const PAYMENT_OPTIONS = [
    { value: 'cash', label: 'Espèces', icon: 'cash' },
    { value: 'airtel_money', label: 'Airtel Money', icon: 'cellphone' },
    { value: 'moov_money', label: 'Moov Money', icon: 'cellphone-wireless' },
];

const DeliveryOrderScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { orderId } = route.params;

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Location & route
    const [userLocation, setUserLocation] = useState(null);
    const [routeCoords, setRouteCoords] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);
    const locationSubscription = useRef(null);

    // Bottom sheet
    const [isExpanded, setIsExpanded] = useState(false);
    const bottomSheetHeight = useRef(new Animated.Value(COLLAPSED_H)).current;

    // Delivery form
    const [itemCount, setItemCount] = useState('');
    const [photos, setPhotos] = useState([]);
    const [signature, setSignature] = useState(null);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isVerified, setIsVerified] = useState(false);
    const [showQR, setShowQR] = useState(false);

    // ── Navigation guard ───────────────────────────────────────────────────────
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!order || !ACTIVE_STATUSES.includes(order.status)) return;
            e.preventDefault();
            Alert.alert(
                'Livraison en cours',
                'Vous avez une livraison en cours. Voulez-vous vraiment quitter ?',
                [
                    { text: 'Rester', style: 'cancel' },
                    { text: 'Quitter', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
                ]
            );
        });
        return unsubscribe;
    }, [navigation, order]);

    // ── Auto-expand on arrival ─────────────────────────────────────────────────
    useEffect(() => {
        if (order?.status === 'arrived_delivery' && !isExpanded) {
            expandSheet();
        }
    }, [order?.status]);

    useEffect(() => {
        loadOrder();
        startLocationTracking();
        return () => { locationSubscription.current?.remove(); };
    }, []);

    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
            locationSubscription.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 15, timeInterval: 8000 },
                ({ coords }) => setUserLocation({ latitude: coords.latitude, longitude: coords.longitude })
            );
        } catch (error) {
            console.warn('Location error:', error);
        }
    };

    const loadOrder = async () => {
        try {
            const response = await ordersAPI.getById(orderId);
            setOrder(response.data);
            setItemCount(response.data.confirmed_item_count?.toString() || '');
        } catch (error) {
            Alert.alert(t('common.error'), t('errors.generic'));
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    // ── Coordinates ────────────────────────────────────────────────────────────
    const getDelivCoords = (o) => {
        if (!o) return null;
        if (o.delivery_location?.latitude && o.delivery_location?.longitude) {
            return { latitude: parseFloat(o.delivery_location.latitude), longitude: parseFloat(o.delivery_location.longitude) };
        }
        if (o.delivery_lat && o.delivery_lng) {
            return { latitude: parseFloat(o.delivery_lat), longitude: parseFloat(o.delivery_lng) };
        }
        return null;
    };

    const coords = getDelivCoords(order);

    // ── Route ──────────────────────────────────────────────────────────────────
    const routeFetched = useRef(false);
    useEffect(() => {
        if (!userLocation || !order || routeFetched.current) return;
        const c = getDelivCoords(order);
        if (!c) return;
        routeFetched.current = true;
        routingService.getRoute(userLocation, c)
            .then(r => { if (r) { setRouteCoords(r.coordinates); setRouteInfo({ distance: r.distance, duration: r.duration }); } })
            .catch(() => {});
    }, [userLocation, order]);

    // ── Status update ──────────────────────────────────────────────────────────
    const handleStatusUpdate = async (newStatus) => {
        try {
            await ordersAPI.updateStatus(orderId, newStatus);
            setOrder(prev => ({ ...prev, status: newStatus }));
        } catch (error) {
            console.error('Status update failed:', error);
            Alert.alert(t('common.error'), t('errors.generic'));
        }
    };

    // ── Arrived confirmation ───────────────────────────────────────────────────
    const confirmArrival = () => {
        Alert.alert(
            'Confirmation d\'arrivée',
            `Êtes-vous bien arrivé à l\'adresse de livraison ?\n\n${order?.delivery_address || ''}`,
            [
                { text: 'Pas encore', style: 'cancel' },
                { text: 'Oui, je suis arrivé', onPress: () => handleStatusUpdate('arrived_delivery') },
            ]
        );
    };

    // ── Bottom sheet ───────────────────────────────────────────────────────────
    const expandSheet = () => {
        Animated.spring(bottomSheetHeight, { toValue: EXPANDED_H, useNativeDriver: false, friction: 8, tension: 50 }).start();
        setIsExpanded(true);
    };
    const collapseSheet = () => {
        Animated.spring(bottomSheetHeight, { toValue: COLLAPSED_H, useNativeDriver: false, friction: 8, tension: 50 }).start();
        setIsExpanded(false);
    };
    const toggleSheet = () => isExpanded ? collapseSheet() : expandSheet();

    // ── Action button ──────────────────────────────────────────────────────────
    const getPrimaryButton = () => {
        if (!order) return null;
        switch (order.status) {
            case 'picked_up':
            case 'cleaning':
            case 'ready':
            case 'ready_for_delivery':
                return { label: 'Démarrer la livraison', color: theme.colors.primary, icon: 'motorbike', onPress: () => handleStatusUpdate('driver_en_route_delivery') };
            case 'driver_en_route_delivery':
                return { label: 'Je suis Arrivé', color: theme.colors.success, icon: 'map-marker-check', onPress: confirmArrival };
            case 'arrived_delivery':
                return { label: isExpanded ? 'Réduire' : 'Procéder à la livraison', color: theme.colors.secondary, icon: 'package-variant-closed', onPress: toggleSheet };
            default:
                return { label: 'Voir les détails', color: theme.colors.textSecondary, icon: 'chevron-up', onPress: toggleSheet };
        }
    };

    // ── QR scan ────────────────────────────────────────────────────────────────
    const handleScanQR = () => {
        navigation.navigate('ScanQR', {
            orderId,
            onScan: (scannedOrder) => {
                setIsVerified(true);
                Alert.alert('QR Vérifié ✓', `Commande #${scannedOrder.num || scannedOrder.order_number} confirmée.`);
            },
        });
    };

    // ── External navigation ────────────────────────────────────────────────────
    const handleNavigate = () => {
        if (!coords) { Alert.alert(t('common.error'), 'Adresse non disponible'); return; }
        const url = Platform.select({
            ios: `http://maps.apple.com/?daddr=${coords.latitude},${coords.longitude}&dirflg=d`,
            android: `google.navigation:q=${coords.latitude},${coords.longitude}&mode=d`,
        });
        Linking.openURL(url).catch(() =>
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}&travelmode=driving`)
        );
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!itemCount || itemCount === '0') {
            Alert.alert(t('common.error'), 'Veuillez indiquer le nombre d\'articles livrés.');
            return;
        }
        if (!signature) {
            Alert.alert(t('common.error'), 'La signature du client est requise pour confirmer la livraison.');
            return;
        }
        if (photos.length === 0) {
            Alert.alert('Aucune photo', 'Souhaitez-vous continuer sans photo de preuve ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Continuer', onPress: submitDelivery },
            ]);
            return;
        }
        await submitDelivery();
    };

    const submitDelivery = async () => {
        setSubmitting(true);
        try {
            await ordersAPI.scanOrder(orderId, {
                checkpoint: 'delivered',
                item_count: parseInt(itemCount),
                signature_data: signature,
                photos,
                notes,
                payment_method: paymentMethod,
            });
            const payLabel = PAYMENT_OPTIONS.find(p => p.value === paymentMethod)?.label || paymentMethod;
            Alert.alert(
                'Livraison confirmée ✓',
                `Paiement encaissé : ${payLabel}\n(${(parseFloat(order.total || 0) * 100).toFixed(0)} Fcfa)`,
                [{ text: 'OK', onPress: () => navigation.popToTop() }]
            );
        } catch (error) {
            Alert.alert(t('common.error'), error.response?.data?.error || 'Échec de la confirmation.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Computed ───────────────────────────────────────────────────────────────
    const actionButton = getPrimaryButton();
    const isEnRoute = order?.status === 'driver_en_route_delivery';
    const isArrived = order?.status === 'arrived_delivery';

    const stepsReady = {
        qr: isVerified,
        items: !!itemCount && itemCount !== '0',
        signature: !!signature,
    };
    const allStepsDone = stepsReady.qr && stepsReady.items && stepsReady.signature;

    const mapMarkers = [];
    if (coords) mapMarkers.push({ latitude: coords.latitude, longitude: coords.longitude, title: 'Livraison', description: order?.delivery_address || '' });
    if (userLocation) mapMarkers.push({ latitude: userLocation.latitude, longitude: userLocation.longitude, title: 'Vous', description: 'Votre position' });

    if (loading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }
    if (!order) return null;

    return (
        <View style={styles.container}>
            {/* Map */}
            <OpenStreetMap
                style={StyleSheet.absoluteFill}
                initialRegion={{
                    latitude: coords?.latitude || userLocation?.latitude || 0.3924,
                    longitude: coords?.longitude || userLocation?.longitude || 9.4536,
                    latitudeDelta: 0.02, longitudeDelta: 0.02,
                }}
                markers={mapMarkers}
                polylines={routeCoords.length > 0 ? [{ coordinates: routeCoords, strokeColor: theme.colors.success, strokeWidth: 5 }] : []}
                interaction="nav"
            />

            {/* ETA pill */}
            {routeInfo && isEnRoute && (
                <View style={styles.etaPill}>
                    <MaterialCommunityIcons name="clock-fast" size={16} color="#fff" />
                    <Text style={styles.etaText}>{Math.ceil(routeInfo.duration / 60)} min</Text>
                    <View style={styles.etaDivider} />
                    <MaterialCommunityIcons name="map-marker-distance" size={16} color="#fff" />
                    <Text style={styles.etaText}>{(routeInfo.distance / 1000).toFixed(1)} km</Text>
                </View>
            )}

            {/* Arrived badge */}
            {isArrived && (
                <View style={[styles.arrivedBadge, { backgroundColor: theme.colors.secondary }]}>
                    <MaterialCommunityIcons name="map-marker-check" size={18} color="#fff" />
                    <Text style={styles.arrivedText}>Arrivé — livraison en cours</Text>
                </View>
            )}

            {/* Top controls */}
            <View style={styles.topOverlay}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#1a1a1a" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNavigate} style={styles.navButton}>
                    <MaterialCommunityIcons name="navigation-variant" size={18} color="#fff" />
                    <Text style={styles.navButtonText}>Naviguer</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom sheet */}
            <Animated.View style={[styles.bottomSheet, { height: bottomSheetHeight }]}>
                <TouchableOpacity activeOpacity={0.9} onPress={toggleSheet} style={styles.sheetHandle}>
                    <View style={styles.handleBar} />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.sheetHeader}>
                    <View style={styles.sheetHeaderLeft}>
                        <Text style={styles.customerName} numberOfLines={1}>{order.customer_name}</Text>
                        <Text style={styles.orderRef}>Commande #{order.order_number}</Text>
                        <Text style={styles.totalText}>
                            À encaisser : {(parseFloat(order.total || 0) * 100).toFixed(0)} Fcfa
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, isArrived && { backgroundColor: theme.colors.secondary }]}>
                        <Text style={styles.statusText}>
                            {isArrived ? 'ARRIVÉ' : isEnRoute ? 'EN ROUTE' : order.status.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Action button */}
                <View style={styles.actionRow}>
                    {actionButton && (
                        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: actionButton.color }]} onPress={actionButton.onPress}>
                            <MaterialCommunityIcons name={actionButton.icon} size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.primaryBtnText}>{actionButton.label}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.mapIconBtn} onPress={handleNavigate}>
                        <MaterialCommunityIcons name="google-maps" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.sheetContent} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>

                    {/* Step progress */}
                    {isArrived && (
                        <View style={styles.stepsRow}>
                            {[
                                { key: 'qr', label: 'QR', done: stepsReady.qr, icon: 'qrcode-scan' },
                                { key: 'items', label: 'Articles', done: stepsReady.items, icon: 'package-variant' },
                                { key: 'signature', label: 'Signature', done: stepsReady.signature, icon: 'draw' },
                            ].map((step, i) => (
                                <React.Fragment key={step.key}>
                                    <View style={styles.stepItem}>
                                        <View style={[styles.stepIcon, step.done && styles.stepIconDone]}>
                                            <MaterialCommunityIcons name={step.done ? 'check' : step.icon} size={18} color={step.done ? '#fff' : theme.colors.textSecondary} />
                                        </View>
                                        <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>{step.label}</Text>
                                    </View>
                                    {i < 2 && <View style={[styles.stepLine, step.done && styles.stepLineDone]} />}
                                </React.Fragment>
                            ))}
                        </View>
                    )}

                    {/* Customer info */}
                    <View style={styles.customerRow}>
                        <View style={[styles.customerAvatar, { backgroundColor: theme.colors.secondary + '18' }]}>
                            <Text style={[styles.customerInitials, { color: theme.colors.secondary }]}>{order.customer_name?.substring(0, 2).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.customerNameFull}>{order.customer_name}</Text>
                            <Text style={styles.customerPhone}>{order.customer_phone}</Text>
                        </View>
                        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}>
                            <MaterialCommunityIcons name="phone" size={22} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Delivery address */}
                    <View style={styles.addressCard}>
                        <MaterialCommunityIcons name="map-marker-down" size={18} color={theme.colors.success} />
                        <Text style={styles.addressText} numberOfLines={2}>{order.delivery_address || 'Adresse non disponible'}</Text>
                    </View>

                    {/* Action cards */}
                    <View style={styles.actionCards}>
                        <TouchableOpacity style={styles.actionCard} onPress={() => setShowQR(true)}>
                            <View style={[styles.actionCardIcon, { backgroundColor: '#E0F2FE' }]}>
                                <MaterialCommunityIcons name="qrcode" size={26} color="#0284C7" />
                            </View>
                            <Text style={styles.actionCardLabel}>Montrer QR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionCard, isVerified && styles.actionCardDone]} onPress={handleScanQR}>
                            <View style={[styles.actionCardIcon, { backgroundColor: isVerified ? '#D1FAE5' : '#F0FDF4' }]}>
                                <MaterialCommunityIcons name={isVerified ? 'check-decagram' : 'qrcode-scan'} size={26} color={isVerified ? theme.colors.success : '#16A34A'} />
                            </View>
                            <Text style={[styles.actionCardLabel, isVerified && { color: theme.colors.success }]}>{isVerified ? 'Vérifié ✓' : 'Scanner QR'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.actionCard, signature && styles.actionCardDone]} onPress={() => setShowSignaturePad(true)}>
                            <View style={[styles.actionCardIcon, { backgroundColor: signature ? '#D1FAE5' : '#FEF3C7' }]}>
                                <MaterialCommunityIcons name={signature ? 'check-circle' : 'draw'} size={26} color={signature ? theme.colors.success : '#D97706'} />
                            </View>
                            <Text style={[styles.actionCardLabel, signature && { color: theme.colors.success }]}>{signature ? 'Signé ✓' : 'Signature'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Item count */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Articles livrés</Text>
                        <View style={styles.countRow}>
                            <TouchableOpacity style={styles.countBtn} onPress={() => setItemCount(Math.max(0, parseInt(itemCount || 0) - 1).toString())}>
                                <MaterialCommunityIcons name="minus" size={22} color={theme.colors.primary} />
                            </TouchableOpacity>
                            <View style={styles.countDisplay}>
                                <TextInput style={styles.countInput} value={itemCount} onChangeText={setItemCount} keyboardType="number-pad" placeholder="0" placeholderTextColor="#ccc" />
                                <Text style={styles.countUnit}>articles</Text>
                            </View>
                            <TouchableOpacity style={styles.countBtn} onPress={() => setItemCount((parseInt(itemCount || 0) + 1).toString())}>
                                <MaterialCommunityIcons name="plus" size={22} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Payment method */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Mode de paiement encaissé</Text>
                        {PAYMENT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[styles.paymentOption, paymentMethod === opt.value && styles.paymentOptionSelected]}
                                onPress={() => setPaymentMethod(opt.value)}
                            >
                                <MaterialCommunityIcons name={opt.icon} size={22} color={paymentMethod === opt.value ? theme.colors.primary : theme.colors.textSecondary} />
                                <Text style={[styles.paymentLabel, paymentMethod === opt.value && styles.paymentLabelSelected]}>{opt.label}</Text>
                                {paymentMethod === opt.value && <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Photos */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preuve de livraison</Text>
                        <PhotoCapture photos={photos} onPhotosChange={setPhotos} maxPhotos={5} />
                    </View>

                    {/* Notes */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notes (optionnel)</Text>
                        <TextInput
                            style={styles.notesInput} value={notes} onChangeText={setNotes}
                            placeholder="Observations..." placeholderTextColor={theme.colors.textTertiary}
                            multiline numberOfLines={3}
                        />
                    </View>
                </ScrollView>

                {/* Footer */}
                {isArrived && (
                    <View style={styles.sheetFooter}>
                        <TouchableOpacity
                            style={[styles.confirmBtn, (!allStepsDone || submitting) && styles.confirmBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting || !allStepsDone}
                        >
                            {submitting ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <MaterialCommunityIcons name="check-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.confirmBtnText}>Confirmer la livraison</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {!allStepsDone && (
                            <Text style={styles.stepsHint}>
                                Complétez : {!stepsReady.qr ? 'QR · ' : ''}{!stepsReady.items ? 'Articles · ' : ''}{!stepsReady.signature ? 'Signature' : ''}
                            </Text>
                        )}
                    </View>
                )}
            </Animated.View>

            <SignaturePad visible={showSignaturePad} onSave={(data) => { setSignature(data); setShowSignaturePad(false); }} onCancel={() => setShowSignaturePad(false)} />
            <OrderReceipt visible={showQR} order={order} onClose={() => setShowQR(false)} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    etaPill: {
        position: 'absolute', top: 140, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(0,0,0,0.82)', paddingVertical: 8, paddingHorizontal: 18,
        borderRadius: 30, zIndex: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
    },
    etaText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    etaDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2 },
    arrivedBadge: {
        position: 'absolute', top: 140, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 8, paddingHorizontal: 18, borderRadius: 30, zIndex: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 8,
    },
    arrivedText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    topOverlay: { position: 'absolute', top: 60, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
    iconButton: {
        width: 44, height: 44, backgroundColor: '#fff', borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 5,
    },
    navButton: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: theme.colors.success, paddingHorizontal: 18, height: 44, borderRadius: 22,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 5,
    },
    navButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 24,
    },
    sheetHandle: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
    handleBar: { width: 36, height: 4, backgroundColor: '#DDD', borderRadius: 2 },
    sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
    sheetHeaderLeft: { flex: 1, marginRight: 10 },
    customerName: { fontSize: 17, fontWeight: '800', color: theme.colors.text },
    orderRef: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
    totalText: { fontSize: 14, fontWeight: '700', color: theme.colors.success, marginTop: 3 },
    statusBadge: { backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 2 },
    statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    actionRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 14, gap: 10 },
    primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 14, elevation: 2 },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    mapIconBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    sheetContent: { flex: 1, paddingHorizontal: 20 },
    stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginBottom: 8 },
    stepItem: { alignItems: 'center', gap: 4 },
    stepIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
    stepIconDone: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
    stepLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
    stepLabelDone: { color: theme.colors.success },
    stepLine: { width: 40, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4, marginBottom: 20 },
    stepLineDone: { backgroundColor: theme.colors.success },
    customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    customerAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    customerInitials: { fontSize: 16, fontWeight: '800' },
    customerNameFull: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    customerPhone: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
    callBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
    addressCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#EAEAEA' },
    addressText: { flex: 1, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    actionCards: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionCard: { flex: 1, backgroundColor: '#F8F9FA', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: '#EAEAEA' },
    actionCardDone: { borderColor: theme.colors.success, backgroundColor: '#F0FDF4' },
    actionCardIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    actionCardLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
    section: { marginBottom: 18 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 10 },
    countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: '#F8F9FA', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EAEAEA' },
    countBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, elevation: 1 },
    countDisplay: { alignItems: 'center', minWidth: 70 },
    countInput: { fontSize: 30, fontWeight: '800', color: theme.colors.text, textAlign: 'center', padding: 0 },
    countUnit: { fontSize: 12, color: theme.colors.textSecondary, textTransform: 'uppercase', marginTop: 2, fontWeight: '600' },
    paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F8F9FA', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 2, borderColor: '#EAEAEA' },
    paymentOptionSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '08' },
    paymentLabel: { flex: 1, fontSize: 15, color: theme.colors.text, fontWeight: '500' },
    paymentLabelSelected: { color: theme.colors.primary, fontWeight: '700' },
    notesInput: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, fontSize: 14, color: theme.colors.text, borderWidth: 1, borderColor: '#EAEAEA', minHeight: 70, textAlignVertical: 'top' },
    sheetFooter: { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#fff' },
    confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, paddingVertical: 15, borderRadius: 14 },
    confirmBtnDisabled: { backgroundColor: '#9CA3AF' },
    confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    stepsHint: { textAlign: 'center', fontSize: 12, color: theme.colors.textSecondary, marginTop: 8 },
});

export default DeliveryOrderScreen;
