import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Platform
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme/theme';

/**
 * Signature Capture Component
 * @param {Object} props
 * @param {Function} props.onSave - Callback with base64 signature data
 * @param {Function} props.onCancel - Cancel callback
 * @param {boolean} props.visible - Modal visibility
 */
const SignaturePad = ({ onSave, onCancel, visible }) => {
    const [signature, setSignature] = useState(null);
    const signatureRef = React.useRef();

    const handleOK = (signatureData) => {
        setSignature(signatureData);
        onSave(signatureData);
    };

    const handleClear = () => {
        setSignature(null);
        signatureRef.current?.clearSignature();
    };

    const handleConfirm = () => {
        // This triggers onOK via the component
        signatureRef.current?.readSignature();
    };

    const style = `.m-signature-pad--footer {display: none; margin: 0px;} 
                  body,html {width: 100%; height: 100%;}`;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onCancel}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Customer Signature</Text>
                    <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                        <MaterialCommunityIcons name="close" size={26} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                <View style={styles.canvasContainer}>
                    <SignatureScreen
                        ref={signatureRef}
                        onOK={handleOK}
                        onClear={() => setSignature(null)}
                        autoClear={false}
                        descriptionText="Sign here"
                        webStyle={style}
                        backgroundColor="#f5f5f5"
                    />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={handleClear}
                    >
                        <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleConfirm}
                    >
                        <Text style={styles.saveText}>Save Signature</Text>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 60 : theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: '#fff',
        zIndex: 1,
    },
    title: {
        fontSize: theme.fonts.sizes.xl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
    },
    closeButton: {
        padding: 5,
    },
    canvasContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    footer: {
        flexDirection: 'row',
        padding: theme.spacing.xl,
        gap: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: '#fff',
        paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.xl,
    },
    clearButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        alignItems: 'center',
    },
    clearText: {
        color: theme.colors.primary,
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.bold,
    },
    saveButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
    },
    saveText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.bold,
    },
});

export default SignaturePad;
