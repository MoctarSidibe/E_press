// Cleaner onboarding step — collect laverie info before the cleaner can accept
// orders. Gated by CleanerNavigator: shown whenever the cleaner has no laverie
// linked yet. Idempotent (the backend upserts by user_id) so retries are safe.
import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import NativeMapPicker from '../../components/map/NativeMapPicker';
import { laveriesAPI } from '../../services/api';
import theme from '../../theme/theme';

// Default region centered on Libreville, Gabon — where the service launches.
const DEFAULT_REGION = {
    latitude: 0.4162,
    longitude: 9.4673,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

export default function LaverieSetupScreen({ onSaved }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [radiusKm, setRadiusKm] = useState('5');
    const [coords, setCoords] = useState(null);
    const [region, setRegion] = useState(DEFAULT_REGION);
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(false);

    // On mount: try to fetch device location and any pre-existing laverie record.
    useEffect(() => {
        (async () => {
            try {
                const res = await laveriesAPI.getMine();
                const existing = res.data?.laverie;
                if (existing) {
                    setName(existing.name || '');
                    setAddress(existing.address || '');
                    setPhone(existing.phone || '');
                    setRadiusKm(String(existing.radius_km || 5));
                    if (existing.lat != null && existing.lng != null) {
                        const c = { latitude: parseFloat(existing.lat), longitude: parseFloat(existing.lng) };
                        setCoords(c);
                        setRegion({ ...c, latitudeDelta: 0.01, longitudeDelta: 0.01 });
                    }
                }
            } catch (_) { /* no existing laverie — keep defaults */ }

            // Center map on the device GPS if permission granted.
            try {
                const perm = await Location.requestForegroundPermissionsAsync();
                if (perm.status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    setRegion(r => ({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        latitudeDelta: r.latitudeDelta,
                        longitudeDelta: r.longitudeDelta,
                    }));
                }
            } catch (_) { /* ignore — user can pan manually */ }
        })();
    }, []);

    const useMyLocation = async () => {
        setLocating(true);
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert(t('laverieSetup.locationDeniedTitle'), t('laverieSetup.locationDeniedMsg'));
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setCoords(c);
            setRegion({ ...c, latitudeDelta: 0.005, longitudeDelta: 0.005 });
        } catch (e) {
            Alert.alert(t('common.error'), e.message || t('laverieSetup.locationError'));
        } finally {
            setLocating(false);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert(t('common.error'), t('laverieSetup.nameRequired'));
            return;
        }
        if (!coords) {
            Alert.alert(t('common.error'), t('laverieSetup.locationRequired'));
            return;
        }
        const radiusNum = parseFloat(radiusKm);
        if (!radiusNum || radiusNum <= 0) {
            Alert.alert(t('common.error'), t('laverieSetup.radiusInvalid'));
            return;
        }

        setLoading(true);
        try {
            await laveriesAPI.saveMine({
                name: name.trim(),
                address: address.trim(),
                phone: phone.trim(),
                lat: coords.latitude,
                lng: coords.longitude,
                radius_km: radiusNum,
            });
            if (onSaved) onSaved();
        } catch (e) {
            Alert.alert(
                t('common.error'),
                e.response?.data?.error || e.message || t('laverieSetup.saveError')
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="dark" />

            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="washing-machine" size={28} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{t('laverieSetup.title')}</Text>
                        <Text style={styles.subtitle}>{t('laverieSetup.subtitle')}</Text>
                    </View>
                </View>

                {/* Form */}
                <View style={styles.field}>
                    <Text style={styles.label}>{t('laverieSetup.nameLabel')}</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder={t('laverieSetup.namePlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        editable={!loading}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>{t('laverieSetup.addressLabel')}</Text>
                    <TextInput
                        style={styles.input}
                        value={address}
                        onChangeText={setAddress}
                        placeholder={t('laverieSetup.addressPlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        editable={!loading}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>{t('laverieSetup.phoneLabel')}</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+241..."
                            placeholderTextColor={theme.colors.textTertiary}
                            keyboardType="phone-pad"
                            editable={!loading}
                        />
                    </View>
                    <View style={[styles.field, { width: 110 }]}>
                        <Text style={styles.label}>{t('laverieSetup.radiusLabel')}</Text>
                        <TextInput
                            style={styles.input}
                            value={radiusKm}
                            onChangeText={setRadiusKm}
                            placeholder="5"
                            placeholderTextColor={theme.colors.textTertiary}
                            keyboardType="decimal-pad"
                            editable={!loading}
                        />
                    </View>
                </View>

                {/* Map picker */}
                <Text style={styles.label}>{t('laverieSetup.locationLabel')}</Text>
                <Text style={styles.helper}>{t('laverieSetup.locationHelper')}</Text>

                <View style={styles.mapWrap}>
                    <NativeMapPicker
                        region={region}
                        markerCoordinate={coords}
                        onLocationChange={setCoords}
                        style={styles.map}
                    />
                </View>

                <TouchableOpacity
                    style={styles.gpsBtn}
                    onPress={useMyLocation}
                    disabled={locating || loading}
                    activeOpacity={0.85}
                >
                    {locating
                        ? <ActivityIndicator size="small" color={theme.colors.primary} />
                        : <MaterialCommunityIcons name="crosshairs-gps" size={16} color={theme.colors.primary} />
                    }
                    <Text style={styles.gpsBtnText}>{t('laverieSetup.useMyLocation')}</Text>
                </TouchableOpacity>

                {coords && (
                    <Text style={styles.coordsText}>
                        📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                    </Text>
                )}

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitBtn, (loading || !coords || !name.trim()) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading || !coords || !name.trim()}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : (
                            <>
                                <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                                <Text style={styles.submitBtnText}>{t('laverieSetup.submitButton')}</Text>
                            </>
                        )
                    }
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    scroll: { paddingHorizontal: 20 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24,
    },
    headerIcon: {
        width: 50, height: 50, borderRadius: 14,
        backgroundColor: theme.colors.primary + '18',
        justifyContent: 'center', alignItems: 'center',
    },
    title: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
    subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 18 },
    field: { marginBottom: 14 },
    row: { flexDirection: 'row', gap: 10 },
    label: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
    helper: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 15, color: theme.colors.text,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    mapWrap: {
        height: 240, borderRadius: 14, overflow: 'hidden',
        borderWidth: 1, borderColor: theme.colors.border,
        marginBottom: 10,
    },
    map: { flex: 1 },
    gpsBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 10, borderRadius: 10,
        borderWidth: 1, borderColor: theme.colors.primary,
        marginBottom: 8,
    },
    gpsBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
    coordsText: {
        fontSize: 12, color: theme.colors.textSecondary,
        textAlign: 'center', marginBottom: 16,
    },
    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: theme.colors.primary,
        borderRadius: 14, paddingVertical: 14,
        marginTop: 8,
    },
    submitBtnDisabled: { backgroundColor: theme.colors.textTertiary },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
