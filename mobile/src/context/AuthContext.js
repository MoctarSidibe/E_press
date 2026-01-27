import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        console.error('useAuth failed: No context found');
        throw new Error('useAuth must be used within an AuthProvider');
    }
    // console.log('[useAuth] Context value:', Object.keys(context));
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    console.log('[AuthContext] Provider initialized');

    // Load user from storage on mount
    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            console.log('[AuthContext] Loading stored user...');
            const storedToken = await AsyncStorage.getItem('auth_token'); // Kept 'auth_token' for consistency with login/register
            const storedUser = await AsyncStorage.getItem('user');

            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                console.log('[AuthContext] User loaded from storage:', parsedUser.email, parsedUser.role);
                setToken(storedToken);
                setUser(parsedUser);
            } else {
                console.log('[AuthContext] No stored user found');
            }
        } catch (error) {
            console.error('[AuthContext] Error loading user:', error);
        } finally {
            setLoading(false);
            console.log('[AuthContext] Loading complete');
        }
    };

    const login = async (email, password) => {
        try {
            console.log('[AuthContext] Login attempt for:', email);
            // FIX: Pass arguments separately as expected by api.js
            const response = await authAPI.login(email, password);

            console.log('[AuthContext] Login successful:', response.data.user.email, response.data.user.role);
            await AsyncStorage.setItem('auth_token', response.data.token);
            await AsyncStorage.setItem('user', JSON.stringify(response.data.user));

            setToken(response.data.token);
            setUser(response.data.user);

            return { success: true };
        } catch (error) {
            console.error('[AuthContext] Login failed:', JSON.stringify(error.response?.data || error.message, null, 2));
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            const { user, token } = response.data;

            await AsyncStorage.setItem('auth_token', token);
            await AsyncStorage.setItem('user', JSON.stringify(user));

            setUser(user);
            setToken(token);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Registration failed',
            };
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        setUser(null);
        setToken(null);
    };

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
