// Admin placeholder screens - to be fully implemented
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../theme/theme';

const AdminDashboardScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>System statistics and analytics will be displayed here</Text>
        </View>
    );
};

export const AdminOrdersScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>All Orders</Text>
            <Text style={styles.subtitle}>Order management interface will be displayed here</Text>
        </View>
    );
};

export const AdminUsersScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>User Management</Text>
            <Text style={styles.subtitle}>Manage customers and drivers here</Text>
        </View>
    );
};

export const AdminProfileScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Admin Profile</Text>
            <Text style={styles.subtitle}>Admin settings and preferences</Text>
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
