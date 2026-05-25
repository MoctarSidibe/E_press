import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { displayIdentity } from '../../utils/userIdentity';
import theme from '../../theme/theme';

const TEAL = '#00D4D4';

const DriverProfileScreen = () => {
    const { t } = useTranslation();
    const { logout, user } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            t('customer.profile.logout'),
            t('customer.profile.confirmLogout'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('customer.profile.logout'), style: 'destructive', onPress: logout },
            ]
        );
    };

    const kyc = user?.kycStatus || 'not_submitted';
    const kycCfg = {
        approved:      { icon: 'check-decagram', bg: '#10B981', label: t('kyc.labels.approved') },
        pending:       { icon: 'clock-outline',  bg: '#F59E0B', label: t('kyc.labels.pending') },
        rejected:      { icon: 'alert-circle',   bg: '#EF4444', label: t('kyc.labels.rejected') },
        not_submitted: { icon: 'shield-off',      bg: '#6B7280', label: t('kyc.labels.notSubmitted') },
    }[kyc] || { icon: 'shield-off', bg: '#6B7280', label: kyc };

    return (
        <View style={styles.container}>
            {/* Hero header */}
            <View style={styles.hero}>
                <LottieView
                    source={require('../../../assets/lotties/motorcycle.json')}
                    autoPlay loop
                    style={styles.lottie}
                    resizeMode="contain"
                />
                <View style={styles.heroOverlay}>
                    <View style={styles.avatarRing}>
                        <Text style={styles.avatarText}>
                            {user?.full_name?.substring(0, 2).toUpperCase() || 'LV'}
                        </Text>
                    </View>
                    <Text style={styles.name}>{user?.full_name || 'Livreur'}</Text>
                    <Text style={styles.email}>{displayIdentity(user)}</Text>
                    <View style={styles.roleRow}>
                        <View style={styles.rolePill}>
                            <MaterialCommunityIcons name="bike-fast" size={13} color={TEAL} />
                            <Text style={styles.rolePillText}>Livreur</Text>
                        </View>
                        <View style={[styles.kycBadge, { backgroundColor: kycCfg.bg }]}>
                            <MaterialCommunityIcons name={kycCfg.icon} size={13} color="#fff" />
                            <Text style={styles.kycBadgeText}>{kycCfg.label}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Body */}
            <View style={styles.body}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} />
                    <Text style={styles.logoutText}>{t('customer.profile.logout')}</Text>
                </TouchableOpacity>
                <Text style={styles.version}>Version 1.0.0</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },

    hero: {
        height: 280,
        backgroundColor: '#0a1628',
        overflow: 'hidden',
    },
    lottie: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 24,
        paddingTop: 50,
    },
    avatarRing: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: TEAL,
        borderWidth: 3, borderColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 10,
        shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
    },
    avatarText: { fontSize: 26, fontWeight: '900', color: '#fff' },
    name:  { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
    email: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },

    roleRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    rolePill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(0,212,212,0.18)',
        borderWidth: 1, borderColor: TEAL,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20,
    },
    rolePillText: { color: TEAL, fontWeight: '700', fontSize: 12 },
    kycBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20,
    },
    kycBadgeText: { color: '#fff', fontWeight: '600', fontSize: 12 },

    body: { flex: 1, padding: 24 },
    logoutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 15, borderRadius: 12,
        backgroundColor: theme.colors.error + '12',
        gap: 8, marginTop: 8,
    },
    logoutText: { color: theme.colors.error, fontSize: 16, fontWeight: 'bold' },
    version: { textAlign: 'center', marginTop: 20, color: theme.colors.textTertiary, fontSize: 12 },
});

export default DriverProfileScreen;
