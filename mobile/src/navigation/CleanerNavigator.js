import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme/theme';

// Cleaner screens
import ReceptionScreen from '../screens/cleaner/ReceptionScreen';
import ReadyForDeliveryScreen from '../screens/cleaner/ReadyForDeliveryScreen';
import QRScannerScreen from '../screens/driver/QRScannerScreen'; // Reuse driver QR scanner

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CleanerReadyScreen from '../screens/cleaner/CleanerReadyScreen';
import CleanerProfileScreen from '../screens/cleaner/CleanerProfileScreen';

// Tabs navigator
const TabsNavigator = () => {
    const insets = useSafeAreaInsets();

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
                options={{ tabBarLabel: 'Reception' }}
            />
            <Tab.Screen
                name="ReadyForDelivery"
                component={ReadyForDeliveryScreen}
                options={{ tabBarLabel: 'In Process' }}
            />
            <Tab.Screen
                name="CleanerReady"
                component={CleanerReadyScreen}
                options={{ tabBarLabel: 'Ready' }}
            />
            <Tab.Screen
                name="Profile"
                component={CleanerProfileScreen}
                options={{ tabBarLabel: 'Profile' }}
            />
        </Tab.Navigator>
    );
};

// Main Cleaner Navigator with stack for QR scanner
const CleanerNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="Tabs" component={TabsNavigator} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        </Stack.Navigator>
    );
};

export default CleanerNavigator;
