import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import theme from '../theme/theme';

// Customer screens
import HomeScreen from '../screens/customer/HomeScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import NewOrderScreen from '../screens/customer/NewOrderScreen';
import OrderDetailsScreen from '../screens/customer/OrderDetailsScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';
import CourierMapScreen from '../screens/customer/CourierMapScreen';
import PointsHistoryScreen from '../screens/customer/PointsHistoryScreen';
import OfflineOrderConfirmScreen from '../screens/customer/OfflineOrderConfirmScreen';
import AddressesScreen from '../screens/customer/AddressesScreen';
import AddressFormScreen from '../screens/customer/AddressFormScreen';
import OfflineBanner from '../components/OfflineBanner';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const CustomerTabs = () => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Orders') {
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
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: t('nav.home') }}
            />
            <Tab.Screen
                name="Orders"
                component={OrdersScreen}
                options={{ tabBarLabel: t('nav.orders') }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: t('nav.profile') }}
            />
        </Tab.Navigator>
    );
};

const CustomerNavigator = () => {
    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
                <Stack.Screen name="NewOrder" component={NewOrderScreen} />
                <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
                <Stack.Screen name="Tracking" component={TrackingScreen} />
                <Stack.Screen name="CourierMap" component={CourierMapScreen} />
                <Stack.Screen name="PointsHistory" component={PointsHistoryScreen} />
                <Stack.Screen name="OfflineOrderConfirm" component={OfflineOrderConfirmScreen} />
                <Stack.Screen name="Addresses" component={AddressesScreen} />
                <Stack.Screen name="AddressForm" component={AddressFormScreen} />
            </Stack.Navigator>
            <OfflineBanner />
        </View>
    );
};

export default CustomerNavigator;
