// Admin placeholder screens - to be fully implemented
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import theme from '../../theme/theme';

const AdminDashboardScreen = () => {
    const { t } = useTranslation();
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('admin.dashboard.title')}</Text>
            <Text style={styles.subtitle}>{t('admin.dashboard.subtitle')}</Text>
        </View>
    );
};

export const AdminOrdersScreen = () => {
    const { t } = useTranslation();
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('admin.orders.title')}</Text>
            <Text style={styles.subtitle}>{t('admin.orders.subtitle')}</Text>
        </View>
    );
};

export const AdminUsersScreen = () => {
    const { t } = useTranslation();
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('admin.users.title')}</Text>
            <Text style={styles.subtitle}>{t('admin.users.subtitle')}</Text>
        </View>
    );
};

export const AdminProfileScreen = () => {
    const { t } = useTranslation();
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('admin.profile.title')}</Text>
            <Text style={styles.subtitle}>{t('admin.profile.subtitle')}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    title: {
        fontSize: theme.fonts.sizes.xxl,
        fontWeight: theme.fonts.weights.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: theme.fonts.sizes.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});

export default AdminDashboardScreen;
