import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import KYCSubmitScreen from '../screens/kyc/KYCSubmitScreen';
import KYCStatusScreen from '../screens/kyc/KYCStatusScreen';
import LaverieSetupScreen from '../screens/laverie/LaverieSetupScreen';
import { laveriesAPI } from '../services/api';

// Cleaner screens
import ReceptionScreen from '../screens/cleaner/ReceptionScreen';
import ReadyForDeliveryScreen from '../screens/cleaner/ReadyForDeliveryScreen';
import CleanerHistoryScreen from '../screens/cleaner/CleanerHistoryScreen';
import QRScannerScreen from '../screens/driver/QRScannerScreen'; // Reuse driver QR scanner

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CleanerReadyScreen from '../screens/cleaner/CleanerReadyScreen';
import CleanerProfileScreen from '../screens/cleaner/CleanerProfileScreen';

// Tabs navigator
const TabsNavigator = () => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Reception') {
                        iconName = focused ? 'package-variant' : 'package-variant-closed';
                    } else if (route.name === 'ReadyForDelivery') {
                        iconName = focused ? 'washing-machine' : 'washing-machine';
                    } else if (route.name === 'CleanerReady') {
                        iconName = focused ? 'truck-delivery' : 'truck-delivery-outline';
                    } else if (route.name === 'History') {
                        iconName = focused ? 'history' : 'history';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'account' : 'account-outline';
                    }

                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textTertiary,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    paddingBottom: Math.max(insets.bottom, 10), // Use safe area or min padding
                    height: 60 + Math.max(insets.bottom, 10),   // Dynamic height
                },
            })}
        >
            <Tab.Screen
                name="Reception"
                component={ReceptionScreen}
                options={{ tabBarLabel: t('nav.reception') }}
            />
            <Tab.Screen
                name="ReadyForDelivery"
                component={ReadyForDeliveryScreen}
                options={{ tabBarLabel: t('nav.inProcess') }}
            />
            <Tab.Screen
                name="CleanerReady"
                component={CleanerReadyScreen}
                options={{ tabBarLabel: t('nav.ready') }}
            />
            <Tab.Screen
                name="History"
                component={CleanerHistoryScreen}
                options={{ tabBarLabel: t('nav.history') }}
            />
            <Tab.Screen
                name="Profile"
                component={CleanerProfileScreen}
                options={{ tabBarLabel: t('nav.profile') }}
            />
        </Tab.Navigator>
    );
};

// Main Cleaner Navigator with KYC + laverie gates.
// Gate order:
//   1. KYC not submitted          -> KYCSubmitScreen
//   2. KYC pending / rejected     -> KYCStatusScreen
//   3. KYC approved + no laverie  -> LaverieSetupScreen (mandatory onboarding step)
//   4. KYC approved + laverie set -> main tabs
const CleanerNavigator = () => {
    const { user, logout, updateUser } = useAuth();
    const [showSubmit, setShowSubmit] = useState(false);
    const [laverieStatus, setLaverieStatus] = useState('unknown'); // 'unknown' | 'missing' | 'present'
    const [checkingLaverie, setCheckingLaverie] = useState(false);

    const kycStatus = user?.kycStatus || 'not_submitted';

    // Lazy laverie check. Only fires once KYC is approved — no point hitting the
    // endpoint while the cleaner is still gated by KYC.
    const refreshLaverie = useCallback(async () => {
        setCheckingLaverie(true);
        try {
            const res = await laveriesAPI.getMine();
            setLaverieStatus(res.data?.laverie ? 'present' : 'missing');
        } catch (e) {
            // Network or 4xx — treat as missing so the cleaner can set up.
            // saveMine() is idempotent so retries are safe.
            console.warn('[CleanerNav] laverie check failed:', e.message);
            setLaverieStatus('missing');
        } finally {
            setCheckingLaverie(false);
        }
    }, []);

    useEffect(() => {
        if (kycStatus === 'approved' && laverieStatus === 'unknown') {
            refreshLaverie();
        }
    }, [kycStatus, laverieStatus, refreshLaverie]);

    if (kycStatus === 'not_submitted' || showSubmit) {
        return (
            <KYCSubmitScreen
                onSubmitted={() => {
                    updateUser({ kycStatus: 'pending' });
                    setShowSubmit(false);
                }}
            />
        );
    }

    if (kycStatus === 'pending' || kycStatus === 'rejected') {
        return (
            <KYCStatusScreen
                onResubmit={() => setShowSubmit(true)}
                onLogout={logout}
            />
        );
    }

    // KYC is approved. Need to know laverie status before deciding what to render.
    if (laverieStatus === 'unknown' || checkingLaverie) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (laverieStatus === 'missing') {
        return <LaverieSetupScreen onSaved={() => setLaverieStatus('present')} />;
    }

    // Approved + laverie present → full access.
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={TabsNavigator} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        </Stack.Navigator>
    );
};

export default CleanerNavigator;
