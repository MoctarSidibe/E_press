// Unauthenticated navigation stack for the Worker app (E-Press Pro).
// Entry: WorkerWelcomeScreen → role-specific Login / Register flows.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkerWelcomeScreen from '../screens/auth/WorkerWelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
// Worker app uses the same 3-step register; WorkerWelcomeScreen passes role+lockRole.
import RegisterStepsScreen from '../screens/auth/RegisterStepsScreen';

const Stack = createNativeStackNavigator();

const WorkerAuthNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="WorkerWelcome"
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="WorkerWelcome" component={WorkerWelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterStepsScreen} />
        </Stack.Navigator>
    );
};

export default WorkerAuthNavigator;
