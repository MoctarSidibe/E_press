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
import { categoriesAPI } from './src/services/api';
import { initDB } from './src/db/localDB';
import { startConnectivityMonitor, registerBackgroundSync } from './src/services/syncService';

// Navigators
import GuestNavigator from './src/navigation/GuestNavigator';
import WorkerAuthNavigator from './src/navigation/WorkerAuthNavigator';
import CustomerNavigator from './src/navigation/CustomerNavigator';
import DriverNavigator from './src/navigation/DriverNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';
import CleanerNavigator from './src/navigation/CleanerNavigator';
import NotificationController from './src/components/NotificationController';
import { isCustomerApp, isWorkerApp, APP_VARIANT } from './src/config/variant';

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

  // Unauthenticated: pick the entry stack based on which binary this is.
  // Customer app -> guest browsing + customer login/register.
  // Worker app   -> role picker (driver / cleaner) + role-specific auth.
  if (!user) {
    return isWorkerApp ? <WorkerAuthNavigator /> : <GuestNavigator />;
  }

  // Authenticated. The backend already rejects cross-app login (see auth.service.js),
  // but we add a client-side guard so a stale cached session can't surface the wrong
  // navigator if the user's role drifted under us.
  const roleAllowedInThisApp =
    (isCustomerApp && user.role === 'customer') ||
    (isWorkerApp && (user.role === 'driver' || user.role === 'cleaner'));

  if (!roleAllowedInThisApp) {
    logError('RoleNav', new Error(`role ${user.role} not allowed in variant ${APP_VARIANT}`));
    return isWorkerApp ? <WorkerAuthNavigator /> : <GuestNavigator />;
  }

  try {
    switch (user.role) {
      case 'customer': return <><CustomerNavigator /><NotificationController /></>;
      case 'driver': return <><DriverNavigator /><NotificationController /></>;
      case 'admin': return <><AdminNavigator /><NotificationController /></>;
      case 'cleaner': return <><CleanerNavigator /><NotificationController /></>;
      default: return <><CustomerNavigator /><NotificationController /></>;
    }
  } catch (error) {
    logError('RoleNav', error);
    return isWorkerApp ? <WorkerAuthNavigator /> : <GuestNavigator />;
  }
}

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1. Language
      await initI18n();
      // 2. Offline DB — must be ready before any screen mounts
      try { await initDB(); } catch (e) { console.warn('[App] initDB failed:', e.message); }
      // 3. Connectivity monitor + background sync
      startConnectivityMonitor();
      registerBackgroundSync();
      // 4. Category cache clear
      await categoriesAPI.clearCache();
      setI18nReady(true);
    };
    init();
    return () => {
      // stopConnectivityMonitor is imported lazily — no-op if never connected
    };
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

  console.log('[App] Starting E-Press App, variant:', APP_VARIANT);

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
