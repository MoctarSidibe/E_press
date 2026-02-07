import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import theme from '../theme/theme';

// Driver screens
import DriverDashboardScreen from '../screens/driver/DriverDashboardScreen';
import DriverOrdersScreen from '../screens/driver/DriverOrdersScreen';
import DriverOrderDetailsScreen from '../screens/driver/DriverOrderDetailsScreen';
import ScanQRScreen from '../screens/driver/ScanQRScreen';
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
                options={{ tabBarLabel: 'Dashboard' }}
            />
            <Tab.Screen
                name="DriverOrders"
                component={DriverOrdersScreen}
                options={{ tabBarLabel: 'My Orders' }}
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
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DriverTabs" component={DriverTabs} />
            <Stack.Screen name="DriverOrderDetails" component={DriverOrderDetailsScreen} />
            <Stack.Screen name="ScanQR" component={ScanQRScreen} />
        </Stack.Navigator>
    );
};

export default DriverNavigator;
