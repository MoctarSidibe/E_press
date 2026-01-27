// Driver placeholder screens - to be fully implemented
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../theme/theme';

const DriverDashboardScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Driver Dashboard</Text>
            <Text style={styles.subtitle}>Your stats and earnings will be displayed here</Text>
        </View>
    );
};

// Removed legacy exports

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

export default DriverDashboardScreen;
