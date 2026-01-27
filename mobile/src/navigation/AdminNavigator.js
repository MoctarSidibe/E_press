import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import theme from '../theme/theme';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';

const Tab = createBottomTabNavigator();

const AdminNavigator = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Dashboard') {
                        iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    } else if (route.name === 'AllOrders') {
                        iconName = focused ? 'list' : 'list-outline';
                    } else if (route.name === 'Users') {
                        iconName = focused ? 'people' : 'people-outline';
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
                component={AdminDashboardScreen}
                options={{ tabBarLabel: 'Dashboard' }}
            />
            <Tab.Screen
                name="AllOrders"
                component={AdminOrdersScreen}
                options={{ tabBarLabel: 'Orders' }}
            />
            <Tab.Screen name="Users" component={AdminUsersScreen} />
            <Tab.Screen name="Profile" component={AdminProfileScreen} />
        </Tab.Navigator>
    );
};

export default AdminNavigator;
