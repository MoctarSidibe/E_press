import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI } from '../../services/api';
import socketService from '../../services/socket';
import theme from '../../theme/theme';

const ReadyForDeliveryScreen = ({ navigation }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingReady, setMarkingReady] = useState({});

    useEffect(() => {
        loadOrders();
        setupSocketListeners();

        return () => {
            socketService.off('order:status_updated');
        };
    }, []);

    const setupSocketListeners = () => {
        socketService.on('order:status_updated', (data) => {
            loadOrders();
        });
    };

    const loadOrders = async () => {
        try {
            // Get orders that are received (in facility) but not ready yet
            const response = await ordersAPI.getFacilityOrders('in_facility');
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAsReady = async (orderId) => {
        Alert.alert(
            'Mark Ready for Delivery?',
            'This will notify delivery couriers that the order is ready',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Ready',
                    onPress: async () => {
                        setMarkingReady(prev => ({ ...prev, [orderId]: true }));

                        try {
                            await ordersAPI.updateStatus(orderId, 'ready', 'Cleaned and ready for delivery');

                            Alert.alert('Success', 'Order marked ready! Delivery couriers have been notified.');
                            loadOrders();
                        } catch (error) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to mark order as ready');
                        } finally {
                            setMarkingReady(prev => ({ ...prev, [orderId]: false }));
                        }
                    }
                }
            ]
        );
    };

    const renderOrderItem = ({ item }) => {
        const isMarkingThisOrder = markingReady[item.id];

        return (
            <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <View style={styles.orderNumber}>
                        <MaterialCommunityIcons name="ticket" size={20} color={theme.colors.primary} />
                        <Text style={styles.orderNumberText}>{item.order_number}</Text>
                    </View>

                    {item.is_express && (
                        <View style={styles.expressBadge}>
                            <MaterialCommunityIcons name="flash" size={14} color="#fff" />
                            <Text style={styles.expressBadgeText}>EXPRESS</Text>
                        </View>
                    )}
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
                        <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>{item.delivery_address}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="clock" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>
                            Received: {new Date(item.received_at || item.updated_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.readyButton, isMarkingThisOrder && styles.readyButtonDisabled]}
                    onPress={() => markAsReady(item.id)}
                    disabled={isMarkingThisOrder}
                >
                    {isMarkingThisOrder ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
                            <Text style={styles.readyButtonText}>Mark Ready for Delivery</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="check-decagram" size={32} color={theme.colors.success} />
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Cleaning in Process</Text>
                    <Text style={styles.headerSubtitle}>{orders.length} orders in facility</Text>
                </View>
            </View>

            {/* Orders List */}
            {orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                        name="check-all"
                        size={80}
                        color={theme.colors.textTertiary}
                    />
                    <Text style={styles.emptyTitle}>All Caught Up!</Text>
                    <Text style={styles.emptySubtitle}>
                        No orders waiting to be marked ready
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
        color: theme.colors.primary,
    },
    expressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.warning,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        gap: theme.spacing.xs,
    },
    expressBadgeText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.xs,
        fontWeight: theme.fonts.weights.semibold,
    },
    orderDetails: {
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
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
    readyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.success,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.sm,
    },
    readyButtonDisabled: {
        opacity: 0.6,
    },
    readyButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
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

export default ReadyForDeliveryScreen;
