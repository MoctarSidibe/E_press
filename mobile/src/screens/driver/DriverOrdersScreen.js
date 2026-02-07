import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { driverAPI } from '../../services/api';
import socketService from '../../services/socket';
import theme from '../../theme/theme';

const DriverOrdersScreen = ({ navigation }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('active'); // 'active' or 'completed'

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('📍 My Orders focused - refreshing');
            loadOrders();
        }, [selectedTab])
    );

    // Socket.IO updates
    useEffect(() => {
        const handleStatusUpdate = (data) => {
            console.log('🔄 Order status updated:', data);
            // If status changed to something that should be filtered out/moved, just update for now
            // or we could reload. Updating local state is smoother.
            setOrders(prevOrders => {
                // Update the order in the list
                const updated = prevOrders.map(order =>
                    order.id === data.orderId
                        ? { ...order, status: data.status }
                        : order
                );

                // If in 'active' tab and new status is 'delivered' or 'cancelled', filter it out
                if (selectedTab === 'active' && (data.status === 'delivered' || data.status === 'cancelled')) {
                    return updated.filter(o => o.id !== data.orderId);
                }

                return updated;
            });
        };

        const handleOrderDeleted = (data) => {
            console.log('🗑️ Order deleted:', data);
            setOrders(prevOrders => prevOrders.filter(o => o.id !== (data.orderId || data.id)));
        };

        socketService.on('order:status_updated', handleStatusUpdate);
        socketService.on('order:deleted', handleOrderDeleted);
        socketService.on('order:cancelled', handleOrderDeleted);

        return () => {
            socketService.off('order:status_updated');
            socketService.off('order:deleted');
            socketService.off('order:cancelled');
        };
    }, [selectedTab]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const status = selectedTab === 'active' ? null : 'delivered';
            const response = await driverAPI.getOrders(status);

            // Filter based on tab
            // Active: pending, assigned, picked_up, in_transit, AND cancelled (so we can see it)
            // Completed: delivered
            const filteredOrders = selectedTab === 'active'
                ? (response.data || []).filter(o => o.status !== 'delivered')
                : response.data || [];

            setOrders(filteredOrders);
        } catch (error) {
            console.error('Failed to load orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    };

    const handleOrderPress = (order) => {
        navigation.navigate('DriverOrderDetails', { orderId: order.id, order });
    };

    const getStatusColor = (status) => {
        if (status === 'delivered') return theme.colors.success;
        if (status === 'cancelled') return theme.colors.error;
        if (status === 'picked_up' || status === 'in_transit') return theme.colors.warning;
        return theme.colors.primary;
    };

    const getStatusIcon = (status) => {
        if (status === 'picked_up') return 'package-up';
        if (status === 'in_transit') return 'truck-delivery';
        if (status === 'delivered') return 'package-variant-closed-check';
        if (status === 'in_facility') return 'office-building';
        return 'package-variant';
    };

    const renderOrderCard = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => handleOrderPress(item)}
            >
                <View style={styles.orderHeader}>
                    <View style={styles.orderNumberContainer}>
                        <MaterialCommunityIcons
                            name={getStatusIcon(item.status)}
                            size={24}
                            color={getStatusColor(item.status)}
                        />
                        <Text style={styles.orderNumber}>#{item.order_number}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status?.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderInfo}>
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

                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.infoText}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.orderFooter}>
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
                <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Orders</Text>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'active' && styles.activeTab]}
                    onPress={() => setSelectedTab('active')}
                >
                    <MaterialCommunityIcons
                        name="package-variant"
                        size={20}
                        color={selectedTab === 'active' ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.tabText, selectedTab === 'active' && styles.activeTabText]}>
                        Active
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'completed' && styles.activeTab]}
                    onPress={() => setSelectedTab('completed')}
                >
                    <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color={selectedTab === 'completed' ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.tabText, selectedTab === 'completed' && styles.activeTabText]}>
                        Completed
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Orders List */}
            <FlatList
                data={orders}
                renderItem={renderOrderCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name={selectedTab === 'active' ? "package-variant-closed-remove" : "history"}
                            size={64}
                            color={theme.colors.textTertiary}
                        />
                        <Text style={styles.emptyTitle}>
                            No {selectedTab} orders
                        </Text>
                        <Text style={styles.emptyText}>
                            {selectedTab === 'active'
                                ? 'Accept orders from the Dashboard to see them here'
                                : 'Completed orders will appear here'}
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
    orderNumberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    orderNumber: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
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
        marginBottom: theme.spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    infoText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.text,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border + '40',
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
        paddingHorizontal: theme.spacing.xl,
    },
});

export default DriverOrdersScreen;
