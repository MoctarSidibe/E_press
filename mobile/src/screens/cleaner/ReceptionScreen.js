import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI } from '../../services/api';
import theme from '../../theme/theme';

const ReceptionScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const [scannedOrder, setScannedOrder] = useState(null);
    const [receptionCount, setReceptionCount] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleScanQR = () => {
        navigation.navigate('QRScanner', {
            returnScreen: 'Reception',
        });
    };

    // Handle return from scanner with params
    useEffect(() => {
        if (route.params?.scannedOrder) {
            const order = route.params.scannedOrder;
            // Clear params to avoid re-processing
            navigation.setParams({ scannedOrder: null });

            // Validate
            if (order.status !== 'picked_up') {
                Alert.alert(t('common.error'), t('cleaner.reception.invalidOrder'));
                return;
            }

            setScannedOrder(order);
            setReceptionCount(order.pickup_item_count?.toString() || order.confirmed_item_count?.toString() || '');
        }
    }, [route.params?.scannedOrder]);

    const handleConfirmReception = async () => {
        if (!scannedOrder) {
            Alert.alert(t('common.error'), t('cleaner.reception.scanFirst'));
            return;
        }

        if (!receptionCount || receptionCount === '0') {
            Alert.alert(t('common.error'), t('cleaner.reception.enterCount'));
            return;
        }

        setSubmitting(true);

        try {
            await ordersAPI.scanOrder(scannedOrder.id, {
                checkpoint: 'received',
                item_count: parseInt(receptionCount),
                notes
            });

            Alert.alert(
                t('common.success'),
                t('cleaner.reception.received'),
                [
                    {
                        text: t('common.ok'),
                        onPress: () => {
                            setScannedOrder(null);
                            setReceptionCount('');
                            setNotes('');
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert(t('common.error'), error.response?.data?.error || t('cleaner.reception.confirmFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="package-variant" size={32} color={theme.colors.primary} />
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>{t('cleaner.reception.title')}</Text>
                    <Text style={styles.headerSubtitle}>{t('cleaner.reception.subtitle')}</Text>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {!scannedOrder ? (
                    // Scan Prompt
                    <View style={styles.scanPrompt}>
                        <MaterialCommunityIcons
                            name="qrcode-scan"
                            size={80}
                            color={theme.colors.textTertiary}
                        />
                        <Text style={styles.promptTitle}>{t('cleaner.reception.readyToReceive')}</Text>
                        <Text style={styles.promptSubtitle}>
                            {t('cleaner.reception.scanPrompt')}
                        </Text>

                        <TouchableOpacity
                            style={styles.scanButton}
                            onPress={handleScanQR}
                        >
                            <MaterialCommunityIcons name="qrcode-scan" size={24} color="#fff" />
                            <Text style={styles.scanButtonText}>{t('cleaner.reception.scanQR')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Order Details & Count
                    <View style={styles.orderSection}>
                        {/* Order Info */}
                        <View style={styles.infoCard}>
                            <View style={styles.infoHeader}>
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={24}
                                    color={theme.colors.success}
                                />
                                <Text style={styles.infoHeaderText}>{t('cleaner.reception.orderScanned')}</Text>
                            </View>

                            <View style={styles.orderDetails}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('order.details.orderId')}:</Text>
                                    <Text style={styles.detailValue}>{scannedOrder.order_number}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('cleaner.reception.customer')}:</Text>
                                    <Text style={styles.detailValue}>{scannedOrder.customer_name}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('cleaner.reception.pickupCount')}:</Text>
                                    <Text style={styles.detailValue}>
                                        {scannedOrder.pickup_item_count || scannedOrder.confirmed_item_count} {t('order.details.items')}
                                    </Text>
                                </View>

                                {scannedOrder.is_express && (
                                    <View style={styles.expressBadge}>
                                        <MaterialCommunityIcons name="flash" size={16} color="#fff" />
                                        <Text style={styles.expressBadgeText}>{t('cleaner.reception.express')}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Count Verification */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('cleaner.reception.verifyCount')}</Text>
                            <Text style={styles.sectionSubtitle}>
                                {t('cleaner.reception.verifyCountDesc')}
                            </Text>

                            <View style={styles.countContainer}>
                                <TouchableOpacity
                                    style={styles.countButton}
                                    onPress={() => setReceptionCount(Math.max(0, parseInt(receptionCount || 0) - 1).toString())}
                                >
                                    <MaterialCommunityIcons name="minus" size={24} color={theme.colors.primary} />
                                </TouchableOpacity>

                                <TextInput
                                    style={styles.countInput}
                                    value={receptionCount}
                                    onChangeText={setReceptionCount}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                />

                                <TouchableOpacity
                                    style={styles.countButton}
                                    onPress={() => setReceptionCount((parseInt(receptionCount || 0) + 1).toString())}
                                >
                                    <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>

                            {receptionCount && parseInt(receptionCount) !== (scannedOrder.pickup_item_count || scannedOrder.confirmed_item_count) && (
                                <View style={styles.warningBox}>
                                    <MaterialCommunityIcons name="alert" size={20} color={theme.colors.warning} />
                                    <Text style={styles.warningText}>
                                        {t('cleaner.reception.countMismatch', { 
                                            expected: scannedOrder.pickup_item_count || scannedOrder.confirmed_item_count,
                                            received: receptionCount 
                                        })}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Notes */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('cleaner.reception.notes')}</Text>
                            <TextInput
                                style={styles.notesInput}
                                placeholder={t('cleaner.reception.notesPlaceholder')}
                                placeholderTextColor={theme.colors.textTertiary}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setScannedOrder(null);
                                    setReceptionCount('');
                                    setNotes('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
                                onPress={handleConfirmReception}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="check" size={24} color="#fff" />
                                        <Text style={styles.confirmButtonText}>{t('cleaner.reception.confirm')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
    },
    headerTextContainer: {
        marginLeft: theme.spacing.md,
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
    },
    headerSubtitle: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: theme.spacing.lg,
    },
    scanPrompt: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing.xxxl,
    },
    promptTitle: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
    },
    promptSubtitle: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        marginTop: theme.spacing.xxl,
        gap: theme.spacing.sm,
    },
    scanButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.semibold,
    },
    orderSection: {
        gap: theme.spacing.lg,
    },
    infoCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.md,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    infoHeaderText: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.success,
    },
    orderDetails: {
        gap: theme.spacing.sm,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
    },
    detailValue: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
    },
    expressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.warning,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        marginTop: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    expressBadgeText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.xs,
        fontWeight: theme.fonts.weights.semibold,
    },
    section: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    sectionSubtitle: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    countContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.lg,
        marginVertical: theme.spacing.md,
    },
    countButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md,
    },
    countInput: {
        fontSize: theme.fonts.sizes.xxxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        textAlign: 'center',
        minWidth: 100,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.warning + '20',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.sm,
    },
    warningText: {
        color: theme.colors.warning,
        fontSize: theme.fonts.sizes.sm,
        flex: 1,
    },
    notesInput: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: theme.colors.textTertiary,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: theme.colors.text,
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
    },
    confirmButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.success,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.sm,
    },
    confirmButtonDisabled: {
        opacity: 0.6,
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
    },
});

export default ReceptionScreen;
