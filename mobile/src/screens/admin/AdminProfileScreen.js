import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme/theme';

const AdminProfileScreen = () => {
    const { logout } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Admin Profile</Text>
            <TouchableOpacity style={styles.button} onPress={logout}>
                <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 20,
    },
    button: {
        backgroundColor: theme.colors.error,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default AdminProfileScreen;
