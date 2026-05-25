// Dynamic Expo config. The same JS codebase ships two binaries:
//   APP_VARIANT=customer  -> "E-Press"      (com.epress.customer)
//   APP_VARIANT=worker    -> "E-Press Pro"  (com.epress.pro)  for drivers + cleaners
//
// Pick the variant at build/start time:
//   npm run start:customer   /  npm run start:worker
//   eas build --profile production-customer  /  --profile production-worker

const VARIANT = process.env.APP_VARIANT === 'worker' ? 'worker' : 'customer';

const VARIANTS = {
    customer: {
        name: 'E-Press',
        slug: 'epress',
        scheme: 'epress',
        bundleIdentifier: 'com.epress.customer',
        androidPackage: 'com.epress.customer',
        icon: './assets/icon.png',
        adaptiveIconForeground: './assets/adaptive-icon.png',
    },
    worker: {
        // Worker app for drivers AND cleaners. Role picker on first launch.
        name: 'E-Press Pro',
        slug: 'epress-pro',
        scheme: 'epresspro',
        bundleIdentifier: 'com.epress.pro',
        androidPackage: 'com.epress.pro',
        // TODO: replace with dedicated Pro icons once branding ships.
        icon: './assets/icon.png',
        adaptiveIconForeground: './assets/adaptive-icon.png',
    },
};

const v = VARIANTS[VARIANT];

module.exports = ({ config }) => ({
    ...config,
    expo: {
        name: v.name,
        slug: v.slug,
        scheme: v.scheme,
        version: '1.0.0',
        orientation: 'portrait',
        icon: v.icon,
        userInterfaceStyle: 'light',
        newArchEnabled: true,
        splash: {
            image: './assets/splash-icon.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
        },
        ios: {
            supportsTablet: true,
            jsEngine: 'hermes',
            bundleIdentifier: v.bundleIdentifier,
        },
        android: {
            package: v.androidPackage,
            versionCode: 1,
            adaptiveIcon: {
                foregroundImage: v.adaptiveIconForeground,
                backgroundColor: '#ffffff',
            },
            edgeToEdgeEnabled: true,
            usesCleartextTraffic: true,
            permissions: [
                'android.permission.CAMERA',
                'android.permission.ACCESS_FINE_LOCATION',
                'android.permission.ACCESS_COARSE_LOCATION',
                'android.permission.POST_NOTIFICATIONS',
            ],
        },
        web: {
            favicon: './assets/favicon.png',
        },
        plugins: [
            './plugins/withNetworkSecurityConfig.js',
            'expo-asset',
            'expo-font',
            [
                'expo-camera',
                { cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera' },
            ],
            [
                'expo-location',
                {
                    locationWhenInUsePermission: 'E-Press needs your location to add pickup and delivery addresses.',
                    locationAlwaysAndWhenInUsePermission: 'E-Press needs your location for order tracking.',
                },
            ],
            '@react-native-community/datetimepicker',
            [
                'expo-build-properties',
                {
                    android: {
                        minSdkVersion: 24,
                        compileSdkVersion: 36,
                        targetSdkVersion: 36,
                        usesCleartextTraffic: true,
                    },
                    ios: { deploymentTarget: '15.1' },
                },
            ],
        ],
        extra: {
            // Surfaced to runtime via Constants.expoConfig.extra.variant
            variant: VARIANT,
            eas: { projectId: '274a76ab-4f9f-4de4-8a4e-93e1501a9c6c' },
        },
    },
});
