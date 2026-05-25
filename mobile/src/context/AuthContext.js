import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { APP_VARIANT } from '../config/variant';
import notificationService from '../services/notification';

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
            const storedToken = await AsyncStorage.getItem('auth_token');
            if (!storedToken) {
                // No token → land on Guest page
                return;
            }

            // Verify token is still valid and fetch fresh user data from server
            const response = await authAPI.getMe();
            const freshUser = response.data;

            // Map snake_case server fields to camelCase
            const normalizedUser = {
                id:                  freshUser.id,
                email:               freshUser.email,
                fullName:            freshUser.fullName || freshUser.full_name,
                phone:               freshUser.phone,
                role:                freshUser.role,
                avatarUrl:           freshUser.avatarUrl || freshUser.avatar_url,
                cardNumber:          freshUser.cardNumber || freshUser.card_number,
                pointsBalance:       freshUser.pointsBalance ?? freshUser.points_balance ?? 0,
                pointsEarnedTotal:   freshUser.pointsEarnedTotal ?? freshUser.points_earned_total ?? 0,
                kycStatus:           freshUser.kycStatus || freshUser.kyc_status || 'not_submitted',
                kycRejectionReason:  freshUser.kycRejectionReason || freshUser.kyc_rejection_reason || null,
            };

            // Persist fresh data
            await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
            setToken(storedToken);
            setUser(normalizedUser);
        } catch (error) {
            // Token invalid, expired, or server unreachable — clear session, show Guest
            console.log('[AuthContext] Session invalid, clearing:', error.message);
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            console.log('[AuthContext] Login attempt for:', email, 'variant:', APP_VARIANT);
            // Send the app variant so the server can block cross-app login
            // (e.g. driver account on Customer app).
            const response = await authAPI.login(email, password, APP_VARIANT);

            console.log('[AuthContext] Login successful:', response.data.user.email, response.data.user.role);
            await AsyncStorage.setItem('auth_token', response.data.token);
            await AsyncStorage.setItem('user', JSON.stringify(response.data.user));

            setToken(response.data.token);
            setUser(response.data.user);

            return { success: true };
        } catch (error) {
            console.error('[AuthContext] Login failed:', JSON.stringify({
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                url: error.config?.url
            }, null, 2));
            
            // Handle different error formats
            let errorMessage = 'Login failed';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                errorMessage = error.response.data.errors.map(err => err.msg || err.message || err).join(', ');
            } else if (error.message) {
                errorMessage = error.message;
            } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network')) {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    };

    const register = async (userData) => {
        try {
            console.log('[AuthContext] Register attempt for:', userData.email, 'variant:', APP_VARIANT);
            // Always attach the app variant so the server can enforce role/variant rules.
            const response = await authAPI.register({ ...userData, appVariant: APP_VARIANT });
            const { user, token } = response.data;

            console.log('[AuthContext] Registration successful:', user.email, user.role);
            await AsyncStorage.setItem('auth_token', token);
            await AsyncStorage.setItem('user', JSON.stringify(user));

            setUser(user);
            setToken(token);

            return { success: true };
        } catch (error) {
            console.error('[AuthContext] Registration failed:', JSON.stringify({
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                url: error.config?.url
            }, null, 2));
            
            // Handle different error formats
            let errorMessage = 'Registration failed';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                errorMessage = error.response.data.errors.map(err => err.msg || err.message || err).join(', ');
            } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return {
                success: false,
                error: errorMessage,
            };
        }
    };

    const logout = async () => {
        // Best-effort unregister the device's push token so the next account on
        // this phone doesn't inherit pushes. Must run BEFORE we drop the JWT
        // since the endpoint is authenticated.
        try { await notificationService.unregisterFromBackend(); } catch (_) {}
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        setUser(null);
        setToken(null);
    };

    // Merge partial updates into the stored user (e.g. kycStatus after submission)
    const updateUser = async (partialUpdate) => {
        const updated = { ...user, ...partialUpdate };
        setUser(updated);
        await AsyncStorage.setItem('user', JSON.stringify(updated));
    };

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
