import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const CleanerProfileScreen = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Failed to logout');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Cleaner Profile</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <MaterialCommunityIcons name="account-circle" size={80} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.userName}>{user?.name || 'Cleaner'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'CLEANER'}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color="#FFF" style={styles.logoutIcon} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: 20,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingTop: 60, // approximate status bar height
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
    },
    content: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        paddingTop: 40,
    },
    profileCard: {
        backgroundColor: theme.colors.surface,
        padding: 30,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        marginBottom: 40,
    },
    avatarContainer: {
        marginBottom: 15,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.textPrimary,
        marginBottom: 5,
    },
    userEmail: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 15,
    },
    roleBadge: {
        backgroundColor: theme.colors.primary + '20', // 20% opacity
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    roleText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.error,
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 25,
        alignItems: 'center',
        width: '100%',
        justifyContent: 'center',
    },
    logoutIcon: {
        marginRight: 10,
    },
    logoutText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default CleanerProfileScreen;
