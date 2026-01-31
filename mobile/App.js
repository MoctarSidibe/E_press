import 'react-native-gesture-handler'; // MUST BE AT THE TOP
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import initI18n from './src/i18n/i18n';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  // console.log('[App] State:', { user: user?.email, role: user?.role, loading });

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 10, color: theme.colors.text }}>{t('common.loading')}</Text>
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
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initI18n();
      setI18nReady(true);
    };
    init();
  }, []);

  if (!i18nReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  console.log('[App] Starting Full E-Press App');

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NavigationContainer onError={(e) => logError('NavContainer', e)}>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
