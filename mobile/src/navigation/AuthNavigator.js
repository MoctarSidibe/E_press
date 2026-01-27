import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => {
    console.log('[AuthNavigator] Rendering...');

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                listeners={{
                    focus: () => console.log('[AuthNavigator] Login screen focused'),
                }}
            />
            <Stack.Screen
                name="Register"
                component={RegisterScreen}
                listeners={{
                    focus: () => console.log('[AuthNavigator] Register screen focused'),
                }}
            />
        </Stack.Navigator>
    );
};

export default AuthNavigator;
