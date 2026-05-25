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
    KeyboardAvoidingView,
    SafeAreaView,
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

const { height: SCREEN_H } = Dimensions.get('window');
const COLLAPSED_H = 180; // handle + header + action row
const EXPANDED_H  = SCREEN_H * 0.80; // leaves ~20% for map

const ACTIVE_STATUSES = ['driver_en_route_pickup', 'arrived_pickup'];

const PickupOrderScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { orderId } = route.params;

    const [order, setOrder]       = useState(null);
    const [loading, setLoading]   = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Location
    const [userLocation, setUserLocation] = useState(null);
    const [routeCoords, setRouteCoords]   = useState([]);
    const [routeInfo, setRouteInfo]       = useState(null);
    const locationSub = useRef(null);
    const routeFetched = useRef(false); // fetch route only once per session

    // Bottom sheet
    const [isExpanded, setIsExpanded]         = useState(false);
    const sheetAnim = useRef(new Animated.Value(COLLAPSED_H)).current;

    // Form
    const [itemCount, setItemCount]           = useState('');
    const [photos, setPhotos]                 = useState([]);
    const [signature, setSignature]           = useState(null);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [notes, setNotes]                   = useState('');
    const [isVerified, setIsVerified]         = useState(false);
    const [showQR, setShowQR]                 = useState(false);

    // ── Sheet helpers (defined BEFORE effects that use them) ───────────────────
    const expandSheet = () => {
        Animated.spring(sheetAnim, { toValue: EXPANDED_H, useNativeDriver: false, friction: 9, tension: 45 }).start();
        setIsExpanded(true);
    };
    const collapseSheet = () => {
        Animated.spring(sheetAnim, { toValue: COLLAPSED_H, useNativeDriver: false, friction: 9, tension: 45 }).start();
        setIsExpanded(false);
    };
    const toggleSheet = () => (isExpanded ? collapseSheet : expandSheet)();

    // ── Navigation guard ───────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = navigation.addListener('beforeRemove', (e) => {
            if (!order || !ACTIVE_STATUSES.includes(order.status)) return;
            e.preventDefault();
            Alert.alert(
                'Collecte en cours',
                'Vous avez une collecte en cours. Quitter quand même ?',
                [
                    { text: 'Rester', style: 'cancel' },
                    { text: 'Quitter', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
                ]
            );
        });
        return unsub;
    }, [navigation, order]);

    // ── Auto-expand when arrived ───────────────────────────────────────────────
    useEffect(() => {
        if (order?.status === 'arrived_pickup') expandSheet();
    }, [order?.status]); // eslint-disable-line

    // ── Init ───────────────────────────────────────────────────────────────────
    useEffect(() => {
        loadOrder();
        startTracking();
        return () => locationSub.current?.remove();
    }, []);

    const startTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({});
            setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            locationSub.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 10000 },
                ({ coords: c }) => setUserLocation({ latitude: c.latitude, longitude: c.longitude })
            );
        } catch (e) { console.warn('Location:', e); }
    };

    const loadOrder = async () => {
        try {
            const res = await ordersAPI.getById(orderId);
            const data = res.data;
            setOrder(data);
            setItemCount(data.confirmed_item_count?.toString() || '');
        } catch {
            Alert.alert('Erreur', 'Impossible de charger la commande.');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    // ── Coordinates (computed inline — no stale closure) ──────────────────────
    const getCoords = (o) => {
        if (!o) return null;
        if (o.pickup_lat && o.pickup_lng)
            return { latitude: parseFloat(o.pickup_lat), longitude: parseFloat(o.pickup_lng) };
        if (o.pickup_location?.latitude)
            return { latitude: parseFloat(o.pickup_location.latitude), longitude: parseFloat(o.pickup_location.longitude) };
        return null;
    };

    // ── Route (fetch once when both points are ready) ─────────────────────────
    useEffect(() => {
        if (!userLocation || !order || routeFetched.current) return;
        const c = getCoords(order);
        if (!c) return;
        routeFetched.current = true;
        routingService.getRoute(userLocation, c)
            .then(r => { if (r) { setRouteCoords(r.coordinates); setRouteInfo({ distance: r.distance, duration: r.duration }); } })
            .catch(() => {});
    }, [userLocation, order]);

    // ── Status update ──────────────────────────────────────────────────────────
    const updateStatus = async (newStatus) => {
        try {
            await ordersAPI.updateStatus(orderId, newStatus);
            setOrder(prev => ({ ...prev, status: newStatus }));
        } catch {
            Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
        }
    };

    const confirmArrival = () =>
        Alert.alert(
            'Confirmation d\'arrivée',
            `Êtes-vous bien arrivé à :\n${order?.pickup_address || 'l\'adresse de collecte'}`,
            [
                { text: 'Pas encore', style: 'cancel' },
                { text: 'Oui, je suis arrivé ✓', onPress: () => updateStatus('arrived_pickup') },
            ]
        );

    // ── External nav ───────────────────────────────────────────────────────────
    const openNav = () => {
        const c = getCoords(order);
        if (!c) { Alert.alert('Erreur', 'Coordonnées non disponibles.'); return; }
        const url = Platform.select({
            ios: `http://maps.apple.com/?daddr=${c.latitude},${c.longitude}&dirflg=d`,
            android: `google.navigation:q=${c.latitude},${c.longitude}&mode=d`,
        });
        Linking.openURL(url).catch(() =>
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`)
        );
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!itemCount || itemCount === '0') {
            Alert.alert('Requis', 'Indiquez le nombre d\'articles collectés.'); return;
        }
        if (!signature) {
            Alert.alert('Requis', 'La signature du client est obligatoire.'); return;
        }
        if (photos.length === 0) {
            Alert.alert('Aucune photo', 'Continuer sans photo ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Continuer', onPress: doSubmit },
            ]);
            return;
        }
        await doSubmit();
    };

    const doSubmit = async () => {
        setSubmitting(true);
        try {
            await ordersAPI.scanOrder(orderId, {
                checkpoint: 'picked_up',
                item_count: parseInt(itemCount, 10),
                signature_data: signature,
                photos,
                notes,
            });
            Alert.alert('Collecte confirmée ✓', 'La commande a bien été collectée.', [
                { text: 'OK', onPress: () => navigation.popToTop() },
            ]);
        } catch (err) {
            Alert.alert('Erreur', err.response?.data?.error || 'Échec de la confirmation.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Derived ────────────────────────────────────────────────────────────────
    const coords      = getCoords(order);
    const isEnRoute   = order?.status === 'driver_en_route_pickup';
    const isArrived   = order?.status === 'arrived_pickup';
    const stepsOk     = { qr: isVerified, items: !!itemCount && itemCount !== '0', sig: !!signature };
    const canConfirm  = stepsOk.qr && stepsOk.items && stepsOk.sig;

    const mapMarkers = [
        ...(coords ? [{ latitude: coords.latitude, longitude: coords.longitude, title: 'Collecte', description: order?.pickup_address || '' }] : []),
        ...(userLocation ? [{ latitude: userLocation.latitude, longitude: userLocation.longitude, title: 'Vous', description: '' }] : []),
    ];

    const getPrimaryBtn = () => {
        if (!order) return null;
        switch (order.status) {
            case 'assigned': case 'pending':
                return { label: 'Démarrer la collecte', color: theme.colors.primary, icon: 'motorbike', action: () => updateStatus('driver_en_route_pickup') };
            case 'driver_en_route_pickup':
                return { label: 'Je suis Arrivé', color: theme.colors.success, icon: 'map-marker-check', action: confirmArrival };
            case 'arrived_pickup':
                return { label: isExpanded ? 'Réduire' : 'Voir la collecte', color: theme.colors.primary, icon: 'package-variant-closed', action: toggleSheet };
            default:
                return { label: 'Détails', color: theme.colors.textSecondary, icon: 'chevron-up', action: toggleSheet };
        }
    };
    const btn = getPrimaryBtn();

    // ── Guards ─────────────────────────────────────────────────────────────────
    if (loading) return <View style={s.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    if (!order)  return null;

    const statusLabel = {
        assigned:               'Assigné',
        pending:                'En attente',
        driver_en_route_pickup: 'En route',
        arrived_pickup:         'Arrivé',
        picked_up:              'Collecté',
    }[order.status] || order.status.replace(/_/g, ' ');

    return (
        <View style={s.container}>
            {/* ── Map ── */}
            <OpenStreetMap
                style={StyleSheet.absoluteFill}
                initialRegion={{
                    latitude:      coords?.latitude  || userLocation?.latitude  || 0.3924,
                    longitude:     coords?.longitude || userLocation?.longitude || 9.4536,
                    latitudeDelta: 0.02, longitudeDelta: 0.02,
                }}
                markers={mapMarkers}
                polylines={routeCoords.length ? [{ coordinates: routeCoords, strokeColor: theme.colors.primary, strokeWidth: 5 }] : []}
                interaction="nav"
            />

            {/* ── ETA pill (en route) ── */}
            {routeInfo && isEnRoute && (
                <View style={s.etaPill}>
                    <MaterialCommunityIcons name="clock-fast" size={15} color="#fff" />
                    <Text style={s.etaTxt}>{Math.ceil(routeInfo.duration / 60)} min</Text>
                    <View style={s.etaDiv} />
                    <MaterialCommunityIcons name="map-marker-distance" size={15} color="#fff" />
                    <Text style={s.etaTxt}>{(routeInfo.distance / 1000).toFixed(1)} km</Text>
                </View>
            )}

            {/* ── Arrived badge ── */}
            {isArrived && (
                <View style={[s.etaPill, { backgroundColor: theme.colors.success }]}>
                    <MaterialCommunityIcons name="check-circle" size={15} color="#fff" />
                    <Text style={s.etaTxt}>Arrivé — collecte en cours</Text>
                </View>
            )}

            {/* ── Top controls ── */}
            <View style={s.topRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.circleBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#111" />
                </TouchableOpacity>
                <TouchableOpacity onPress={openNav} style={s.navBtn}>
                    <MaterialCommunityIcons name="navigation-variant" size={17} color="#fff" />
                    <Text style={s.navBtnTxt}>Naviguer</Text>
                </TouchableOpacity>
            </View>

            {/* ── Bottom sheet ── */}
            <Animated.View style={[s.sheet, { height: sheetAnim }]}>

                {/* Drag handle */}
                <TouchableOpacity activeOpacity={0.85} onPress={toggleSheet} style={s.handleWrap}>
                    <View style={s.handleBar} />
                </TouchableOpacity>

                {/* Header row */}
                <View style={s.sheetHead}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.clientName} numberOfLines={1}>{order.customer_name || '—'}</Text>
                        <Text style={s.orderRef}>Commande #{order.order_number}</Text>
                    </View>
                    <View style={[s.badge, isArrived && s.badgeGreen]}>
                        <Text style={s.badgeTxt}>{statusLabel}</Text>
                    </View>
                </View>

                {/* Primary action + map icon */}
                <View style={s.actionRow}>
                    {btn && (
                        <TouchableOpacity style={[s.mainBtn, { backgroundColor: btn.color }]} onPress={btn.action}>
                            <MaterialCommunityIcons name={btn.icon} size={19} color="#fff" style={{ marginRight: 7 }} />
                            <Text style={s.mainBtnTxt}>{btn.label}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={s.mapIcon} onPress={openNav}>
                        <MaterialCommunityIcons name="google-maps" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* ── Scrollable content ── */}
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={s.scrollPad}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                    >
                        {/* Step indicator (shown when arrived) */}
                        {isArrived && (
                            <View style={s.steps}>
                                {[
                                    { done: stepsOk.qr,    label: 'QR',        icon: 'qrcode-scan' },
                                    { done: stepsOk.items, label: 'Articles',   icon: 'package-variant' },
                                    { done: stepsOk.sig,   label: 'Signature',  icon: 'draw' },
                                ].map((step, i) => (
                                    <React.Fragment key={step.label}>
                                        <View style={s.step}>
                                            <View style={[s.stepCircle, step.done && s.stepCircleDone]}>
                                                <MaterialCommunityIcons
                                                    name={step.done ? 'check' : step.icon}
                                                    size={16}
                                                    color={step.done ? '#fff' : '#9CA3AF'}
                                                />
                                            </View>
                                            <Text style={[s.stepLbl, step.done && s.stepLblDone]}>{step.label}</Text>
                                        </View>
                                        {i < 2 && <View style={[s.stepLine, step.done && s.stepLineDone]} />}
                                    </React.Fragment>
                                ))}
                            </View>
                        )}

                        {/* Customer info */}
                        <View style={s.clientRow}>
                            <View style={s.avatar}>
                                <Text style={s.avatarTxt}>{(order.customer_name || '?').substring(0, 2).toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.clientNameFull}>{order.customer_name || '—'}</Text>
                                <Text style={s.phone}>{order.customer_phone || '—'}</Text>
                            </View>
                            <TouchableOpacity style={s.callBtn} onPress={() => order.customer_phone && Linking.openURL(`tel:${order.customer_phone}`)}>
                                <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Address */}
                        {order.pickup_address ? (
                            <View style={s.addrCard}>
                                <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
                                <Text style={s.addrTxt} numberOfLines={2}>{order.pickup_address}</Text>
                            </View>
                        ) : null}

                        {/* Action cards */}
                        <View style={s.cards}>
                            {/* Show QR */}
                            <TouchableOpacity style={s.card} onPress={() => setShowQR(true)}>
                                <View style={[s.cardIcon, { backgroundColor: '#DBEAFE' }]}>
                                    <MaterialCommunityIcons name="qrcode" size={24} color="#2563EB" />
                                </View>
                                <Text style={s.cardLbl}>Montrer QR</Text>
                            </TouchableOpacity>

                            {/* Scan QR */}
                            <TouchableOpacity
                                style={[s.card, isVerified && s.cardDone]}
                                onPress={() => navigation.navigate('ScanQR', {
                                    orderId,
                                    onScan: (data) => {
                                        setIsVerified(true);
                                        Alert.alert('QR Vérifié ✓', `Commande #${data.num || data.order_number || ''} confirmée.`);
                                    },
                                })}
                            >
                                <View style={[s.cardIcon, { backgroundColor: isVerified ? '#D1FAE5' : '#DCFCE7' }]}>
                                    <MaterialCommunityIcons name={isVerified ? 'check-decagram' : 'qrcode-scan'} size={24} color={isVerified ? '#059669' : '#16A34A'} />
                                </View>
                                <Text style={[s.cardLbl, isVerified && { color: '#059669' }]}>{isVerified ? 'Vérifié ✓' : 'Scanner QR'}</Text>
                            </TouchableOpacity>

                            {/* Signature */}
                            <TouchableOpacity
                                style={[s.card, signature && s.cardDone]}
                                onPress={() => setShowSignaturePad(true)}
                            >
                                <View style={[s.cardIcon, { backgroundColor: signature ? '#D1FAE5' : '#FEF9C3' }]}>
                                    <MaterialCommunityIcons name={signature ? 'check-circle' : 'draw'} size={24} color={signature ? '#059669' : '#CA8A04'} />
                                </View>
                                <Text style={[s.cardLbl, signature && { color: '#059669' }]}>{signature ? 'Signé ✓' : 'Signature'}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Item count */}
                        <View style={s.sec}>
                            <Text style={s.secTitle}>Articles collectés</Text>
                            <View style={s.counter}>
                                <TouchableOpacity style={s.cntBtn} onPress={() => setItemCount(v => Math.max(0, parseInt(v || 0) - 1).toString())}>
                                    <MaterialCommunityIcons name="minus" size={20} color={theme.colors.primary} />
                                </TouchableOpacity>
                                <View style={{ alignItems: 'center', minWidth: 70 }}>
                                    <TextInput
                                        style={s.cntInput}
                                        value={itemCount}
                                        onChangeText={setItemCount}
                                        keyboardType="number-pad"
                                        placeholder="0"
                                        placeholderTextColor="#D1D5DB"
                                    />
                                    <Text style={s.cntUnit}>articles</Text>
                                </View>
                                <TouchableOpacity style={s.cntBtn} onPress={() => setItemCount(v => (parseInt(v || 0) + 1).toString())}>
                                    <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>
                            {itemCount && order.confirmed_item_count && parseInt(itemCount, 10) !== parseInt(order.confirmed_item_count, 10) && (
                                <View style={s.warn}>
                                    <MaterialCommunityIcons name="alert" size={14} color="#D97706" />
                                    <Text style={s.warnTxt}>Attendu : {order.confirmed_item_count} articles</Text>
                                </View>
                            )}
                        </View>

                        {/* Notes */}
                        <View style={s.sec}>
                            <Text style={s.secTitle}>Notes (optionnel)</Text>
                            <TextInput
                                style={s.notesInput}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="État des vêtements, observations..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Photos */}
                        <View style={s.sec}>
                            <Text style={s.secTitle}>Photos des articles</Text>
                            <PhotoCapture photos={photos} onPhotosChange={setPhotos} maxPhotos={5} />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer confirm button */}
                {isArrived && (
                    <View style={s.footer}>
                        <TouchableOpacity
                            style={[s.confirmBtn, !canConfirm && s.confirmBtnOff]}
                            onPress={handleSubmit}
                            disabled={submitting || !canConfirm}
                        >
                            {submitting
                                ? <ActivityIndicator color="#fff" />
                                : <>
                                    <MaterialCommunityIcons name="check-circle" size={19} color="#fff" style={{ marginRight: 7 }} />
                                    <Text style={s.confirmBtnTxt}>Confirmer la collecte</Text>
                                  </>
                            }
                        </TouchableOpacity>
                        {!canConfirm && (
                            <Text style={s.hint}>
                                Manque : {!stepsOk.qr ? 'QR ' : ''}{!stepsOk.items ? 'Articles ' : ''}{!stepsOk.sig ? 'Signature' : ''}
                            </Text>
                        )}
                    </View>
                )}
            </Animated.View>

            <SignaturePad
                visible={showSignaturePad}
                onSave={(d) => { setSignature(d); setShowSignaturePad(false); }}
                onCancel={() => setShowSignaturePad(false)}
            />
            <OrderReceipt visible={showQR} order={order} onClose={() => setShowQR(false)} />
        </View>
    );
};

