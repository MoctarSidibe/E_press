// Add/Edit an address. Opens from AddressesScreen.
// route.params.addressId  → edit mode (pre-fills form). Absent → create mode.
import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import NativeMapPicker from '../../components/map/NativeMapPicker';
import { locationsAPI } from '../../services/api';
import theme from '../../theme/theme';

const TEAL = '#00D4D4';

// Libreville centre — sensible default when device location is unavailable.
const DEFAULT_REGION = {
    latitude: 0.4162,
    longitude: 9.4673,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
};

export default function AddressFormScreen({ navigation, route }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const editingId = route?.params?.addressId || null;
    const isEdit = !!editingId;

    const [label, setLabel]         = useState('');
    const [address, setAddress]     = useState('');
    const [instructions, setInstr]  = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [coords, setCoords]       = useState(null);
    const [region, setRegion]       = useState(DEFAULT_REGION);

    const [loadingAddr, setLoadingAddr] = useState(isEdit);
    const [saving, setSaving]           = useState(false);
    const [locating, setLocating]       = useState(false);

    // On mount: pre-fill from existing record (edit), then try to recenter map
    // on the user's GPS (create mode only).
    useEffect(() => {
        (async () => {
            if (isEdit) {
                try {
                    const { data } = await locationsAPI.getOne(editingId);
                    if (data) {
                        setLabel(data.label || '');
                        setAddress(data.address || '');
                        setInstr(data.instructions || '');
                        setIsDefault(!!data.is_default);
                        if (data.latitude != null && data.longitude != null) {
                            const c = {
                                latitude: parseFloat(data.latitude),
                                longitude: parseFloat(data.longitude),
                            };
                            setCoords(c);
                            setRegion({ ...c, latitudeDelta: 0.01, longitudeDelta: 0.01 });
                        }
                    }
                } catch (e) {
                    Alert.alert(t('common.error'), t('addresses.form.loadError'));
                } finally {
                    setLoadingAddr(false);
                }
            } else {
                // Create mode: try to center map on device GPS.
                try {
                    const perm = await Location.getForegroundPermissionsAsync();
                    if (perm.status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                        });
                        setRegion(r => ({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                            latitudeDelta: r.latitudeDelta,
                            longitudeDelta: r.longitudeDelta,
                        }));
                    }
                } catch (_) { /* fall back to default region */ }
            }
        })();
    }, [editingId, isEdit, t]);

    const useMyLocation = async () => {
        setLocating(true);
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== 'granted') {
                setLocating(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setCoords(c);
            setRegion({ ...c, latitudeDelta: 0.005, longitudeDelta: 0.005 });
        } catch (e) {
            console.warn('[AddressForm] GPS error:', e.message);
        } finally {
            setLocating(false);
        }
    };

    const handleSave = async () => {
        if (!label.trim())   { Alert.alert(t('common.error'), t('addresses.form.labelRequired'));   return; }
        if (!address.trim()) { Alert.alert(t('common.error'), t('addresses.form.addressRequired')); return; }
        if (!coords)         { Alert.alert(t('common.error'), t('addresses.form.locationRequired')); return; }

        setSaving(true);
        const payload = {
            label: label.trim(),
            address: address.trim(),
            latitude: coords.latitude,
            longitude: coords.longitude,
            instructions: instructions.trim() || null,
            isDefault,
        };
        try {
            if (isEdit) await locationsAPI.update(editingId, payload);
            else        await locationsAPI.create(payload);
            navigation.goBack();
        } catch (e) {
            Alert.alert(
                t('common.error'),
                e.response?.data?.error || e.message || t('addresses.form.saveError')
            );
        } finally {
            setSaving(false);
        }
    };

    if (loadingAddr) {
        return (
            <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={TEAL} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEdit ? t('addresses.form.editTitle') : t('addresses.form.newTitle')}
                </Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Label */}
                <View style={styles.field}>
                    <Text style={styles.label}>{t('addresses.form.labelLabel')}</Text>
                    <TextInput
                        style={styles.input}
                        value={label}
                        onChangeText={setLabel}
                        placeholder={t('addresses.form.labelPlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        editable={!saving}
                    />
                </View>

                {/* Address */}
                <View style={styles.field}>
                    <Text style={styles.label}>{t('addresses.form.addressLabel')}</Text>
                    <TextInput
                        style={styles.input}
                        value={address}
                        onChangeText={setAddress}
                        placeholder={t('addresses.form.addressPlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        editable={!saving}
                    />
                </View>

                {/* Map */}
                <Text style={styles.label}>{t('addresses.form.locationLabel')}</Text>
                <Text style={styles.helper}>{t('addresses.form.locationHelper')}</Text>
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
                    disabled={locating || saving}
                    activeOpacity={0.85}
                >
                    {locating
                        ? <ActivityIndicator size="small" color={TEAL} />
                        : <MaterialCommunityIcons name="crosshairs-gps" size={16} color={TEAL} />}
                    <Text style={styles.gpsBtnText}>{t('addresses.form.useMyLocation')}</Text>
                </TouchableOpacity>

                {coords && (
                    <Text style={styles.coordsText}>
                        📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                    </Text>
                )}

                {/* Instructions */}
                <View style={[styles.field, { marginTop: 14 }]}>
                    <Text style={styles.label}>{t('addresses.form.instructionsLabel')}</Text>
                    <TextInput
                        style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                        value={instructions}
                        onChangeText={setInstr}
                        placeholder={t('addresses.form.instructionsPlaceholder')}
                        placeholderTextColor={theme.colors.textTertiary}
                        multiline
                        editable={!saving}
                    />
                </View>

                {/* Default toggle */}
                <View style={styles.defaultRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>{t('addresses.form.defaultLabel')}</Text>
                        <Text style={styles.helper}>{t('addresses.form.defaultHelper')}</Text>
                    </View>
                    <Switch
                        value={isDefault}
                        onValueChange={setIsDefault}
                        trackColor={{ false: theme.colors.border, true: TEAL + '88' }}
                        thumbColor={isDefault ? TEAL : '#f4f3f4'}
                        disabled={saving}
                    />
                </View>
            </ScrollView>

            {/* Save bar */}
            <View style={[styles.saveBar, { paddingBottom: insets.bottom + 10 }]}>
                <TouchableOpacity
                    style={[styles.saveBtn, (saving || !coords || !label.trim() || !address.trim()) && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving || !coords || !label.trim() || !address.trim()}
                    activeOpacity={0.88}
                >
                    {saving
                        ? <ActivityIndicator color="#fff" />
                        : (
                            <>
                                <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
                                <Text style={styles.saveBtnText}>{t('addresses.form.save')}</Text>
                            </>
                        )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center:    { justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 18, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: theme.colors.background,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: theme.colors.border,
    },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: theme.colors.text, textAlign: 'center' },

    scrollContent: { padding: 18, paddingBottom: 32 },

    field: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '800', color: theme.colors.text, marginBottom: 6, letterSpacing: 0.2 },
    helper: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 8 },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
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
        borderWidth: 1, borderColor: TEAL,
        marginBottom: 8,
    },
    gpsBtnText: { color: TEAL, fontWeight: '700', fontSize: 13 },
    coordsText: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },

    defaultRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: theme.colors.surface,
        borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: theme.colors.border,
        marginTop: 6,
    },

    saveBar: {
        paddingHorizontal: 18, paddingTop: 10,
        borderTopWidth: 1, borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: TEAL,
        borderRadius: 14, paddingVertical: 14,
        shadowColor: TEAL, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    saveBtnDisabled: { backgroundColor: theme.colors.textTertiary, shadowOpacity: 0, elevation: 0 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
