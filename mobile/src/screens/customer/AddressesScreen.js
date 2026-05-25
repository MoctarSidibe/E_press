// Customer address book — list, set default, edit, delete.
// Entry point: Profile → "Mes adresses".
// Add/Edit pushes to AddressFormScreen.
import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { locationsAPI } from '../../services/api';
import theme from '../../theme/theme';

const TEAL = '#00D4D4';

export default function AddressesScreen({ navigation }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId]       = useState(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await locationsAPI.getAll();
            setAddresses(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.warn('[Addresses] load error:', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Refresh on every focus so changes from AddressForm show up immediately.
    useFocusEffect(useCallback(() => { load(true); }, [load]));

    const onRefresh = () => { setRefreshing(true); load(true); };

    const handleSetDefault = async (addr) => {
        if (addr.is_default) return;
        setBusyId(addr.id);
        try {
            await locationsAPI.update(addr.id, { isDefault: true });
            await load(true);
        } catch (e) {
            Alert.alert(t('common.error'), e.message || t('errors.generic'));
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = (addr) => {
        Alert.alert(
            t('addresses.deleteConfirmTitle'),
            t('addresses.deleteConfirmMsg'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('addresses.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setBusyId(addr.id);
                        try {
                            await locationsAPI.delete(addr.id);
                            await load(true);
                        } catch (e) {
                            Alert.alert(t('common.error'), e.message || t('errors.generic'));
                        } finally {
                            setBusyId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = (addr) => {
        navigation.navigate('AddressForm', { addressId: addr.id });
    };

    const handleAdd = () => {
        navigation.navigate('AddressForm');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{t('addresses.title')}</Text>
                    <Text style={styles.subtitle}>{t('addresses.subtitle')}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={TEAL} />
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                >
                    {addresses.length === 0 ? (
                        <View style={styles.empty}>
                            <View style={styles.emptyIcon}>
                                <MaterialCommunityIcons name="map-marker-plus" size={42} color={TEAL} />
                            </View>
                            <Text style={styles.emptyTitle}>{t('addresses.empty.title')}</Text>
                            <Text style={styles.emptySubtitle}>{t('addresses.empty.subtitle')}</Text>
                        </View>
                    ) : (
                        addresses.map(addr => (
                            <View key={addr.id} style={[styles.card, addr.is_default && styles.cardDefault]}>
                                <View style={styles.cardTopRow}>
                                    <View style={[styles.pin, addr.is_default && styles.pinDefault]}>
                                        <MaterialCommunityIcons
                                            name={addr.is_default ? 'home-heart' : 'map-marker'}
                                            size={20}
                                            color={addr.is_default ? '#fff' : TEAL}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.labelRow}>
                                            <Text style={styles.label} numberOfLines={1}>{addr.label}</Text>
                                            {addr.is_default && (
                                                <View style={styles.defaultBadge}>
                                                    <Text style={styles.defaultBadgeText}>{t('addresses.defaultBadge')}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.address} numberOfLines={2}>{addr.address}</Text>
                                        {addr.instructions ? (
                                            <Text style={styles.instructions} numberOfLines={1}>
                                                💬 {addr.instructions}
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>

                                {/* Action row */}
                                <View style={styles.actions}>
                                    {!addr.is_default && (
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => handleSetDefault(addr)}
                                            disabled={busyId === addr.id}
                                        >
                                            <MaterialCommunityIcons name="star-outline" size={16} color={TEAL} />
                                            <Text style={[styles.actionText, { color: TEAL }]}>
                                                {t('addresses.setDefault')}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => handleEdit(addr)}
                                        disabled={busyId === addr.id}
                                    >
                                        <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.colors.text} />
                                        <Text style={styles.actionText}>{t('addresses.edit')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => handleDelete(addr)}
                                        disabled={busyId === addr.id}
                                    >
                                        {busyId === addr.id
                                            ? <ActivityIndicator size="small" color={theme.colors.error} />
                                            : <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.colors.error} />
                                        }
                                        <Text style={[styles.actionText, { color: theme.colors.error }]}>
                                            {t('addresses.delete')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Floating add button */}
            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 18 }]}
                onPress={handleAdd}
                activeOpacity={0.88}
            >
                <MaterialCommunityIcons name="plus" size={22} color="#fff" />
                <Text style={styles.fabText}>{t('addresses.addButton')}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 18, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: theme.colors.background,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: theme.colors.border,
    },
    title:    { fontSize: 18, fontWeight: '900', color: theme.colors.text },
    subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

    scrollContent: { padding: 18, paddingBottom: 110 },

    // Empty state
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: TEAL + '14',
        justifyContent: 'center', alignItems: 'center', marginBottom: 18,
    },
    emptyTitle:    { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginBottom: 6, textAlign: 'center' },
    emptySubtitle: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 30, lineHeight: 18 },

    // Address card
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        borderWidth: 1, borderColor: theme.colors.border,
        padding: 14, marginBottom: 12,
    },
    cardDefault: { borderColor: TEAL + '70', backgroundColor: TEAL + '06' },
    cardTopRow:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    pin: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: TEAL + '18',
        justifyContent: 'center', alignItems: 'center',
    },
    pinDefault:  { backgroundColor: TEAL },
    labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    label:       { fontSize: 15, fontWeight: '800', color: theme.colors.text, flexShrink: 1 },
    defaultBadge: {
        backgroundColor: TEAL,
        paddingHorizontal: 7, paddingVertical: 2,
        borderRadius: 999,
    },
    defaultBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
    address:      { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
    instructions: { fontSize: 12, color: theme.colors.textTertiary, fontStyle: 'italic', marginTop: 4 },

    actions: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10,
        borderTopWidth: 1, borderTopColor: theme.colors.border,
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: theme.colors.background,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    actionText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },

    // FAB
    fab: {
        position: 'absolute', right: 18,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: TEAL,
        borderRadius: 999,
        paddingHorizontal: 16, paddingVertical: 13,
        shadowColor: TEAL, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },
    fabText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
