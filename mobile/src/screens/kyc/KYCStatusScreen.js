import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, Easing, ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { kycAPI } from '../../services/api';
import theme from '../../theme/theme';

const KYCStatusScreen = ({ onResubmit, onLogout }) => {
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
    const [checking, setChecking] = useState(false);

    // Let user manually refresh status (in case admin approved while they were waiting)
    const refreshStatus = useCallback(async () => {
        setChecking(true);
        try {
            const res = await kycAPI.getStatus();
            const { kyc_status, kyc_rejection_reason } = res.data;
            await updateUser({
                kycStatus: kyc_status,
                kycRejectionReason: kyc_rejection_reason || null,
            });
        } catch (e) {
            console.error('KYC refresh error:', e);
        } finally {
            setChecking(false);
        }
    }, [updateUser]);
    const isPending  = user?.kycStatus === 'pending';
    const isRejected = user?.kycStatus === 'rejected';

    // Pulse animation for the pending icon
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!isPending) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            ])
        );
        loop.start();
        // Stop the loop on unmount or when isPending flips back to false, otherwise
        // it keeps running on the UI thread after the screen is gone.
        return () => loop.stop();
    }, [isPending]);

    if (isPending) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <View style={styles.card}>
                    <Animated.View style={[styles.iconWrap, styles.pendingIconWrap, { transform: [{ scale: pulse }] }]}>
                        <MaterialCommunityIcons name="shield-sync" size={56} color="#F59E0B" />
                    </Animated.View>

                    <Text style={styles.title}>{t('kyc.status.pending.title')}</Text>
                    <Text style={styles.subtitle}>{t('kyc.status.pending.subtitle')}</Text>

                    <View style={styles.stepsContainer}>
                        {[
                            { icon: 'check-circle',   color: theme.colors.success, label: t('kyc.status.pending.stepSubmitted') },
                            { icon: 'clock-outline',  color: '#F59E0B',            label: t('kyc.status.pending.stepVerifying') },
                            { icon: 'lock-open-outline', color: theme.colors.border, label: t('kyc.status.pending.stepUnlocked') },
                        ].map((step, i) => (
                            <View key={i} style={styles.stepRow}>
                                <MaterialCommunityIcons name={step.icon} size={22} color={step.color} />
                                <Text style={[styles.stepLabel, i === 1 && { fontWeight: '700', color: theme.colors.text }]}>
                                    {step.label}
                                </Text>
                                {i < 2 && <View style={styles.stepLine} />}
                            </View>
                        ))}
                    </View>

                    <View style={styles.infoBanner}>
                        <MaterialCommunityIcons name="bell-outline" size={16} color="#1565C0" />
                        <Text style={styles.infoText}>{t('kyc.status.pending.infoBanner')}</Text>
                    </View>

                    <TouchableOpacity style={styles.refreshBtn} onPress={refreshStatus} disabled={checking}>
                        {checking
                            ? <ActivityIndicator size="small" color={theme.colors.primary} />
                            : <>
                                <MaterialCommunityIcons name="refresh" size={16} color={theme.colors.primary} />
                                <Text style={styles.refreshBtnText}>{t('kyc.status.pending.refreshButton')}</Text>
                            </>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                        <Text style={styles.logoutBtnText}>{t('kyc.status.logoutButton')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (isRejected) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <View style={styles.card}>
                    <View style={[styles.iconWrap, styles.rejectedIconWrap]}>
                        <MaterialCommunityIcons name="shield-alert" size={56} color={theme.colors.error} />
                    </View>

                    <Text style={styles.title}>{t('kyc.status.rejected.title')}</Text>
                    <Text style={styles.subtitle}>{t('kyc.status.rejected.subtitle')}</Text>

                    {user?.kycRejectionReason && (
                        <View style={styles.reasonCard}>
                            <Text style={styles.reasonLabel}>{t('kyc.status.rejected.reasonLabel')}</Text>
                            <Text style={styles.reasonText}>{user.kycRejectionReason}</Text>
                        </View>
                    )}

                    <View style={styles.tipsCard}>
                        <Text style={styles.tipsTitle}>{t('kyc.status.rejected.tipsTitle')}</Text>
                        {[
                            t('kyc.status.rejected.tipReadable'),
                            t('kyc.status.rejected.tipVisible'),
                            t('kyc.status.rejected.tipSelfie'),
                            t('kyc.status.rejected.tipValidity'),
                        ].map((tip, i) => (
                            <View key={i} style={styles.tipRow}>
                                <MaterialCommunityIcons name="check-circle-outline" size={14} color={theme.colors.primary} />
                                <Text style={styles.tipText}>{tip}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.resubmitBtn} onPress={onResubmit}>
                        <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
                        <Text style={styles.resubmitBtnText}>{t('kyc.status.rejected.resubmitButton')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                        <Text style={styles.logoutBtnText}>{t('kyc.status.logoutButton')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return null;
};

const styles = StyleSheet.create({
    container: {
        flex: 1, backgroundColor: theme.colors.background,
        justifyContent: 'center', padding: theme.spacing.lg,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xxl || 24,
        padding: theme.spacing.xl,
        alignItems: 'center',
        ...theme.shadows.lg,
    },
    iconWrap: {
        width: 100, height: 100, borderRadius: 50,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    pendingIconWrap:  { backgroundColor: '#FEF3C7' },
    rejectedIconWrap: { backgroundColor: '#FEE2E2' },
    title: {
        fontSize: theme.fonts.sizes.xxl, fontWeight: 'bold',
        color: theme.colors.text, textAlign: 'center', marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: theme.fonts.sizes.md, color: theme.colors.textSecondary,
        textAlign: 'center', lineHeight: 22, marginBottom: theme.spacing.xl,
    },
    stepsContainer: { width: '100%', marginBottom: theme.spacing.lg },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    stepLabel: { flex: 1, fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary },
    stepLine: { position: 'absolute', left: 11, top: 28, width: 1, height: 16, backgroundColor: theme.colors.border },
    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#E3F2FD', borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md, width: '100%', marginBottom: theme.spacing.lg,
    },
    infoText: { flex: 1, fontSize: theme.fonts.sizes.sm, color: '#1565C0', lineHeight: 18 },
    reasonCard: {
        backgroundColor: '#FEF2F2', borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md, width: '100%', marginBottom: theme.spacing.md,
        borderLeftWidth: 3, borderLeftColor: theme.colors.error,
    },
    reasonLabel: { fontSize: theme.fonts.sizes.xs, color: theme.colors.error, fontWeight: '700', marginBottom: 4 },
    reasonText: { fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: 20 },
    tipsCard: {
        backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md, width: '100%', marginBottom: theme.spacing.lg,
    },
    tipsTitle: { fontSize: theme.fonts.sizes.sm, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
    tipText: { flex: 1, fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 16 },
    refreshBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg,
        borderWidth: 1, borderColor: theme.colors.primary,
        borderRadius: theme.borderRadius.xl, width: '100%', marginBottom: theme.spacing.sm,
        minHeight: 40,
    },
    refreshBtnText: { color: theme.colors.primary, fontSize: theme.fonts.sizes.sm, fontWeight: '600' },
    resubmitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xl,
        paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl,
        width: '100%', marginBottom: theme.spacing.sm,
    },
    resubmitBtnText: { color: '#fff', fontSize: theme.fonts.sizes.md, fontWeight: 'bold' },
    logoutBtn: {
        paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.xl, marginTop: 4,
    },
    logoutBtnText: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm },
});

export default KYCStatusScreen;
