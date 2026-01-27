import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme/theme';

// Customer screens
import HomeScreen from '../screens/customer/HomeScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import NewOrderScreen from '../screens/customer/NewOrderScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';
import CourierMapScreen from '../screens/customer/CourierMapScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tabs navigator
const TabsNavigator = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Orders') {
                        iconName = focused ? 'file-document' : 'file-document-outline';
                    } else if (route.name === 'CourierMap') {
                        iconName = focused ? 'map-marker-radius' : 'map-marker-radius-outline';
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
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
                    height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen
                name="CourierMap"
                component={CourierMapScreen}
                options={{ tabBarLabel: 'Couriers' }}
            />
            <Tab.Screen name="Orders" component={OrdersScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

// Main Customer Navigator with stack for modals/details
const CustomerNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="Tabs" component={TabsNavigator} />
            <Stack.Screen name="NewOrder" component={NewOrderScreen} />
            <Stack.Screen name="Tracking" component={TrackingScreen} />
        </Stack.Navigator>
    );
};

export default CustomerNavigator;
