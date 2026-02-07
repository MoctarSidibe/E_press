import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Linking, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LeafletMapComponent from '../../components/map/LeafletMapComponent';
import { ordersAPI } from '../../services/api';
import theme from '../../theme/theme';

const TrackingScreen = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { orderId } = route.params || {};
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrderData();
    }, [orderId]);

    const loadOrderData = async () => {
        try {
            const response = await ordersAPI.getById(orderId);
            setOrder(response.data);
        } catch (error) {
            console.error('Failed to load order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCallDriver = () => {
        // In production, you'd get driver phone from the order
        const phoneNumber = order?.driver_phone || '+237600000000';

        Alert.alert(
            'Call Driver',
            'Would you like to call your driver?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Call',
                    onPress: () => {
                        Linking.openURL(`tel:${phoneNumber}`).catch(err => {
                            console.error('Failed to make call:', err);
                            Alert.alert('Error', 'Unable to make call');
                        });
                    }
                }
            ]
        );
    };

    // Check if courier is assigned
    const hasCourier = order?.pickup_driver_id || order?.delivery_driver_id;

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading tracking info...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('customer.tracking.title')} #{order?.order_number}</Text>
                <View style={{ width: 40 }} />
            </View>

            {!hasCourier ? (
                // No courier assigned yet
                <View style={styles.waitingContainer}>
                    <MaterialCommunityIcons name="clock-outline" size={64} color={theme.colors.warning} />
                    <Text style={styles.waitingTitle}>Looking for Available Courier</Text>
                    <Text style={styles.waitingText}>
                        Your order has been placed successfully. We're searching for an available courier to pick up your items.
                    </Text>
                    <Text style={styles.waitingSubtext}>
                        You'll be notified once a courier accepts your order.
                    </Text>
                </View>
            ) : (
                // Courier assigned - show map
                <>
                    {/* Map Area */}
                    <View style={styles.mapContainer}>
                        <LeafletMapComponent
                            driverLocation={order.driver_location || { latitude: 0.4517, longitude: 9.4673 }}
                            origin={{ latitude: parseFloat(order.pickup_latitude) || 0.4517, longitude: parseFloat(order.pickup_longitude) || 9.4673 }}
                            destination={{ latitude: parseFloat(order.delivery_latitude) || 0.4517, longitude: parseFloat(order.delivery_longitude) || 9.4673 }}
                        />
                    </View>

                    {/* Driver Info Card - Overlay */}
                    <View style={styles.driverCard}>
                        <View style={styles.driverRow}>
                            <View style={styles.driverAvatar}>
                                <MaterialCommunityIcons name="account" size={24} color="#fff" />
                            </View>
                            <View style={styles.driverInfo}>
                                <Text style={styles.driverName}>{t('customer.tracking.courier')}</Text>
                                <Text style={styles.driverStatus}>{order.status?.replace(/_/g, ' ').toUpperCase()}</Text>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleCallDriver}
                                >
                                    <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.progressContainer}>
                            <View style={styles.progressLine} />
                            <View style={[styles.progressDot, styles.dotCompleted]} />
                            <View style={[styles.progressDot, order.status === 'in_transit' ? styles.dotActive : styles.dotCompleted]} />
                            <View style={[styles.progressDot, order.status === 'delivered' ? styles.dotActive : {}]} />
                        </View>

                        <Text style={styles.statusText}>{order.status?.replace(/_/g, ' ').toUpperCase()}</Text>
                    </View>
                </>
            )}
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
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
    },
    backButton: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 20,
        ...theme.shadows.sm,
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    waitingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    waitingTitle: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    waitingText: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
        lineHeight: 22,
    },
    waitingSubtext: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    mapContainer: {
        flex: 1,
    },
    driverCard: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        ...theme.shadows.lg,
    },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    driverAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    driverStatus: {
        color: theme.colors.textSecondary,
        fontSize: theme.fonts.sizes.sm,
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 10,
        backgroundColor: theme.colors.secondary + '20',
        borderRadius: 20,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
        position: 'relative',
    },
    progressLine: {
        position: 'absolute',
        top: 6,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: theme.colors.border,
        zIndex: -1,
    },
    progressDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme.colors.border,
        borderWidth: 2,
        borderColor: '#fff',
    },
    dotCompleted: {
        backgroundColor: theme.colors.primary,
    },
    dotActive: {
        backgroundColor: theme.colors.secondary,
        transform: [{ scale: 1.2 }],
    },
    statusText: {
        textAlign: 'center',
        color: theme.colors.text,
        fontWeight: '500',
    },
});

export default TrackingScreen;
