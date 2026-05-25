import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { pointsAPI } from '../../services/api';
import theme from '../../theme/theme';

const PointsHistoryScreen = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const [transactions, setTransactions] = useState([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [balanceRes, historyRes] = await Promise.all([
                pointsAPI.getBalance(),
                pointsAPI.getHistory(1),
            ]);
            setBalance(balanceRes.data.pointsBalance || 0);
            const items = historyRes.data.transactions || historyRes.data || [];
            setTransactions(items);
            setHasMore(items.length >= 20);
            setPage(1);
        } catch (err) {
            console.error('Points history error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const loadMore = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const res = await pointsAPI.getHistory(nextPage);
            const items = res.data.transactions || res.data || [];
            setTransactions(prev => [...prev, ...items]);
            setHasMore(items.length >= 20);
            setPage(nextPage);
        } catch (err) {
            console.error('Load more error:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'earned': return { name: 'plus-circle', color: theme.colors.success };
            case 'redeemed': return { name: 'minus-circle', color: theme.colors.error };
            case 'adjusted': return { name: 'pencil-circle', color: theme.colors.info };
            case 'expired': return { name: 'clock-remove', color: theme.colors.textSecondary };
            default: return { name: 'star-circle', color: theme.colors.primary };
        }
    };

    const getTransactionLabel = (type) => {
        switch (type) {
            case 'earned': return t('points.types.earned');
            case 'redeemed': return t('points.types.redeemed');
            case 'adjusted': return t('points.types.adjusted');
            case 'expired': return t('points.types.expired');
            default: return type;
        }
    };

    const renderTransaction = ({ item }) => {
        const icon = getTransactionIcon(item.transaction_type);
        const isPositive = item.points > 0;

        return (
            <View style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: icon.color + '18' }]}>
                    <MaterialCommunityIcons name={icon.name} size={24} color={icon.color} />
                </View>
                <View style={styles.txInfo}>
                    <Text style={styles.txLabel}>{getTransactionLabel(item.transaction_type)}</Text>
                    {item.description ? (
                        <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
                    ) : null}
                    <Text style={styles.txDate}>
                        {new Date(item.created_at).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'fr-FR', {
                            day: 'numeric', month: 'short', year: 'numeric'
                        })}
                    </Text>
                </View>
                <Text style={[styles.txPoints, { color: isPositive ? theme.colors.success : theme.colors.error }]}>
                    {isPositive ? '+' : ''}{item.points} pts
                </Text>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <StatusBar style="dark" />
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('points.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
                <MaterialCommunityIcons name="star-circle" size={40} color="#FFD700" />
                <Text style={styles.balanceLabel}>{t('points.currentBalance')}</Text>
                <Text style={styles.balanceValue}>{balance}</Text>
                <Text style={styles.balanceUnit}>{t('points.unit')}</Text>
            </View>

            {/* Transactions */}
            <FlatList
                data={transactions}
                keyExtractor={(item, i) => item.id?.toString() || String(i)}
                renderItem={renderTransaction}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={theme.colors.primary} /> : null
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="star-outline" size={48} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyText}>{t('points.empty.title')}</Text>
                        <Text style={styles.emptySubtext}>{t('points.empty.subtitle')}</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.md, backgroundColor: theme.colors.surface,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text },
    balanceCard: {
        backgroundColor: '#0F3460',
        margin: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        alignItems: 'center',
        ...theme.shadows.lg,
    },
    balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: theme.fonts.sizes.sm, marginTop: theme.spacing.sm },
    balanceValue: { color: '#FFD700', fontSize: 56, fontWeight: 'bold', lineHeight: 64 },
    balanceUnit: { color: 'rgba(255,255,255,0.6)', fontSize: theme.fonts.sizes.md },
    list: { paddingHorizontal: theme.spacing.lg, paddingBottom: 24 },
    txRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg, padding: theme.spacing.md,
        marginBottom: theme.spacing.sm, ...theme.shadows.xs,
    },
    txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
    txInfo: { flex: 1 },
    txLabel: { fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text },
    txDesc: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
    txDate: { fontSize: theme.fonts.sizes.xs, color: theme.colors.textTertiary, marginTop: 4 },
    txPoints: { fontSize: theme.fonts.sizes.lg, fontWeight: 'bold' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginTop: theme.spacing.md },
    emptySubtext: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: theme.spacing.xs, textAlign: 'center' },
});

export default PointsHistoryScreen;