const s = StyleSheet.create({
    container: { flex: 1 },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // ETA / arrived pill
    etaPill: {
        position: 'absolute', top: 130, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(15,15,15,0.82)',
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30,
        zIndex: 20, elevation: 8,
    },
    etaTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
    etaDiv: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.35)' },

    // Top controls
    topRow: {
        position: 'absolute', top: 56, left: 16, right: 16,
        flexDirection: 'row', justifyContent: 'space-between', zIndex: 10,
    },
    circleBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
    },
    navBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16, height: 44, borderRadius: 22,
        elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
    },
    navBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Bottom sheet — overflow:hidden clips rounded corners; ScrollView still works with nestedScrollEnabled
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        overflow: 'hidden',
        elevation: 22,
        shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 10,
    },
    handleWrap: { paddingVertical: 10, alignItems: 'center' },
    handleBar:  { width: 36, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2 },

    sheetHead: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingBottom: 10,
    },
    clientName: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    orderRef:   { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
    badge: {
        backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8, marginLeft: 8,
    },
    badgeGreen: { backgroundColor: theme.colors.success },
    badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

    actionRow: {
        flexDirection: 'row', paddingHorizontal: 18, paddingBottom: 12, gap: 10,
    },
    mainBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 13, borderRadius: 14, elevation: 2,
    },
    mainBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
    mapIcon: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#E5E7EB',
    },

    scrollPad: { paddingHorizontal: 18, paddingBottom: 120, paddingTop: 4 },

    // Steps
    steps: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, marginBottom: 10,
    },
    step:  { alignItems: 'center', gap: 4 },
    stepCircle: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#E5E7EB',
    },
    stepCircleDone: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
    stepLbl:     { fontSize: 11, color: '#6B7280', fontWeight: '600' },
    stepLblDone: { color: theme.colors.success },
    stepLine:     { width: 38, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4, marginBottom: 18 },
    stepLineDone: { backgroundColor: theme.colors.success },

    // Customer row
    clientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar:    {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: theme.colors.primary + '18', justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    avatarTxt:     { fontSize: 15, fontWeight: '800', color: theme.colors.primary },
    clientNameFull: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    phone:          { fontSize: 13, color: theme.colors.primary, fontWeight: '600', marginTop: 1 },
    callBtn:        {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: theme.colors.primary + '12', justifyContent: 'center', alignItems: 'center',
    },

    // Address
    addrCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 7,
        backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginBottom: 12,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    addrTxt: { flex: 1, fontSize: 13, color: theme.colors.text, lineHeight: 19 },

    // Action cards
    cards: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    card: {
        flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10,
        alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB',
    },
    cardDone: { borderColor: '#059669', backgroundColor: '#F0FDF4' },
    cardIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    cardLbl:  { fontSize: 11, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },

    // Counter
    sec:     { marginBottom: 16 },
    secTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
    counter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18,
        backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    cntBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#E5E7EB', elevation: 1,
    },
    cntInput: { fontSize: 28, fontWeight: '800', color: theme.colors.text, textAlign: 'center', padding: 0, minWidth: 50 },
    cntUnit:  { fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: '600', marginTop: 1 },

    warn: {
        flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7,
        backgroundColor: '#FEF3C7', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6,
    },
    warnTxt: { fontSize: 12, color: '#92400E', fontWeight: '600' },

    notesInput: {
        backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10,
        fontSize: 13, color: theme.colors.text, borderWidth: 1, borderColor: '#E5E7EB',
        minHeight: 65, textAlignVertical: 'top',
    },

    // Footer
    footer: { padding: 14, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    confirmBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.colors.success, paddingVertical: 14, borderRadius: 14,
    },
    confirmBtnOff: { backgroundColor: '#9CA3AF' },
    confirmBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
    hint: { textAlign: 'center', fontSize: 11, color: '#6B7280', marginTop: 6 },
});

export default PickupOrderScreen;
