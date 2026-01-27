import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme/theme';

const DriverProfileScreen = () => {
    const { logout, user } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: logout
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {user?.full_name?.substring(0, 2).toUpperCase() || 'DR'}
                    </Text>
                </View>
                <Text style={styles.name}>{user?.full_name || 'Driver'}</Text>
                <Text style={styles.email}>{user?.email}</Text>
                <View style={styles.badge}>
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#fff" />
                    <Text style={styles.badgeText}>Verified Driver</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIcon}>
                        <MaterialCommunityIcons name="account-cog" size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.menuText}>Personal Information</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIcon}>
                        <MaterialCommunityIcons name="bank" size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.menuText}>Bank Details</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIcon}>
                        <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.menuText}>Notifications</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} />
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Version 1.0.0</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        backgroundColor: '#fff',
        paddingVertical: 40,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 15,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    badgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    section: {
        marginTop: 25,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        marginHorizontal: 20,
        padding: 15,
        borderRadius: 12,
        backgroundColor: theme.colors.error + '10',
        gap: 8,
    },
    logoutText: {
        color: theme.colors.error,
        fontSize: 16,
        fontWeight: 'bold',
    },
    version: {
        textAlign: 'center',
        marginTop: 30,
        color: theme.colors.textTertiary,
        fontSize: 12,
    },
});

export default DriverProfileScreen;
