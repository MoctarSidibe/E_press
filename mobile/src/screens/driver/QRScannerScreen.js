import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Vibration,
    Button
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI } from '../../services/api';
import theme from '../../theme/theme';

const QRScannerScreen = ({ navigation, route }) => {
    const { orderId, onScan } = route.params || {};
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [flashOn, setFlashOn] = useState(false);

    // Initial permission check is handled by the hook, but we can trigger it if needed or rely on the UI state

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned) return;

        setScanned(true);
        Vibration.vibrate(100);

        try {
            // Validate QR code
            const response = await ordersAPI.validateQR(data);

            if (response.data.valid) {
                const order = response.data.order;

                // If we're expecting a specific order ID, verify it matches
                if (orderId && order.id !== orderId) {
                    Alert.alert(
                        'Wrong Order',
                        `This QR code is for order #${order.order_number}, but you're looking for a different order.`,
                        [{ text: 'OK', onPress: () => setScanned(false) }]
                    );
                    return;
                }

                // Call the onScan callback if provided
                if (onScan) {
                    onScan(order);
                    navigation.goBack();
                } else if (route.params?.returnScreen) {
                    // Navigate back with params
                    navigation.navigate(route.params.returnScreen, { scannedOrder: order });
                } else {
                    // Default: Navigate to order details
                    navigation.replace('OrderDetails', { orderId: order.id });
                }
            } else {
                Alert.alert(
                    'Invalid QR Code',
                    'This QR code is not valid for an order.',
                    [{ text: 'OK', onPress: () => setScanned(false) }]
                );
            }
        } catch (error) {
            Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to validate QR code',
                [{ text: 'OK', onPress: () => setScanned(false) }]
            );
        }
    };

    if (!permission) {
        // Camera permissions are still loading
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <MaterialCommunityIcons name="camera-off" size={64} color={theme.colors.textTertiary} />
                <Text style={styles.permissionText}>No access to camera</Text>
                <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={requestPermission}
                >
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan QR Code</Text>
                <TouchableOpacity onPress={() => setFlashOn(!flashOn)} style={styles.flashButton}>
                    <MaterialCommunityIcons
                        name={flashOn ? 'flash' : 'flash-off'}
                        size={24}
                        color="#fff"
                    />
                </TouchableOpacity>
            </View>

            {/* Scanner */}
            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
                enableTorch={flashOn}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
                <View style={styles.scanArea}>
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>

                <Text style={styles.instructionText}>
                    {orderId
                        ? 'Align QR code within the frame to verify order'
                        : 'Align QR code within the frame to scan'}
                </Text>
            </View>

            {/* Rescan Button */}
            {scanned && (
                <View style={styles.rescanContainer}>
                    <TouchableOpacity
                        style={styles.rescanButton}
                        onPress={() => setScanned(false)}
                    >
                        <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
                        <Text style={styles.rescanButtonText}>Scan Again</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.md,
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.semibold,
        color: '#fff',
    },
    flashButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanArea: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#fff',
        borderWidth: 4,
    },
    cornerTopLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    cornerTopRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    cornerBottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    cornerBottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    instructionText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        textAlign: 'center',
        marginTop: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.xl,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    rescanContainer: {
        position: 'absolute',
        bottom: theme.spacing.xxl,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    rescanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.sm,
    },
    rescanButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
    },
    permissionText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.lg,
        marginTop: theme.spacing.lg,
        textAlign: 'center',
    },
    permissionButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        marginTop: theme.spacing.xl,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
    },
});

export default QRScannerScreen;
