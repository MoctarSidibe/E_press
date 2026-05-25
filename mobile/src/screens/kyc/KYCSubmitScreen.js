import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { kycAPI } from '../../services/api';
import theme from '../../theme/theme';

// Document definitions per role — labels/descriptions resolved via i18n at render time.
const DRIVER_DOC_KEYS = [
    { key: 'national_id_front', tKey: 'nationalId',    icon: 'card-account-details', required: true  },
    { key: 'selfie',            tKey: 'selfie',        icon: 'camera-account',       required: true  },
    { key: 'driver_license',    tKey: 'driverLicense', icon: 'steering',             required: true  },
    { key: 'vehicle_photo',     tKey: 'vehiclePhoto',  icon: 'motorbike',            required: false },
];

const CLEANER_DOC_KEYS = [
    { key: 'national_id_front', tKey: 'nationalId', icon: 'card-account-details', required: true },
    { key: 'selfie',            tKey: 'selfie',     icon: 'camera-account',       required: true },
];

const KYCSubmitScreen = ({ onSubmitted }) => {
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
    const insets = useSafeAreaInsets();
    const [docs, setDocs] = useState({});
    const [uploading, setUploading] = useState(false);

    const docList = (user?.role === 'driver' ? DRIVER_DOC_KEYS : CLEANER_DOC_KEYS).map(d => ({
        ...d,
        label: t(`kyc.submit.docs.${d.tKey}.label`),
        desc: t(`kyc.submit.docs.${d.tKey}.desc`),
    }));
    const requiredKeys = docList.filter(d => d.required).map(d => d.key);
    const allRequiredDone = requiredKeys.every(k => !!docs[k]);

    const pickImage = async (docKey) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                t('kyc.submit.permissions.galleryDeniedTitle'),
                t('kyc.submit.permissions.galleryDeniedMsg')
            );
            return;
        }

        Alert.alert(
            t('kyc.submit.permissions.pickSourceTitle'),
            t('kyc.submit.permissions.pickSourceMsg'),
            [
                {
                    text: t('kyc.submit.permissions.cameraOption'),
                    onPress: async () => {
                        const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
                        if (camStatus !== 'granted') return;
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.8,
                            allowsEditing: true,
                        });
                        if (!result.canceled) {
                            setDocs(prev => ({ ...prev, [docKey]: result.assets[0] }));
                        }
                    }
                },
                {
                    text: t('kyc.submit.permissions.galleryOption'),
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.8,
                            allowsEditing: true,
                        });
                        if (!result.canceled) {
                            setDocs(prev => ({ ...prev, [docKey]: result.assets[0] }));
                        }
                    }
                },
                { text: t('common.cancel'), style: 'cancel' }
            ]
        );
    };

    const handleSubmit = async () => {
        if (!allRequiredDone) {
            Alert.alert(
                t('kyc.submit.errors.missingDocsTitle'),
                t('kyc.submit.errors.missingDocsMsg')
            );
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            for (const [key, asset] of Object.entries(docs)) {
                const uri = asset.uri;
                const ext = uri.split('.').pop() || 'jpg';
                formData.append(key, {
                    uri,
                    name: `${key}.${ext}`,
                    type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                });
            }

            await kycAPI.submit(formData);

            if (updateUser) {
                await updateUser({ kycStatus: 'pending' });
            }

            if (onSubmitted) onSubmitted();
        } catch (err) {
            console.error('KYC submit error:', err);
            Alert.alert(
                t('kyc.submit.errors.submitErrorTitle'),
                err.response?.data?.error || t('kyc.submit.errors.submitErrorDefault')
            );
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerIcon}>
                    <MaterialCommunityIcons name="shield-account" size={32} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{t('kyc.submit.title')}</Text>
                    <Text style={styles.headerSubtitle}>
                        {user?.role === 'driver'
                            ? t('kyc.submit.subtitleDriver')
                            : t('kyc.submit.subtitleCleaner')}
                    </Text>
                </View>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="information-outline" size={18} color="#1565C0" />
                <Text style={styles.infoText}>{t('kyc.submit.infoBanner')}</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Document cards */}
                {docList.map((doc) => {
                    const uploaded = docs[doc.key];
                    return (
                        <TouchableOpacity
                            key={doc.key}
                            style={[styles.docCard, uploaded && styles.docCardDone]}
                            onPress={() => pickImage(doc.key)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.docLeft}>
                                <View style={[styles.docIconWrap, uploaded && styles.docIconWrapDone]}>
                                    <MaterialCommunityIcons
                                        name={uploaded ? 'check-circle' : doc.icon}
                                        size={28}
                                        color={uploaded ? theme.colors.success : theme.colors.primary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.docTitleRow}>
                                        <Text style={styles.docLabel}>{doc.label}</Text>
                                        {doc.required && <Text style={styles.requiredBadge}>*</Text>}
                                    </View>
                                    <Text style={styles.docDesc} numberOfLines={2}>{doc.desc}</Text>
                                    {uploaded && (
                                        <Text style={styles.docUploaded}>
                                            <MaterialCommunityIcons name="check" size={12} color={theme.colors.success} />
                                            {' '}{t('kyc.submit.documentAdded')}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Thumbnail preview */}
                            {uploaded ? (
                                <Image
                                    source={{ uri: uploaded.uri }}
                                    style={styles.thumbnail}
                                />
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <MaterialCommunityIcons name="upload" size={20} color={theme.colors.textTertiary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}

                {/* Progress summary */}
                <View style={styles.progressCard}>
                    <Text style={styles.progressLabel}>
                        {t('kyc.submit.progress', { done: Object.keys(docs).length, total: docList.length })}
                    </Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, {
                            width: `${(Object.keys(docs).length / docList.length) * 100}%`
                        }]} />
                    </View>
                </View>

                {/* Submit button */}
                <TouchableOpacity
                    style={[styles.submitBtn, (!allRequiredDone || uploading) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!allRequiredDone || uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="send-check" size={22} color="#fff" />
                            <Text style={styles.submitBtnText}>{t('kyc.submit.submitButton')}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    headerIcon: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: theme.fonts.sizes.lg, fontWeight: 'bold', color: theme.colors.text },
    headerSubtitle: { fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: 2 },
    infoBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#E3F2FD', marginHorizontal: theme.spacing.lg,
        marginTop: theme.spacing.sm, borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.sm,
    },
    infoText: { flex: 1, fontSize: theme.fonts.sizes.xs, color: '#1565C0', lineHeight: 16 },
    scroll: { flex: 1 },
    scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.lg },
    docCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.sm + 4, marginBottom: theme.spacing.sm,
        borderWidth: 1.5, borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    docCardDone: {
        borderColor: theme.colors.success + '60',
        backgroundColor: theme.colors.success + '08',
    },
    docLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    docIconWrap: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: theme.colors.primary + '12',
        justifyContent: 'center', alignItems: 'center',
    },
    docIconWrapDone: { backgroundColor: theme.colors.success + '15' },
    docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    docLabel: { fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.text },
    requiredBadge: { fontSize: 16, color: theme.colors.error, fontWeight: 'bold', marginTop: -2 },
    docDesc: { fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 16 },
    docUploaded: { fontSize: theme.fonts.sizes.xs, color: theme.colors.success, marginTop: 4, fontWeight: '500' },
    thumbnail: { width: 52, height: 52, borderRadius: 8, marginLeft: 8 },
    uploadPlaceholder: {
        width: 52, height: 52, borderRadius: 8, marginLeft: 8,
        backgroundColor: theme.colors.background,
        borderWidth: 1.5, borderColor: theme.colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center',
    },
    progressCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.sm + 2,
        marginBottom: theme.spacing.md,
    },
    progressLabel: { fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: 6 },
    progressBar: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3 },
    progressFill: { height: 6, backgroundColor: theme.colors.primary, borderRadius: 3 },
    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.xl, paddingVertical: theme.spacing.md,
        ...theme.shadows.md,
    },
    submitBtnDisabled: { backgroundColor: theme.colors.textTertiary },
    submitBtnText: { color: '#fff', fontSize: theme.fonts.sizes.lg, fontWeight: 'bold' },
});

export default KYCSubmitScreen;
