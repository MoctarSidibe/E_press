import 'react-native-gesture-handler'; // MUST BE AT THE TOP
import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import theme from './src/theme/theme';

// Navigators
import AuthNavigator from './src/navigation/AuthNavigator';
import CustomerNavigator from './src/navigation/CustomerNavigator';
import DriverNavigator from './src/navigation/DriverNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';
import CleanerNavigator from './src/navigation/CleanerNavigator';

// Error logging helper
const logError = (context, error) => {
  console.error(`[E-Press Error - ${context}]`, error);
};

function AppNavigator() {
  const { user, loading } = useAuth();
  // console.log('[App] State:', { user: user?.email, role: user?.role, loading });

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 10, color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  try {
    switch (user.role) {
      case 'customer': return <CustomerNavigator />;
      case 'driver': return <DriverNavigator />;
      case 'admin': return <AdminNavigator />;
      case 'cleaner': return <CleanerNavigator />;
      default: return <CustomerNavigator />;
    }
  } catch (error) {
    logError('RoleNav', error);
    return <AuthNavigator />;
  }
}

export default function App() {
  console.log('[App] Starting Full E-Press App');

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer onError={(e) => logError('NavContainer', e)}>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
