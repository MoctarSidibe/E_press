import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import theme from '../../theme/theme';

const ProfileScreen = () => {
    const { user, logout } = useAuth();
    const { t } = useTranslation();
    const [languageModalVisible, setLanguageModalVisible] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <MaterialCommunityIcons name="account" size={48} color={theme.colors.primary} />
                </View>
                <Text style={styles.name}>{user?.fullName || 'User'}</Text>
                <Text style={styles.email}>{user?.email}</Text>
                <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
            </View>

            <View style={styles.options}>
                <TouchableOpacity 
                    style={styles.optionButton} 
                    onPress={() => setLanguageModalVisible(true)}
                >
                    <MaterialCommunityIcons name="translate" size={20} color={theme.colors.text} />
                    <Text style={styles.optionText}>{t('customer.profile.language')}</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <MaterialCommunityIcons name="logout" size={20} color="#fff" />
                <Text style={styles.logoutText}>{t('customer.profile.logout')}</Text>
            </TouchableOpacity>

            <LanguageSwitcher 
                visible={languageModalVisible} 
                onClose={() => setLanguageModalVisible(false)} 
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginTop: theme.spacing.xxl,
        marginBottom: theme.spacing.xl,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    name: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    email: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    role: {
        fontSize: theme.fonts.sizes.sm,
        color: theme.colors.primary,
        fontWeight: theme.fonts.weights.semibold,
        backgroundColor: theme.colors.primary + '15',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    options: {
        width: '100%',
        marginBottom: theme.spacing.lg,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    optionText: {
        color: theme.colors.text,
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.medium,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.error,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.sm,
    },
    logoutText: {
        color: '#fff',
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
    },
});

export default ProfileScreen;
