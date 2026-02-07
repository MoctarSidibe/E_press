import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    ScrollView,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ordersAPI } from '../../services/api';
import theme from '../../theme/theme';

const ScanQRScreen = ({ navigation, route }) => {
    const { orderId: initialOrderId, checkpoint: initialCheckpoint } = route.params || {};

    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [scannedData, setScannedData] = useState(null);
    const [checkpoint, setCheckpoint] = useState(initialCheckpoint || 'picked_up');
    const [itemCount, setItemCount] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        getCameraPermission();
    }, []);

    const getCameraPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
    };

    const handleBarCodeScanned = ({ type, data }) => {
        if (scanned) return;

        setScanned(true);
        console.log('📷 QR Code scanned:', data);

        try {
            const parsed = JSON.parse(data);
            setScannedData(parsed);

            Alert.alert(
                'QR Code Scanned!',
                `Order #${parsed.num || parsed.order_number || 'Unknown'}`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            Alert.alert('Invalid QR Code', 'This QR code is not a valid E-Press order code');
            setScanned(false);
        }
    };

    const handleSubmit = async () => {
        if (!scannedData || !itemCount) {
            Alert.alert('Missing Information', 'Please scan QR code and enter item count');
            return;
        }

        try {
            setSubmitting(true);

            const orderId = scannedData.id || initialOrderId;

            await ordersAPI.scanOrder(orderId, {
                checkpoint,
                item_count: parseInt(itemCount),
                latitude: null, // Can add location later
                longitude: null,
                signature_data: null, // Can add signature later
                photos: [] // Can add photos later
            });

            Alert.alert(
                'Success!',
                `Order scanned at checkpoint: ${checkpoint.replace(/_/g, ' ')}`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error) {
            console.error('Failed to submit scan:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to submit checkpoint scan');
        } finally {
            setSubmitting(false);
        }
    };

    const checkpoints = [
        { value: 'picked_up', label: 'Picked Up', icon: 'package-up' },
        { value: 'received', label: 'Received at Facility', icon: 'office-building' },
        { value: 'ready', label: 'Ready for Delivery', icon: 'package-variant-closed-check' },
        { value: 'delivered', label: 'Delivered', icon: 'package-down' },
    ];

    if (hasPermission === null) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.centerContainer}>
                <MaterialCommunityIcons name="camera-off" size={64} color={theme.colors.error} />
                <Text style={styles.errorTitle}>Camera Permission Denied</Text>
                <Text style={styles.errorText}>
                    Please enable camera access in your device settings to scan QR codes
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={getCameraPermission}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Order QR Code</Text>
                <View style={{ width: 40 }} />
            </View>

            {!scanned ? (
                <>
                    {/* Camera View */}
                    <CameraView
                        style={styles.camera}
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                        }}
                    >
                        <View style={styles.overlay}>
                            <View style={styles.scanArea}>
                                <View style={[styles.corner, styles.topLeft]} />
                                <View style={[styles.corner, styles.topRight]} />
                                <View style={[styles.corner, styles.bottomLeft]} />
                                <View style={[styles.corner, styles.bottomRight]} />
                            </View>
                        </View>
                    </CameraView>

                    <View style={styles.instructions}>
                        <MaterialCommunityIcons name="qrcode-scan" size={32} color="#fff" />
                        <Text style={styles.instructionsText}>
                            {initialCheckpoint ? `Scanning for ${initialCheckpoint.replace('_', ' ')}` : 'Position QR code in frame'}
                        </Text>
                    </View>
                </>
            ) : (
                <ScrollView style={styles.form}>
                    {/* Scanned Order Info */}
                    <View style={styles.scannedInfo}>
                        <MaterialCommunityIcons name="check-circle" size={48} color={theme.colors.success} />
                        <Text style={styles.scannedTitle}>
                            Order #{scannedData?.num || scannedData?.order_number || 'Scanned'}
                        </Text>
                        <TouchableOpacity
                            style={styles.rescanButton}
                            onPress={() => {
                                setScanned(false);
                                setScannedData(null);
                            }}
                        >
                            <MaterialCommunityIcons name="qrcode-scan" size={20} color={theme.colors.primary} />
                            <Text style={styles.rescanText}>Scan Different Code</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Checkpoint Selection - Hidden if fixed context */}
                    {!initialCheckpoint && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Select Checkpoint</Text>
                            {checkpoints.map((cp) => (
                                <TouchableOpacity
                                    key={cp.value}
                                    style={[
                                        styles.checkpointItem,
                                        checkpoint === cp.value && styles.checkpointItemActive
                                    ]}
                                    onPress={() => setCheckpoint(cp.value)}
                                >
                                    <MaterialCommunityIcons
                                        name={cp.icon}
                                        size={24}
                                        color={checkpoint === cp.value ? theme.colors.primary : theme.colors.textSecondary}
                                    />
                                    <Text style={[
                                        styles.checkpointLabel,
                                        checkpoint === cp.value && styles.checkpointLabelActive
                                    ]}>
                                        {cp.label}
                                    </Text>
                                    {checkpoint === cp.value && (
                                        <MaterialCommunityIcons name="check" size={24} color={theme.colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Checkpoint Locked Display */}
                    {initialCheckpoint && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Action</Text>
                            <View style={[styles.checkpointItem, styles.checkpointItemActive]}>
                                <MaterialCommunityIcons
                                    name={checkpoint === 'picked_up' ? 'package-up' : 'package-down'}
                                    size={24}
                                    color={theme.colors.primary}
                                />
                                <Text style={[styles.checkpointLabel, styles.checkpointLabelActive]}>
                                    {checkpoint === 'picked_up' ? 'Confirm Pickup' : 'Confirm Delivery'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Item Count - Mandatory for Pickup and Delivery */}
                    {/* Show for all relevant checkpoints */}
                    {(checkpoint === 'picked_up' || checkpoint === 'delivered' || checkpoint === 'received' || !initialCheckpoint) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Confirm Item Count</Text>
                            <TextInput
                                style={styles.input}
                                value={itemCount}
                                onChangeText={setItemCount}
                                placeholder="Enter number of items received"
                                keyboardType="numeric"
                                placeholderTextColor={theme.colors.textTertiary}
                                autoFocus={checkpoint === 'picked_up'}
                            />
                            <Text style={styles.helperText}>
                                Please verify the number of items before confirming.
                            </Text>
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, (submitting || !itemCount) && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting || !itemCount}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
                                <Text style={styles.submitButtonText}>
                                    {checkpoint === 'picked_up' ? 'Confirm Pickup' : 'Confirm Delivery'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.xl,
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.textSecondary,
    },
    errorTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: 'bold',
        color: theme.colors.error,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    errorText: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xl + 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: '#fff',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
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
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    instructions: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    instructionsText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
    },
    form: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scannedInfo: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        marginBottom: theme.spacing.sm,
    },
    scannedTitle: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    rescanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.sm,
    },
    rescanText: {
        color: theme.colors.primary,
        fontSize: theme.fonts.sizes.sm,
        fontWeight: '600',
    },
    section: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    checkpointItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    checkpointItemActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    checkpointLabel: {
        flex: 1,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
    },
    checkpointLabelActive: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.success,
        padding: theme.spacing.md + 4,
        borderRadius: theme.borderRadius.lg,
        margin: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.lg,
        fontWeight: 'bold',
    },
    helperText: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
        fontStyle: 'italic',
    },
});

export default ScanQRScreen;
