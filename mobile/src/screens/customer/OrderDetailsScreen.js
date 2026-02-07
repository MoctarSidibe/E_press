import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import { ordersAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useReceiptPDF } from '../../hooks/useReceiptPDF';
import theme from '../../theme/theme';

const OrderDetailsScreen = ({ navigation, route }) => {
    const { orderId } = route.params;
    const insets = useSafeAreaInsets();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const { downloadPDF, isGenerating } = useReceiptPDF();

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('📍 Order Details (Customer) focused - refreshing');
            loadOrderDetails();
        }, [orderId])
    );

    // Real-time updates for courier assignment
    useEffect(() => {
        if (!orderId) return;

        socketService.joinOrder(orderId);

        const handleStatusUpdate = (data) => {
            console.log('📦 Order updated (Customer):', data);
            if (data.orderId === orderId) {
                // Reload to get courier info
                loadOrderDetails();
            }
        };

        socketService.on('order:status_updated', handleStatusUpdate);

        return () => {
            socketService.off('order:status_updated');
        };
    }, [orderId]);

    const loadOrderDetails = async () => {
        try {
            const response = await ordersAPI.getById(orderId);
            setOrder(response.data);
        } catch (error) {
            console.error('Failed to load order:', error);
            Alert.alert('Error', 'Failed to load order details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReceipt = async () => {
        if (order) {
            await downloadPDF(order);
        }
    };

    const handleTrackDelivery = () => {
        navigation.navigate('Tracking', { orderId: order.id });
    };

    const handleCancelOrder = () => {
        Alert.alert(
            'Cancel Order',
            'Are you sure you want to cancel this order? This action cannot be undone.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ordersAPI.cancel(order.id);
                            Alert.alert(
                                'Order Cancelled',
                                'Your order has been cancelled successfully.',
                                [{ text: 'OK', onPress: () => navigation.goBack() }]
                            );
                        } catch (error) {
                            console.error('Failed to cancel order:', error);
                            Alert.alert('Error', error.response?.data?.error || 'Failed to cancel order');
                        }
                    }
                }
            ]
        );
    };


    const getStatusColor = (status) => {
        if (status === 'delivered') return theme.colors.success;
        if (status === 'cancelled') return theme.colors.error;
        if (status?.includes('arrived') || status === 'ready_for_delivery') return theme.colors.warning;
        return theme.colors.primary;
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <StatusBar style="dark" />
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading order details...</Text>
            </View>
        );
    }

    if (!order) return null;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* QR Code Section */}
                <View style={styles.qrContainer}>
                    <View style={styles.qrWrapper}>
                        <QRCodeDisplay
                            value={JSON.stringify({ id: order.id, num: order.order_number })}
                            size={160}
                        />
                    </View>
                    <Text style={styles.qrLabel}>Scan for Order Tracking</Text>
                </View>

                {/* Order Info Card */}
                <View style={styles.card}>
                    <Text style={styles.orderNumber}>#{order.order_number}</Text>
                    <Text style={styles.orderDate}>
                        {new Date(order.created_at).toLocaleString()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                            {order.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                        </Text>
                    </View>
                </View>

                {/* Items Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <MaterialCommunityIcons name="package-variant" size={20} color={theme.colors.text} />
                        {' '}Items ({order.items?.length || order.confirmed_item_count || 0})
                    </Text>
                    {order.items?.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemQuantity}>{item.quantity}×</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.category_name || item.name}</Text>
                                    {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
                                </View>
                            </View>
                            <Text style={styles.itemPrice}>
                                {((parseFloat(item.price_per_item || 0) * item.quantity) * 100).toFixed(0)} Fcfa
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Pricing Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pricing</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Subtotal</Text>
                        <Text style={styles.priceValue}>{(parseFloat(order.subtotal || 0) * 100).toFixed(0)} Fcfa</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Delivery Fee</Text>
                        <Text style={styles.priceValue}>{(parseFloat(order.delivery_fee || 0) * 100).toFixed(0)} Fcfa</Text>
                    </View>
                    {parseFloat(order.express_fee) > 0 && (
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Express Fee</Text>
                            <Text style={styles.priceValue}>{(parseFloat(order.express_fee) * 100).toFixed(0)} Fcfa</Text>
                        </View>
                    )}
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Tax (10%)</Text>
                        <Text style={styles.priceValue}>{(parseFloat(order.tax || 0) * 100).toFixed(0)} Fcfa</Text>
                    </View>
                    <View style={[styles.priceRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{(parseFloat(order.total || 0) * 100).toFixed(0)} Fcfa</Text>
                    </View>
                </View>

                {/* Addresses Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Addresses</Text>
                    <View style={styles.addressRow}>
                        <MaterialCommunityIcons name="map-marker-up" size={20} color={theme.colors.primary} />
                        <View style={styles.addressInfo}>
                            <Text style={styles.addressLabel}>Pickup</Text>
                            <Text style={styles.addressValue}>{order.pickup_address || 'Not specified'}</Text>
                        </View>
                    </View>
                    <View style={styles.addressRow}>
                        <MaterialCommunityIcons name="map-marker-down" size={20} color={theme.colors.success} />
                        <View style={styles.addressInfo}>
                            <Text style={styles.addressLabel}>Delivery</Text>
                            <Text style={styles.addressValue}>{order.delivery_address || 'Not specified'}</Text>
                        </View>
                    </View>
                </View>

                {/* Courier Information - Show when assigned */}
                {(order.pickup_driver_name || order.delivery_driver_name || order.status === 'assigned' || order.status === 'picked_up' || order.status === 'in_transit' || order.status === 'out_for_delivery') && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="truck-delivery" size={20} color={theme.colors.text} />
                            {' '}Your Courier
                        </Text>
                        <View style={[styles.card, { backgroundColor: theme.colors.primary + '10', borderLeftWidth: 4, borderLeftColor: theme.colors.primary }]}>
                            {order.pickup_driver_name && (
                                <View style={styles.courierRow}>
                                    <MaterialCommunityIcons name="account-circle" size={24} color={theme.colors.primary} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ fontSize: 12, color: theme.colors.textLight }}>Pickup Courier</Text>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                                            {order.pickup_driver_name}
                                        </Text>
                                    </View>
                                    <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>ASSIGNED</Text>
                                    </View>
                                </View>
                            )}
                            {order.delivery_driver_name && order.delivery_driver_name !== order.pickup_driver_name && (
                                <View style={[styles.courierRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                                    <MaterialCommunityIcons name="account-circle" size={24} color={theme.colors.success} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ fontSize: 12, color: theme.colors.textLight }}>Delivery Courier</Text>
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                                            {order.delivery_driver_name}
                                        </Text>
                                    </View>
                                    <View style={{ backgroundColor: theme.colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>ASSIGNED</Text>
                                    </View>
                                </View>
                            )}
                            {!order.pickup_driver_name && !order.delivery_driver_name && (
                                <View style={styles.courierRow}>
                                    <MaterialCommunityIcons name="truck-fast" size={24} color={theme.colors.warning} />
                                    <Text style={{ marginLeft: 12, color: theme.colors.textLight, fontStyle: 'italic' }}>
                                        Courier being assigned...
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
                {/* Payment & Schedule */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Method</Text>
                        <Text style={styles.detailValue}>
                            {(order.payment_method || 'cash').replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Pickup Type</Text>
                        <Text style={styles.detailValue}>
                            {order.pickup_scheduled_at ? 'Scheduled' : 'Immediate'}
                        </Text>
                    </View>
                    {order.order_comment && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Special Instructions</Text>
                            <Text style={styles.detailValue}>{order.order_comment}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : theme.spacing.lg }]}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.receiptButton]}
                    onPress={handleDownloadReceipt}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="download" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Receipt</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Track Button - Only show for active orders */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.trackButton]}
                        onPress={handleTrackDelivery}
                    >
                        <MaterialCommunityIcons name="map-marker-path" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Track</Text>
                    </TouchableOpacity>
                )}

                {/* Cancel Button - only show if order not assigned to driver */}
                {!order.pickup_driver_id && !order.delivery_driver_id && order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={handleCancelOrder}
                    >
                        <MaterialCommunityIcons name="close-circle" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        padding: 8,
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
        paddingBottom: 20,
    },
    qrContainer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.sm,
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
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        alignItems: 'center',
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
        paddingVertical: 6,
        borderRadius: theme.borderRadius.md,
    },
    statusText: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: 'bold',
    },
    section: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
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
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '40',
    },
    itemInfo: {
        flex: 1,
        flexDirection: 'row',
        gap: theme.spacing.sm,
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
        fontWeight: '500',
    },
    totalRow: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 2,
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
    addressRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    addressInfo: {
        flex: 1,
    },
    addressLabel: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    addressValue: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        fontWeight: '500',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    detailLabel: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
    },
    detailValue: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    courierRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.sm + 2,
        borderRadius: theme.borderRadius.md,
        gap: 6,
    },
    cancelButton: {
        backgroundColor: theme.colors.error,
    },
    receiptButton: {
        backgroundColor: theme.colors.error,
    },
    trackButton: {
        backgroundColor: theme.colors.primary,
    },
    actionButtonText: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default OrderDetailsScreen;
