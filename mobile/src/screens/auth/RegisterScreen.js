import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme/theme';

const RegisterScreen = ({ navigation }) => {
    const { register } = useAuth();
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'customer', // default to customer
    });
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        // Validation
        if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
            Alert.alert(t('common.error'), t('auth.register.errors.fillAll'));
            return;
        }

        if (formData.password.length < 6) {
            Alert.alert(t('common.error'), t('auth.register.errors.passwordLength'));
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            Alert.alert(t('common.error'), t('auth.register.errors.passwordMatch'));
            return;
        }

        setLoading(true);
        const result = await register(formData);
        setLoading(false);

        if (!result.success) {
            Alert.alert(t('auth.register.errors.failed'), result.error);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>

                    <Text style={styles.title}>{t('auth.register.title')}</Text>
                    <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.fullName')}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={formData.fullName}
                        onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                        editable={!loading}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.email')}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={formData.email}
                        onChangeText={(text) => setFormData({ ...formData, email: text })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.phone')}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={formData.phone}
                        onChangeText={(text) => setFormData({ ...formData, phone: text })}
                        keyboardType="phone-pad"
                        editable={!loading}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.password')}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={formData.password}
                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                        secureTextEntry
                        autoCapitalize="none"
                        editable={!loading}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.confirmPassword')}
                        placeholderTextColor={theme.colors.textTertiary}
                        value={formData.confirmPassword}
                        onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                        secureTextEntry
                        autoCapitalize="none"
                        editable={!loading}
                    />

                    {/* Role Selection */}
                    <Text style={styles.roleLabel}>{t('auth.register.role')}</Text>
                    <View style={styles.roleButtons}>
                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                formData.role === 'customer' && styles.roleButtonActive,
                            ]}
                            onPress={() => setFormData({ ...formData, role: 'customer' })}
                            disabled={loading}
                        >
                            <Ionicons
                                name="person"
                                size={24}
                                color={formData.role === 'customer' ? '#fff' : theme.colors.text}
                            />
                            <Text
                                style={[
                                    styles.roleButtonText,
                                    formData.role === 'customer' && styles.roleButtonTextActive,
                                ]}
                            >
                                {t('auth.register.customer')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                formData.role === 'driver' && styles.roleButtonActive,
                            ]}
                            onPress={() => setFormData({ ...formData, role: 'driver' })}
                            disabled={loading}
                        >
                            <Ionicons
                                name="car"
                                size={24}
                                color={formData.role === 'driver' ? '#fff' : theme.colors.text}
                            />
                            <Text
                                style={[
                                    styles.roleButtonText,
                                    formData.role === 'driver' && styles.roleButtonTextActive,
                                ]}
                            >
                                {t('auth.register.driver')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                formData.role === 'cleaner' && styles.roleButtonActive,
                            ]}
                            onPress={() => setFormData({ ...formData, role: 'cleaner' })}
                            disabled={loading}
                        >
                            <Ionicons
                                name="sparkles"
                                size={24}
                                color={formData.role === 'cleaner' ? '#fff' : theme.colors.text}
                            />
                            <Text
                                style={[
                                    styles.roleButtonText,
                                    formData.role === 'cleaner' && styles.roleButtonTextActive,
                                ]}
                            >
                                {t('auth.register.cleaner')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>{t('auth.register.createAccount')}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => navigation.goBack()}
                        disabled={loading}
                    >
                        <Text style={styles.linkText}>
                            {t('auth.register.hasAccount')} <Text style={styles.linkTextBold}>{t('auth.register.signIn')}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.xl,
    },
    header: {
        marginBottom: theme.spacing.xl,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
    },
    title: {
        fontSize: theme.fonts.sizes.xxxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
    },
    form: {
        width: '100%',
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    roleLabel: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    roleButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    roleButton: {
        flex: 1,
        minWidth: 90,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 2,
        borderColor: theme.colors.border,
        gap: theme.spacing.sm,
    },
    roleButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    roleButtonText: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.medium,
        color: theme.colors.text,
    },
    roleButtonTextActive: {
        color: '#fff',
    },
    button: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        ...theme.shadows.md,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: theme.fonts.sizes.lg,
        fontWeight: theme.fonts.weights.semibold,
    },
    linkButton: {
        marginTop: theme.spacing.lg,
        alignItems: 'center',
    },
    linkText: {
        color: theme.colors.textSecondary,
        fontSize: theme.fonts.sizes.md,
    },
    linkTextBold: {
        color: theme.colors.primary,
        fontWeight: theme.fonts.weights.semibold,
    },
});

export default RegisterScreen;
