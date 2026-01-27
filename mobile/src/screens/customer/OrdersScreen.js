// Placeholder screens - to be fully implemented
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../theme/theme';
import { ordersAPI } from '../../services/api';

import OrderReceipt from '../../components/OrderReceipt';

const OrdersScreen = ({ navigation }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);

    // Load orders when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadOrders();
        }, [])
    );

    const loadOrders = async () => {
        try {
            setLoading(true);
            const response = await ordersAPI.getMyOrders();
            setOrders(response.data || []);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    };

    const handleViewReceipt = (order) => {
        setSelectedOrder(order);
        setShowReceipt(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'delivered': return theme.colors.success;
            case 'out_for_delivery': return theme.colors.primary;
            case 'cleaning': return theme.colors.secondary;
            default: return theme.colors.textSecondary;
        }
    };

    const formatStatus = (status) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleCancelOrder = (order) => {
        Alert.alert(
            'Cancel Order',
            'Are you sure you want to cancel this order?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await ordersAPI.cancel(order.id);
                            Alert.alert('Success', 'Order cancelled successfully');
                            loadOrders(); // Refresh list
                        } catch (error) {
                            console.error('Cancellation error:', error);
                            Alert.alert('Error', 'Failed to cancel order');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleViewReceipt(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.orderId}>#{item.order_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {formatStatus(item.status)}
                    </Text>
                </View>
            </View>

            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>

            <View style={styles.itemsList}>
                {item.items && item.items.length > 0 ? (
                    item.items.slice(0, 3).map((orderItem, index) => (
                        <Text key={index} style={styles.itemText}>
                            {orderItem.quantity}x {orderItem.category_name}
                        </Text>
                    ))
                ) : (
                    <Text style={styles.itemText}>{item.confirmed_item_count} items</Text>
                )}
                {item.items && item.items.length > 3 && (
                    <Text style={styles.itemTextMore}>+{item.items.length - 3} more</Text>
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.totalPrice}>${parseFloat(item.total).toFixed(2)}</Text>

                <View style={styles.actionButtons}>
                    {/* Cancel Button for Pending Orders */}
                    {item.status === 'pending' && (
                        <TouchableOpacity
                            style={[styles.receiptButton, { borderColor: theme.colors.error }]}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleCancelOrder(item);
                            }}
                        >
                            <MaterialCommunityIcons name="close-circle-outline" size={20} color={theme.colors.error} />
                            <Text style={[styles.receiptButtonText, { color: theme.colors.error }]}>Cancel</Text>
                        </TouchableOpacity>
                    )}

                    {item.status === 'out_for_delivery' && (
                        <TouchableOpacity
                            style={styles.trackButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                navigation.navigate('Tracking', { orderId: item.id });
                            }}
                        >
                            <MaterialCommunityIcons name="map-marker" size={18} color="#fff" />
                            <Text style={styles.trackButtonText}>Track</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.receiptButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleViewReceipt(item);
                        }}
                    >
                        <MaterialCommunityIcons name="receipt-text" size={20} color={theme.colors.primary} />
                        <Text style={styles.receiptButtonText}>Receipt</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Text style={styles.title}>My Orders</Text>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading your orders...</Text>
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="package-variant" size={80} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyTitle}>No Orders Yet</Text>
                    <Text style={styles.emptyText}>Your orders will appear here once you place them</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                        />
                    }
                />
            )}

            {/* Receipt Modal */}
            {showReceipt && selectedOrder && (
                <OrderReceipt
                    order={selectedOrder}
                    visible={showReceipt}
                    onClose={() => {
                        setShowReceipt(false);
                        setSelectedOrder(null);
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: theme.spacing.xxl,
    },
    title: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
    },
    listContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    orderId: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: theme.fonts.sizes.sm,
        fontWeight: '600',
    },
    date: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    itemsList: {
        marginBottom: theme.spacing.md,
    },
    itemText: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.md,
    },
    totalPrice: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    trackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        gap: 6,
    },
    trackButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: theme.fonts.sizes.sm,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    receiptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        gap: 6,
    },
    receiptButtonText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: theme.fonts.sizes.sm,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: theme.spacing.md,
        color: theme.colors.textSecondary,
        fontSize: theme.fonts.sizes.md,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    emptyTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        fontSize: theme.fonts.sizes.md,
        lineHeight: 22,
    },
    itemTextMore: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: 2,
        fontStyle: 'italic',
    },
});

export default OrdersScreen;
