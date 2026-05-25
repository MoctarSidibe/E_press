// Runtime variant resolver. The same JS codebase ships two binaries:
//   - "customer" (E-Press)      : end-users browsing services and placing orders
//   - "worker"   (E-Press Pro)  : drivers + cleaners — picks role on first launch
//
// The variant is injected by app.config.js into Constants.expoConfig.extra.variant.

import Constants from 'expo-constants';

const raw = Constants.expoConfig?.extra?.variant
    || Constants.manifest?.extra?.variant
    || 'customer';

export const APP_VARIANT = raw === 'worker' ? 'worker' : 'customer';

export const isCustomerApp = APP_VARIANT === 'customer';
export const isWorkerApp = APP_VARIANT === 'worker';

// Which user roles a given variant is allowed to log in as.
export const ALLOWED_ROLES = isCustomerApp
    ? ['customer']
    : ['driver', 'cleaner'];

export const isRoleAllowedInThisApp = (role) => ALLOWED_ROLES.includes(role);
