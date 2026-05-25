import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI } from '../../services/api';
import socketService from '../../services/socket';
import theme from '../../theme/theme';

const OrdersScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadOrders = async () => {
        try {
            const response = await ordersAPI.getMyOrders();
            setOrders(response.data || []);
        } catch (error) {
            console.error('Failed to load orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadOrders();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadOrders();
    };

    // Socket.IO updates
    React.useEffect(() => {
        const handleStatusUpdate = (data) => {
            console.log('🔄 Order status updated:', data);
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === data.orderId
                        ? { ...order, status: data.status }
                        : order
                )
            );
        };

        const handleOrderDeleted = (data) => {
            console.log('🗑️ Order deleted/cancelled:', data);
            // Instead of removing, mark as cancelled so user can see history
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    (order.id === (data.orderId || data.id))
                        ? { ...order, status: 'cancelled' }
                        : order
                )
            );
        };

        socketService.on('order:status_updated', handleStatusUpdate);
        socketService.on('order:deleted', handleOrderDeleted);
        socketService.on('order:cancelled', handleOrderDeleted); // Treat cancelled as deleted if requested? Or just status update?
        // If user says "still showing... delete", removing it from list seems to be what they expect for "deleted"

        return () => {
            socketService.off('order:status_updated');
            socketService.off('order:deleted');
            socketService.off('order:cancelled');
        };
    }, []);

    const getStatusColor = (status) => {
        if (status === 'delivered') return theme.colors.success;
        if (status === 'cancelled') return theme.colors.error;
        if (status?.includes('arrived') || status === 'ready_for_delivery') return theme.colors.warning;
        return theme.colors.primary;
    };

    const handleOrderPress = (order) => {
        navigation.navigate('OrderDetails', { orderId: order.id });
    };

    const renderOrderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleOrderPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.statusStrip, { backgroundColor: getStatusColor(item.status) }]} />
            <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                    <Text style={styles.orderNumber}>#{item.order_number || item.id?.slice(0, 8)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.address} numberOfLines={2}>
                    {item.pickup_address || item.delivery_address || t('customer.home.noRecentOrders')}
                </Text>
                <View style={styles.footerRow}>
                    <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="package-variant" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.infoText}>{item.confirmed_item_count || 0} article{item.confirmed_item_count > 1 ? 's' : ''}</Text>
                    </View>
                </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <StatusBar style="dark" />
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <Text style={styles.title}>{t('customer.home.myOrders')}</Text>
            </View>
            <FlatList
                data={orders}
                keyExtractor={(item) => item.id || item.order_number || String(Math.random())}
                renderItem={renderOrderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="package-variant-closed" size={64} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyText}>{t('customer.home.noRecentOrders')}</Text>
                        <TouchableOpacity
                            style={styles.newOrderButton}
                            onPress={() => navigation.navigate('NewOrder')}
                        >
                            <Text style={styles.newOrderButtonText}>{t('customer.home.newOrder')}</Text>
                        </TouchableOpacity>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                    />
                }
            />
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
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.md,
    },
    title: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
    },
    listContent: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        ...theme.shadows.sm,
    },
    statusStrip: {
        width: 4,
    },
    cardContent: {
        flex: 1,
        padding: theme.spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    orderNumber: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
    },
    statusText: {
        fontSize: 12,
        fontWeight: theme.fonts.weights.medium,
    },
    address: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    footerRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    emptyText: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
    },
    newOrderButton: {
        marginTop: theme.spacing.lg,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
    },
    newOrderButtonText: {
        color: '#fff',
        fontWeight: theme.fonts.weights.semibold,
    },
});

export default OrdersScreen;
