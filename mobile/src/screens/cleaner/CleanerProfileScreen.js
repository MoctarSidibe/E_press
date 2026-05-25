import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { displayIdentity } from '../../utils/userIdentity';
import theme from '../../theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const TEAL = '#00D4D4';
const LAVERIE_BG = '#05121f';

const CleanerProfileScreen = () => {
    const { t } = useTranslation();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            t('customer.profile.logout'),
            t('customer.profile.confirmLogout'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('customer.profile.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        try { await logout(); } catch (e) { Alert.alert(t('common.error'), t('errors.generic')); }
                    },
                },
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
                    source={require('../../../assets/lotties/laundry.json')}
                    autoPlay loop
                    style={styles.lottie}
                    resizeMode="contain"
                />
                <View style={styles.heroOverlay}>
                    {/* Laverie label */}
                    <View style={styles.laverieTag}>
                        <MaterialCommunityIcons name="washing-machine" size={14} color={TEAL} />
                        <Text style={styles.laverieTagText}>LAVERIE</Text>
                    </View>

                    <View style={styles.avatarRing}>
                        <MaterialCommunityIcons name="account" size={36} color="#fff" />
                    </View>
                    <Text style={styles.name}>{user?.name || user?.full_name || 'Agent Laverie'}</Text>
                    <Text style={styles.email}>{displayIdentity(user)}</Text>

                    <View style={styles.badgeRow}>
                        <View style={styles.rolePill}>
                            <MaterialCommunityIcons name="washing-machine" size={13} color={TEAL} />
                            <Text style={styles.rolePillText}>Laverie</Text>
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
                    <MaterialCommunityIcons name="logout" size={20} color="#fff" />
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
        height: 290,
        backgroundColor: LAVERIE_BG,
        overflow: 'hidden',
    },
    lottie: {
        position: 'absolute',
        width: '130%',
        height: '130%',
        left: '-15%',
        top: '-15%',
    },
    heroOverlay: {
        flex: 1,
        backgroundColor: 'rgba(5,18,31,0.55)',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 24,
        paddingTop: 44,
    },

    laverieTag: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(0,212,212,0.12)',
        borderWidth: 1, borderColor: 'rgba(0,212,212,0.5)',
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 20, marginBottom: 12,
    },
    laverieTagText: { color: TEAL, fontWeight: '800', fontSize: 11, letterSpacing: 2 },

    avatarRing: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(0,212,212,0.25)',
        borderWidth: 2, borderColor: TEAL,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 10,
    },
    name:  { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
    email: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },

    badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    rolePill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(0,212,212,0.15)',
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
        backgroundColor: theme.colors.error,
        paddingVertical: 14, borderRadius: 12,
        gap: 8,
    },
    logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    version: { textAlign: 'center', marginTop: 20, color: theme.colors.textTertiary, fontSize: 12 },
});

export default CleanerProfileScreen;
