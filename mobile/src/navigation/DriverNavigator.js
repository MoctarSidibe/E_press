import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import theme from '../theme/theme';

// Driver screens
import AvailableOrdersScreen from '../screens/driver/AvailableOrdersScreen';
import MyOrdersScreen from '../screens/driver/MyOrdersScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';
import PickupOrderScreen from '../screens/driver/PickupOrderScreen';
import DeliveryOrderScreen from '../screens/driver/DeliveryOrderScreen';
import QRScannerScreen from '../screens/driver/QRScannerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const DriverTabs = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Available') {
                        iconName = focused ? 'map' : 'map-outline';
                    } else if (route.name === 'MyOrders') {
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
                name="Available"
                component={AvailableOrdersScreen}
                options={{ tabBarLabel: 'Available' }}
            />
            <Tab.Screen
                name="MyOrders"
                component={MyOrdersScreen}
                options={{ tabBarLabel: 'My Orders' }}
            />
            <Tab.Screen name="Profile" component={DriverProfileScreen} />
        </Tab.Navigator>
    );
};

const DriverNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DriverTabs" component={DriverTabs} />
            <Stack.Screen name="PickupOrder" component={PickupOrderScreen} />
            <Stack.Screen name="DeliveryOrder" component={DeliveryOrderScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        </Stack.Navigator>
    );
};

export default DriverNavigator;
