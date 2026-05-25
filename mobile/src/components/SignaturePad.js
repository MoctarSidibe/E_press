import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Platform,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import SignatureScreen from 'react-native-signature-canvas';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme/theme';

/**
 * Signature Capture Component
 * @param {Object} props
 * @param {Function} props.onSave   - Callback with base64 signature data
 * @param {Function} props.onCancel - Cancel callback
 * @param {boolean}  props.visible  - Modal visibility
 */
const SignaturePad = ({ onSave, onCancel, visible }) => {
    const { t } = useTranslation();
    const signatureRef = useRef(null);
    // Track whether the user has actually drawn something
    const [hasDrawn, setHasDrawn] = useState(false);

    // Called by SignatureScreen when the canvas produces a valid image
    const handleOK = (signatureData) => {
        if (!signatureData || signatureData === 'data:image/png;base64,') {
            Alert.alert('Signature vide', 'Veuillez signer avant de confirmer.');
            return;
        }
        onSave(signatureData);
        setHasDrawn(false); // reset for next time
    };

    // Called by SignatureScreen when there is nothing to read (empty canvas)
    const handleEmpty = () => {
        Alert.alert('Signature vide', 'Veuillez signer dans le cadre avant de confirmer.');
    };

    const handleClear = () => {
        setHasDrawn(false);
        signatureRef.current?.clearSignature();
    };

    const handleConfirm = () => {
        if (!hasDrawn) {
            Alert.alert('Signature vide', 'Veuillez signer dans le cadre avant de confirmer.');
            return;
        }
        // readSignature() will trigger onOK or onEmpty depending on canvas content
        signatureRef.current?.readSignature();
    };

    // Injected web CSS — hides the default footer controls
    const webStyle = `
        .m-signature-pad--footer { display: none !important; }
        body, html { width: 100%; height: 100%; margin: 0; padding: 0; background: #f8f9fa; }
        .m-signature-pad { box-shadow: none; border: none; background: #f8f9fa; }
        .m-signature-pad--body { border: none; background: #f8f9fa; }
        canvas { touch-action: none; }
    `;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onCancel}
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onCancel} style={styles.backBtn}>
                        <MaterialCommunityIcons name="close" size={22} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <MaterialCommunityIcons name="draw" size={20} color={theme.colors.primary} />
                        <Text style={styles.title}>{t('common.customerSignature')}</Text>
                    </View>
                    <View style={{ width: 36 }} />
                </View>

                {/* ── Instruction ── */}
                <View style={styles.instruction}>
                    <MaterialCommunityIcons name="gesture-tap-hold" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.instructionText}>
                        Le client signe dans le cadre ci-dessous
                    </Text>
                </View>

                {/* ── Canvas ── */}
                <View style={styles.canvasWrapper}>
                    <View style={styles.canvasBorder}>
                        <SignatureScreen
                            ref={signatureRef}
                            onOK={handleOK}
                            onEmpty={handleEmpty}
                            onBegin={() => setHasDrawn(true)}
                            onClear={() => setHasDrawn(false)}
                            autoClear={false}
                            webStyle={webStyle}
                            backgroundColor="#f8f9fa"
                            penColor="#1A1F36"
                            dotSize={2}
                            minWidth={2}
                            maxWidth={5}
                        />
                    </View>
                    {/* Watermark when empty */}
                    {!hasDrawn && (
                        <View style={styles.placeholder} pointerEvents="none">
                            <MaterialCommunityIcons name="draw-pen" size={40} color="#D1D5DB" />
                            <Text style={styles.placeholderText}>Signature ici</Text>
                        </View>
                    )}
                </View>

                {/* ── Status indicator ── */}
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, hasDrawn && styles.statusDotActive]} />
                    <Text style={[styles.statusText, hasDrawn && styles.statusTextActive]}>
                        {hasDrawn ? 'Signature capturée ✓' : 'En attente de signature...'}
                    </Text>
                </View>

                {/* ── Footer buttons ── */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.clearBtn, !hasDrawn && styles.clearBtnDisabled]}
                        onPress={handleClear}
                        disabled={!hasDrawn}
                    >
                        <MaterialCommunityIcons
                            name="eraser"
                            size={18}
                            color={hasDrawn ? theme.colors.error : '#D1D5DB'}
                        />
                        <Text style={[styles.clearText, !hasDrawn && styles.clearTextDisabled]}>
                            {t('common.clear')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.saveBtn, !hasDrawn && styles.saveBtnDisabled]}
                        onPress={handleConfirm}
                        activeOpacity={0.85}
                    >
                        <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
                        <Text style={styles.saveText}>{t('common.saveSignature')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: theme.colors.text,
    },

    // Instruction bar
    instruction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: theme.colors.primary + '10',
    },
    instructionText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        flexShrink: 1,
    },

    // Canvas
    canvasWrapper: {
        flex: 1,
        padding: 16,
        position: 'relative',
    },
    canvasBorder: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        backgroundColor: '#f8f9fa',
    },
    placeholder: {
        position: 'absolute',
        top: 0, left: 16, right: 16, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
    },
    placeholderText: {
        fontSize: 15,
        color: '#D1D5DB',
        fontWeight: '600',
    },

    // Status
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D1D5DB',
    },
    statusDotActive: {
        backgroundColor: theme.colors.success,
    },
    statusText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    statusTextActive: {
        color: theme.colors.success,
        fontWeight: '600',
    },

    // Footer
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    clearBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: theme.colors.error,
        backgroundColor: theme.colors.error + '08',
    },
    clearBtnDisabled: {
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    clearText: {
        color: theme.colors.error,
        fontSize: 15,
        fontWeight: '700',
    },
    clearTextDisabled: {
        color: '#D1D5DB',
    },
    saveBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: theme.colors.success,
        elevation: 2,
        shadowColor: theme.colors.success,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    saveBtnDisabled: {
        backgroundColor: '#D1D5DB',
        elevation: 0,
        shadowOpacity: 0,
    },
    saveText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
});

export default SignaturePad;
