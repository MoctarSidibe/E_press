import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Share,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import theme from '../../theme/theme';

export default function OfflineOrderConfirmScreen({ route, navigation }) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { client_code, qr_content, local_id } = route.params;
    const qrRef = useRef(null);

    const handleShare = async () => {
        try {
            await Share.share({
                message: t('offlineOrder.shareMessage', { code: client_code }),
                title: t('offlineOrder.shareTitle'),
            });
        } catch (e) {
            // user cancelled or error
        }
    };

    const handleGoHome = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'CustomerTabs' }],
        });
    };

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoHome} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('offlineOrder.headerTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Success icon */}
                <View style={styles.successRing}>
                    <MaterialCommunityIcons
                        name="check-circle"
                        size={64}
                        color={theme.colors.primary}
                    />
                </View>

                <Text style={styles.title}>{t('offlineOrder.successTitle')}</Text>
                <Text style={styles.subtitle}>{t('offlineOrder.successSubtitle')}</Text>

                {/* EP Code card */}
                <View style={styles.codeCard}>
                    <Text style={styles.codeLabel}>{t('offlineOrder.codeLabel')}</Text>
                    <Text style={styles.codeValue}>{client_code}</Text>
                    <Text style={styles.codeHint}>{t('offlineOrder.codeHint')}</Text>
                </View>

                {/* QR Code */}
                {qr_content ? (
                    <View style={styles.qrCard}>
                        <Text style={styles.qrLabel}>{t('offlineOrder.qrLabel')}</Text>
                        <View style={styles.qrWrap}>
                            <QRCode
                                value={qr_content}
                                size={200}
                                color="#000"
                                backgroundColor="#fff"
                                getRef={(ref) => (qrRef.current = ref)}
                            />
                        </View>
                        <Text style={styles.qrHint}>{t('offlineOrder.qrHint')}</Text>
                    </View>
                ) : null}

                {/* Info banner */}
                <View style={styles.infoBanner}>
                    <MaterialCommunityIcons name="wifi-off" size={18} color="#D97706" />
                    <Text style={styles.infoText}>{t('offlineOrder.infoBanner')}</Text>
                </View>

                {/* Actions */}
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.shareBtnText}>{t('offlineOrder.shareButton')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.homeBtn} onPress={handleGoHome}>
                    <Text style={styles.homeBtnText}>{t('offlineOrder.homeButton')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.text,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    successRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${theme.colors.primary}18`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
    },
    codeCard: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 20,
    },
    codeLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    codeValue: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.colors.primary,
        letterSpacing: 3,
        marginBottom: 8,
        fontFamily: 'monospace',
    },
    codeHint: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        textAlign: 'center',
    },
    qrCard: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 20,
    },
    qrLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 16,
    },
    qrWrap: {
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
    },
    qrHint: {
        fontSize: 12,
        color: theme.colors.textTertiary,
        textAlign: 'center',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: 14,
        gap: 10,
        width: '100%',
        marginBottom: 28,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        lineHeight: 19,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        width: '100%',
        justifyContent: 'center',
        marginBottom: 12,
    },
    shareBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    homeBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    homeBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});
