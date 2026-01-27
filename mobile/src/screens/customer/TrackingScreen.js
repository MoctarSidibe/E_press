import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LeafletMapComponent from '../../components/map/LeafletMapComponent';
import theme from '../../theme/theme';

const TrackingScreen = ({ navigation, route }) => {
    const { orderId } = route.params || {};

    // Mock data for now - will connect to Socket.io later
    const [driverLocation, setDriverLocation] = useState({
        latitude: 37.78825,
        longitude: -122.4324,
    });

    // Simulation of driver moving
    useEffect(() => {
        const interval = setInterval(() => {
            setDriverLocation(prev => ({
                ...prev,
                latitude: prev.latitude + 0.0001,
                longitude: prev.longitude + 0.0001,
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Map Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tracking Order #{orderId}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Map Area */}
            <View style={styles.mapContainer}>
                <LeafletMapComponent
                    driverLocation={driverLocation}
                    origin={{ latitude: 37.78825, longitude: -122.4324 }}
                    destination={{ latitude: 37.79, longitude: -122.44 }}
                />
            </View>

            {/* Driver Info Card - Overlay */}
            <View style={styles.driverCard}>
                <View style={styles.driverRow}>
                    <View style={styles.driverAvatar}>
                        <MaterialCommunityIcons name="account" size={24} color="#fff" />
                    </View>
                    <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>John Doe</Text>
                        <Text style={styles.driverStatus}>Arriving in 10 mins</Text>
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.actionButton}>
                            <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressLine} />
                    <View style={[styles.progressDot, styles.dotCompleted]} />
                    <View style={[styles.progressDot, styles.dotCompleted]} />
                    <View style={[styles.progressDot, styles.dotActive]} />
                    <View style={styles.progressDot} />
                </View>

                <Text style={styles.statusText}>Driver is on the way to pickup</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        backgroundColor: theme.colors.secondary + '20', // transparent secondary
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
