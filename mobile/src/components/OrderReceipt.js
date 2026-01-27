import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Share,
    Platform,
    Modal,
    ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCodeDisplay from './QRCodeDisplay';
import theme from '../theme/theme';
import { useReceiptPDF } from '../hooks/useReceiptPDF';

/**
 * In-App Digital Receipt Component
 * @param {Object} props
 * @param {Object} props.order - Order object with items and details
 * @param {Boolean} props.visible - Show/hide receipt
 * @param {Function} props.onClose - Close callback
 */
const OrderReceipt = ({ order, visible, onClose }) => {
    const { downloadPDF, isGenerating } = useReceiptPDF();

    if (!visible || !order) return null;

    const shareReceipt = async () => {
        try {
            const message = `
E-Press Dry Cleaning Receipt

Order #: ${order.order_number}
Date: ${new Date(order.created_at).toLocaleDateString()}

Items: ${order.confirmed_item_count}
Total: $${parseFloat(order.total).toFixed(2)}

Track your order in the app!
`;
            await Share.share({
                message,
                title: `Receipt #${order.order_number}`
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownloadPDF = async () => {
        await downloadPDF(order);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Digital Receipt</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    {/* QR Code Section */}
                    <View style={styles.qrContainer}>
                        <View style={styles.qrWrapper}>
                            <QRCodeDisplay value={JSON.stringify({ id: order.id, num: order.order_number })} size={180} />
                        </View>
                        <Text style={styles.qrLabel}>Scan for Order Tracking</Text>
                    </View>

                    {/* Order Info */}
                    <View style={styles.orderInfo}>
                        <Text style={styles.orderNumber}>#{order.order_number}</Text>
                        <Text style={styles.orderDate}>
                            {new Date(order.created_at).toLocaleString()}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                            <Text style={styles.statusText}>{order.status ? order.status.toUpperCase() : 'PENDING'}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Items */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Items ({order.items?.length || order.confirmed_item_count})</Text>
                        {order.items && order.items.map((item, index) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                                    <View>
                                        <Text style={styles.itemName}>{item.category_name || item.name}</Text>
                                        {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
                                    </View>
                                </View>
                                <Text style={styles.itemPrice}>
                                    ${(parseFloat(item.price_per_item || 0) * item.quantity).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.divider} />

                    {/* Pricing */}
                    <View style={styles.section}>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Subtotal</Text>
                            <Text style={styles.priceValue}>${parseFloat(order.subtotal || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Delivery Fee</Text>
                            <Text style={styles.priceValue}>${parseFloat(order.delivery_fee || 0).toFixed(2)}</Text>
                        </View>
                        {parseFloat(order.express_fee) > 0 && (
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Express Fee</Text>
                                <Text style={styles.priceValue}>${parseFloat(order.express_fee).toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Tax (10%)</Text>
                            <Text style={styles.priceValue}>${parseFloat(order.tax || 0).toFixed(2)}</Text>
                        </View>
                        <View style={[styles.priceRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>${parseFloat(order.total || 0).toFixed(2)}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Schedule */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Schedule</Text>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="calendar-clock" size={20} color={theme.colors.textSecondary} />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Pickup</Text>
                                <Text style={styles.detailValue}>
                                    {order.pickup_scheduled_at
                                        ? new Date(order.pickup_scheduled_at).toLocaleString()
                                        : 'Immediate Pickup'}
                                </Text>
                            </View>
                        </View>
                        {order.delivery_scheduled_at && (
                            <View style={styles.detailRow}>
                                <MaterialCommunityIcons name="truck-delivery" size={20} color={theme.colors.success} />
                                <View style={styles.detailTextContainer}>
                                    <Text style={styles.detailLabel}>Expected Delivery</Text>
                                    <Text style={styles.detailValue}>
                                        {new Date(order.delivery_scheduled_at).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Footer Actions */}
                <View style={styles.footerAction}>
                    <TouchableOpacity style={styles.actionButton} onPress={shareReceipt}>
                        <MaterialCommunityIcons name="share-variant" size={24} color={theme.colors.primary} />
                        <Text style={styles.actionButtonText}>Share</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.pdfButton]}
                        onPress={handleDownloadPDF}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="file-pdf-box" size={24} color="#fff" />
                                <Text style={styles.pdfButtonText}>PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
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
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    closeButton: {
        padding: theme.spacing.sm,
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    qrContainer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    qrWrapper: {
        padding: theme.spacing.md,
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.md,
    },
    qrLabel: {
        marginTop: theme.spacing.md,
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fonts.weights.medium,
    },
    orderInfo: {
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
    },
    orderNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: theme.spacing.xs,
    },
    orderDate: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: theme.fonts.sizes.xs,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.lg,
    },
    section: {
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '40',
        paddingBottom: theme.spacing.sm,
    },
    itemInfo: {
        flex: 1,
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    itemQuantity: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: 'bold',
        color: theme.colors.primary,
        width: 30,
    },
    itemName: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
        flex: 1,
    },
    itemNotes: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: 2,
        fontStyle: 'italic',
    },
    itemPrice: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginLeft: theme.spacing.md,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    priceLabel: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
    },
    priceValue: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        fontWeight: 'medium',
    },
    totalRow: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    totalLabel: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    totalValue: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.md,
    },
    detailTextContainer: {
        flex: 1,
    },
    detailLabel: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        fontWeight: 'medium',
    },
    footerAction: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 8,
    },
    actionButtonText: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    pdfButton: {
        backgroundColor: theme.colors.error,
        borderColor: theme.colors.error,
    },
    pdfButtonText: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: '600',
        color: '#fff',
    },
    doneButton: {
        flex: 1,
        backgroundColor: theme.colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.lg,
    },
    doneButtonText: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default OrderReceipt;
