// Unauthenticated navigation stack for the Customer app (E-Press).
// Register is locked to role='customer' — this app only signs up customers.
// Worker registration lives in WorkerAuthNavigator (the Pro binary).
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GuestHomeScreen from '../screens/guest/GuestHomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
// 3-step modern register flow. The legacy single-page RegisterScreen is still
// in the repo for reference but no longer wired into any navigator.
import RegisterStepsScreen from '../screens/auth/RegisterStepsScreen';

const Stack = createNativeStackNavigator();

const GuestNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="GuestHome" component={GuestHomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
                name="Register"
                component={RegisterStepsScreen}
                initialParams={{ role: 'customer', lockRole: true }}
            />
        </Stack.Navigator>
    );
};

export default GuestNavigator;
