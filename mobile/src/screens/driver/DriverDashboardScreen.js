import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI, driverAPI } from '../../services/api';
import socketService from '../../services/socket';
import theme from '../../theme/theme';

const DriverDashboardScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const [availableOrders, setAvailableOrders] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('pickup'); // 'pickup' or 'delivery'

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('📍 Dashboard focused - refreshing data');
            loadData();
        }, [selectedTab])
    );

    useEffect(() => {

        // Setup Socket.IO listeners for real-time updates
        const handleNewPickup = (data) => {
            console.log('🔔 New pickup order available:', data);
            Alert.alert('New Pickup Order!', 'A new pickup order is available', [
                { text: 'View', onPress: () => loadAvailableOrders() }
            ]);
            if (selectedTab === 'pickup') {
                loadAvailableOrders();
            }
        };

        const handleNewDelivery = (data) => {
            console.log('🔔 New delivery order available:', data);
            Alert.alert('New Delivery Order!', 'A new delivery order is available', [
                { text: 'View', onPress: () => loadAvailableOrders() }
            ]);
            if (selectedTab === 'delivery') {
                loadAvailableOrders();
            }
        };

        const handleOrderAccepted = (data) => {
            console.log('📦 Order accepted by someone:', data);
            // Remove from available orders if it was in the list
            setAvailableOrders(prev => prev.filter(o => o.id !== data.orderId));
        };

        const handleOrderDeleted = (data) => {
            console.log('🗑️ Order deleted/cancelled:', data);
            // Remove from available orders
            setAvailableOrders(prev => prev.filter(o => o.id !== (data.orderId || data.id)));
        };

        const handleStatusUpdate = (data) => {
            console.log('🔄 Order status updated (Dashboard):', data);
            // If status changed to cancelled/deleted, remove it
            if (data.status === 'cancelled' || data.status === 'deleted') {
                setAvailableOrders(prev => prev.filter(o => o.id !== data.orderId));
            }
            // If status changed to something else (e.g. accepted by SOMEONE ELSE), it is handled by order:accepted
            // But if we just get status update, we should check availability?
            // Usually status update implies it might no longer be 'available' if it's not pending/ready.
        };

        // Listen for socket events
        socketService.onNewPickupAvailable(handleNewPickup);
        socketService.onNewDeliveryAvailable(handleNewDelivery);
        socketService.onOrderAccepted(handleOrderAccepted);
        socketService.on('order:deleted', handleOrderDeleted);
        socketService.on('order:cancelled', handleOrderDeleted);
        socketService.on('order:status_updated', handleStatusUpdate);

        // Cleanup listeners on unmount
        return () => {
            socketService.off('order:new_pickup_available');
            socketService.off('order:new_delivery_available');
            socketService.off('order:accepted');
            socketService.off('order:deleted');
            socketService.off('order:cancelled');
            socketService.off('order:status_updated');
        };
    }, [selectedTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadAvailableOrders(),
                loadStats()
            ]);
        } catch (error) {
            console.error('Failed to load driver data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableOrders = async () => {
        try {
            const type = selectedTab === 'pickup' ? 'pickup_available' : 'delivery_available';
            console.log('[Dashboard] Loading available orders, type:', type);
            const response = await ordersAPI.getAvailableForCourier(type);
            console.log('[Dashboard] Available orders response:', response.data);
            console.log('[Dashboard] Number of orders:', response.data?.length || 0);
            setAvailableOrders(response.data || []);
        } catch (error) {
            console.error('Failed to load available orders:', error);
            setAvailableOrders([]);
        }
    };

    const loadStats = async () => {
        try {
            const response = await driverAPI.getStats();
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleOrderPress = (order) => {
        navigation.navigate('DriverOrderDetails', { orderId: order.id, order });
    };

    const getStatusColor = (status) => {
        if (status === 'pending') return theme.colors.warning;
        if (status === 'ready') return theme.colors.success;
        return theme.colors.primary;
    };

    const renderOrderCard = ({ item }) => {
        const isPickup = selectedTab === 'pickup';
        const address = isPickup ? item.pickup_address : item.delivery_address;

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => handleOrderPress(item)}
            >
                <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>#{item.order_number}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status?.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderInfo}>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons
                            name={isPickup ? "map-marker-up" : "map-marker-down"}
                            size={18}
                            color={theme.colors.textSecondary}
                        />
                        <Text style={styles.infoText} numberOfLines={1}>
                            {address || 'Address not specified'}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="package-variant" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.infoText}>
                            {item.confirmed_item_count || item.customer_estimated_count || 0} items
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="cash" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.infoText}>
                            {(parseFloat(item.total || 0) * 100).toFixed(0)} Fcfa
                        </Text>
                    </View>
                </View>

                <View style={styles.orderFooter}>
                    <Text style={styles.timeText}>
                        {new Date(item.created_at).toLocaleString()}
                    </Text>
                    <TouchableOpacity style={styles.viewButton}>
                        <Text style={styles.viewButtonText}>View Details</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('driver.dashboard.title')}</Text>
            </View>

            {/* Stats Cards */}
            {stats && (
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="package-variant-closed" size={24} color={theme.colors.primary} />
                        <Text style={styles.statValue}>{stats.completed_deliveries || 0}</Text>
                        <Text style={styles.statLabel}>Deliveries</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="truck-fast" size={24} color={theme.colors.info} />
                        <Text style={styles.statValue}>{stats.completed_pickups || 0}</Text>
                        <Text style={styles.statLabel}>Pickups</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="cash-multiple" size={24} color={theme.colors.success} />
                        <Text style={styles.statValue}>{(parseFloat(stats.total_earnings || 0) * 100).toFixed(0)}</Text>
                        <Text style={styles.statLabel}>Fcfa Earned</Text>
                    </View>
                </View>
            )}

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'pickup' && styles.activeTab]}
                    onPress={() => setSelectedTab('pickup')}
                >
                    <MaterialCommunityIcons
                        name="package-up"
                        size={20}
                        color={selectedTab === 'pickup' ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.tabText, selectedTab === 'pickup' && styles.activeTabText]}>
                        Pickup Orders
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'delivery' && styles.activeTab]}
                    onPress={() => setSelectedTab('delivery')}
                >
                    <MaterialCommunityIcons
                        name="package-down"
                        size={20}
                        color={selectedTab === 'delivery' ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.tabText, selectedTab === 'delivery' && styles.activeTabText]}>
                        Delivery Orders
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Available Orders List */}
            <FlatList
                data={availableOrders}
                renderItem={renderOrderCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="package-variant-closed-remove" size={64} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No {selectedTab} orders available</Text>
                        <Text style={styles.emptyText}>
                            Pull down to refresh and check for new orders
                        </Text>
                    </View>
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
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xl + 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    statValue: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.xs,
    },
    statLabel: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.md,
        marginVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing.xs,
    },
    activeTab: {
        backgroundColor: theme.colors.primary + '15',
    },
    tabText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    activeTabText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    listContent: {
        padding: theme.spacing.md,
    },
    orderCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.md,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    orderNumber: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    statusText: {
        fontSize: theme.fonts.sizes.xs,
        fontWeight: 'bold',
    },
    orderInfo: {
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    infoText: {
        flex: 1,
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.text,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border + '40',
    },
    timeText: {
        fontSize: theme.fonts.sizes.xs,
        color: theme.colors.textTertiary,
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewButtonText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xxl * 2,
    },
    emptyTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xs,
    },
    emptyText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});

export default DriverDashboardScreen;
