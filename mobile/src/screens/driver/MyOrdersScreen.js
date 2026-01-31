import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { driverAPI } from '../../services/api';
import theme from '../../theme/theme';

const MyOrdersScreen = ({ navigation }) => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'

    const loadOrders = async () => {
        try {
            const status = activeTab === 'active'
                ? 'assigned,driver_en_route_pickup,arrived_pickup,picked_up,driver_en_route_delivery,arrived_delivery'
                : 'received_at_base,cleaning,ready_for_delivery,out_for_delivery,delivered,cancelled';

            const response = await driverAPI.getOrders(status);
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to load driver orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadOrders();
        }, [activeTab])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadOrders();
    };

    const handleOrderPress = (order) => {
        if (order.status === 'delivered' || order.status === 'cancelled') {
            // Future: Show completed order details
            return;
        }

        // Navigate based on status (Pickup vs Delivery phase)
        const isPickupPhase = ['assigned', 'driver_en_route_pickup', 'arrived_pickup'].includes(order.status);

        if (isPickupPhase) {
            navigation.navigate('PickupOrder', { orderId: order.id });
        } else {
            navigation.navigate('DeliveryOrder', { orderId: order.id });
        }
    };

    const renderOrderItem = ({ item }) => {
        const isPickup = item.pickup_type === 'immediate'; // Or determine by status phase if needed
        // Simplify: Just use status to determine icon
        const getStatusIcon = (status) => {
            if (status.includes('pickup')) return 'package-up';
            if (status.includes('delivery')) return 'package-down';
            if (status === 'delivered') return 'check-circle';
            return 'clock-outline';
        };

        const getStatusColor = (status) => {
            if (status === 'delivered') return theme.colors.success;
            if (status === 'cancelled') return theme.colors.error;
            if (status.includes('arrived')) return theme.colors.warning;
            return theme.colors.primary;
        };

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handleOrderPress(item)}
            >
                <View style={[styles.statusStrip, { backgroundColor: getStatusColor(item.status) }]} />

                <View style={styles.cardContent}>
                    <View style={styles.headerRow}>
                        <Text style={styles.orderNumber}>#{item.order_number}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                {item.status.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.address} numberOfLines={2}>
                        {['assigned', 'driver_en_route_pickup', 'arrived_pickup'].includes(item.status)
                            ? item.pickup_address
                            : item.delivery_address}
                    </Text>

                    <View style={styles.footerRow}>
                        <View style={styles.infoItem}>
                            <MaterialCommunityIcons name="account" size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.infoText}>{item.customer_name}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <MaterialCommunityIcons name="package-variant" size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.infoText}>{item.confirmed_item_count} {t('order.details.items')}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.arrowContainer}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Orders</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'active' && styles.activeTab]}
                    onPress={() => setActiveTab('active')}
                >
                    <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>{t('driver.myOrders.active')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>{t('driver.myOrders.history')}</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderOrderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={theme.colors.textTertiary} />
                            <Text style={styles.emptyText}>{activeTab === 'active' ? t('driver.myOrders.noOrders') : t('driver.myOrders.noHistoryOrders')}</Text>
                        </View>
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
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    tab: {
        marginRight: 20,
        paddingVertical: 10,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: theme.colors.primary,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    activeTabText: {
        color: theme.colors.primary,
    },
    listContent: {
        padding: 20,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    statusStrip: {
        width: 6,
        height: '100%',
    },
    cardContent: {
        flex: 1,
        padding: 15,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    address: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 10,
        height: 40, // Fixed height for 2 lines
    },
    footerRow: {
        flexDirection: 'row',
        gap: 15,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    arrowContainer: {
        justifyContent: 'center',
        paddingRight: 10,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
});

export default MyOrdersScreen;
