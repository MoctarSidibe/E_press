import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import theme from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import KYCSubmitScreen from '../screens/kyc/KYCSubmitScreen';
import KYCStatusScreen from '../screens/kyc/KYCStatusScreen';

// Driver screens
import DriverDashboardScreen from '../screens/driver/DriverDashboardScreen';
import DriverOrdersScreen from '../screens/driver/DriverOrdersScreen';
import DriverOrderDetailsScreen from '../screens/driver/DriverOrderDetailsScreen';
import ScanQRScreen from '../screens/driver/ScanQRScreen';
import PickupOrderScreen from '../screens/driver/PickupOrderScreen';
import DeliveryOrderScreen from '../screens/driver/DeliveryOrderScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const DriverTabs = () => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Dashboard') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'DriverOrders') {
                        iconName = focused ? 'list' : 'list-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textTertiary,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
                    height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
                },
            })}
        >
            <Tab.Screen
                name="Dashboard"
                component={DriverDashboardScreen}
                options={{ tabBarLabel: t('nav.dashboard') }}
            />
            <Tab.Screen
                name="DriverOrders"
                component={DriverOrdersScreen}
                options={{ tabBarLabel: t('nav.myOrders') }}
            />
            <Tab.Screen
                name="Profile"
                component={DriverProfileScreen}
                options={{ tabBarLabel: t('nav.profile') }}
            />
        </Tab.Navigator>
    );
};

const DriverNavigator = () => {
    const { user, logout, updateUser } = useAuth();
    const [showSubmit, setShowSubmit] = useState(false);

    const kycStatus = user?.kycStatus || 'not_submitted';

    // Gate: must complete KYC before accessing the app
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

    // kycStatus === 'approved' — full access
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DriverTabs" component={DriverTabs} />
            <Stack.Screen name="DriverOrderDetails" component={DriverOrderDetailsScreen} />
            <Stack.Screen name="ScanQR" component={ScanQRScreen} />
            {/* Alias so any reference to 'QRScanner' also works */}
            <Stack.Screen name="QRScanner" component={ScanQRScreen} />
            <Stack.Screen name="PickupOrder" component={PickupOrderScreen} />
            <Stack.Screen name="DeliveryOrder" component={DeliveryOrderScreen} />
        </Stack.Navigator>
    );
};

export default DriverNavigator;
