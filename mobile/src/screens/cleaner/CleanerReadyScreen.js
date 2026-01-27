import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI } from '../../services/api';
import socketService from '../../services/socket';
import theme from '../../theme/theme';

const CleanerReadyScreen = ({ navigation }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadOrders();
        setupSocketListeners();

        return () => {
            if (socketService.off) {
                socketService.off('order:status_updated');
            }
        };
    }, []);

    const setupSocketListeners = () => {
        if (socketService.on) {
            socketService.on('order:status_updated', (data) => {
                loadOrders();
            });
        }
    };

    const loadOrders = async () => {
        try {
            // Get orders that are marked as ready (waiting for driver)
            const response = await ordersAPI.getFacilityOrders('ready');
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to load ready orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const renderOrderItem = ({ item }) => {
        return (
            <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <View style={styles.orderNumber}>
                        <MaterialCommunityIcons name="ticket" size={20} color={theme.colors.success} />
                        <Text style={styles.orderNumberText}>{item.order_number}</Text>
                    </View>

                    <View style={styles.statusBadge}>
                        <MaterialCommunityIcons name="truck-delivery" size={14} color="#fff" />
                        <Text style={styles.statusBadgeText}>WAITING FOR DRIVER</Text>
                    </View>
                </View>

                <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="account" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>{item.customer_name}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="hanger" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>{item.reception_item_count || item.pickup_item_count || item.confirmed_item_count} items</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="clock" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>
                            Ready since: {new Date(item.updated_at).toLocaleTimeString()}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading ready orders...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={32} color={theme.colors.text} />
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Ready for Delivery</Text>
                    <Text style={styles.headerSubtitle}>{orders.length} orders waiting for driver</Text>
                </View>
            </View>

            {/* Orders List */}
            {orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                        name="truck-check-outline"
                        size={80}
                        color={theme.colors.textTertiary}
                    />
                    <Text style={styles.emptyTitle}>No Pending Pickups</Text>
                    <Text style={styles.emptySubtitle}>
                        All ready orders have been picked up by couriers
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderOrderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                loadOrders();
                            }}
                            tintColor={theme.colors.primary}
                        />
                    }
                />
            )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
    },
    listContent: {
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    orderCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.md,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    orderNumber: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    orderNumberText: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.success,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.info,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        gap: theme.spacing.xs,
    },
    statusBadgeText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.xs,
        fontWeight: theme.fonts.weights.semibold,
    },
    orderDetails: {
        gap: theme.spacing.sm,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    detailText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.text,
        flex: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    emptyTitle: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
    },
    emptySubtitle: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
    },
});

export default CleanerReadyScreen;
