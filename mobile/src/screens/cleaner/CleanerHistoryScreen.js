import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../theme/theme';
import api from '../../services/api';

const CleanerHistoryScreen = () => {
    const { t } = useTranslation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadOrders = async () => {
        try {
            const response = await api.get('/orders/cleaner/history');
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to load order history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadOrders();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadOrders();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'delivered':
                return theme.colors.success;
            case 'cancelled':
                return theme.colors.error;
            case 'ready':
                return theme.colors.warning;
            default:
                return theme.colors.textSecondary;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'delivered':
                return 'check-circle';
            case 'cancelled':
                return 'close-circle';
            case 'ready':
                return 'truck-delivery';
            default:
                return 'clock-outline';
        }
    };

    const renderOrderItem = ({ item }) => {
        const statusColor = getStatusColor(item.status);
        const statusIcon = getStatusIcon(item.status);

        return (
            <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <View style={styles.orderNumber}>
                        <MaterialCommunityIcons name="receipt" size={20} color={theme.colors.primary} />
                        <Text style={styles.orderNumberText}>#{item.order_number}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <MaterialCommunityIcons name={statusIcon} size={14} color="#fff" />
                        <Text style={styles.statusText}>{t(`order.status.${item.status}`)}</Text>
                    </View>
                </View>

                <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="account" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>{item.customer_name}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="hanger" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>
                            {item.reception_item_count || item.pickup_item_count} {t('order.details.items')}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.textSecondary} />
                        <Text style={styles.detailText}>
                            Reçu: {new Date(item.updated_at).toLocaleDateString()}
                        </Text>
                    </View>

                    {item.status === 'delivered' && (
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="check" size={18} color={theme.colors.success} />
                            <Text style={[styles.detailText, { color: theme.colors.success }]}>
                                Livré: {new Date(item.delivery_actual_at || item.updated_at).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Historique</Text>
                <Text style={styles.headerSubtitle}>
                    {orders.length} commandes
                </Text>
            </View>

            <FlatList
                data={orders}
                renderItem={renderOrderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="history" size={80} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyTitle}>Aucune commande</Text>
                        <Text style={styles.emptySubtitle}>Vos commandes traitées apparaîtront ici</Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    header: {
        backgroundColor: theme.colors.surface,
        paddingTop: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    headerSubtitle: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
    },
    listContent: {
        padding: theme.spacing.md,
    },
    orderCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        ...theme.shadows.medium,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    orderNumber: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderNumberText: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.primary,
        marginLeft: theme.spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
    },
    statusText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.xs,
        fontWeight: theme.fonts.weights.semibold,
        marginLeft: theme.spacing.xs,
    },
    orderDetails: {
        gap: theme.spacing.sm,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.text,
        marginLeft: theme.spacing.sm,
        flex: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.xxl * 2,
    },
    emptyTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    emptySubtitle: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});

export default CleanerHistoryScreen;
