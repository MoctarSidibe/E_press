# Complete i18n Implementation Guide

## ✅ Completed Infrastructure

1. **Dependencies Installed**: `expo-localization`, `i18next`, `react-i18next`
2. **i18n Configuration**: `src/i18n/i18n.js` - Auto-detects device language, saves preference
3. **Translation Files**: 
   - `src/i18n/locales/en.json` - Complete English translations
   - `src/i18n/locales/fr.json` - Complete French translations
4. **LanguageContext**: `src/context/LanguageContext.js` - Manages language state
5. **LanguageSwitcher Component**: `src/components/LanguageSwitcher.js` - Modal for language selection
6. **App.js Updated**: Initializes i18n and wraps app with LanguageProvider

## ✅ Screens Fully Translated

1. **LoginScreen.js** - ✅ Complete
2. **RegisterScreen.js** - ✅ Complete  
3. **ProfileScreen.js** - ✅ Complete (Customer) + Language switcher added
4. **HomeScreen.js** - ✅ Complete (Customer)

## 🔄 Remaining Screens to Translate

### Customer Screens
- [ ] `OrdersScreen.js` - Partially done (needs completion)
- [ ] `NewOrderScreen.js` - Needs translation
- [ ] `TrackingScreen.js` - Needs translation
- [ ] `CourierMapScreen.js` - Needs translation

### Driver Screens  
- [ ] `DriverDashboardScreen.js`
- [ ] `AvailableOrdersScreen.js`
- [ ] `MyOrdersScreen.js`
- [ ] `DriverOrdersScreen.js`
- [ ] `PickupOrderScreen.js`
- [ ] `DeliveryOrderScreen.js`
- [ ] `QRScannerScreen.js`
- [ ] `DriverProfileScreen.js`

### Cleaner Screens
- [ ] `ReceptionScreen.js`
- [ ] `CleanerReadyScreen.js`
- [ ] `ReadyForDeliveryScreen.js`
- [ ] `CleanerProfileScreen.js`

### Admin Screens
- [ ] `AdminDashboardScreen.js`
- [ ] `AdminOrdersScreen.js`
- [ ] `AdminUsersScreen.js`
- [ ] `AdminProfileScreen.js`

### Navigation Files
- [ ] `CustomerNavigator.js` - Tab labels
- [ ] `DriverNavigator.js` - Tab labels
- [ ] `CleanerNavigator.js` - Tab labels
- [ ] `AdminNavigator.js` - Tab labels
- [ ] `AuthNavigator.js` - Screen titles

### Components
- [ ] `OrderReceipt.js` - Receipt text

## 📝 Translation Pattern

For each screen, follow this pattern:

### 1. Import useTranslation
```javascript
import { useTranslation } from 'react-i18next';
```

### 2. Add hook in component
```javascript
const YourScreen = ({ navigation }) => {
    const { t } = useTranslation();
    // ... rest of component
};
```

### 3. Replace hardcoded strings
```javascript
// Before
<Text>Hello</Text>
<TextInput placeholder="Email" />

// After
<Text>{t('customer.home.greeting')}</Text>
<TextInput placeholder={t('auth.login.email')} />
```

### 4. For Alert messages
```javascript
// Before
Alert.alert('Error', 'Something went wrong');

// After
Alert.alert(t('common.error'), t('errors.generic'));
```

### 5. For status formatting
```javascript
// Before
const formatStatus = (status) => {
    return status.split('_').map(...).join(' ');
};

// After
const formatStatus = (status) => {
    return t(`order.status.${status}`, { 
        defaultValue: status.split('_').map(...).join(' ') 
    });
};
```

## 🎯 Quick Translation Checklist

For each screen file:

- [ ] Add `import { useTranslation } from 'react-i18next';`
- [ ] Add `const { t } = useTranslation();` in component
- [ ] Replace all `<Text>` content with `{t('key')}`
- [ ] Replace all `placeholder` props with `{t('key')}`
- [ ] Replace all `Alert.alert()` messages
- [ ] Replace button labels
- [ ] Replace section titles
- [ ] Replace error messages
- [ ] Test language switching works

## 📚 Translation Keys Reference

All available keys are in `src/i18n/locales/en.json` and `fr.json`. Main sections:

- `common.*` - Common UI elements (loading, error, success, etc.)
- `auth.*` - Login/Register screens
- `customer.*` - Customer screens (home, orders, newOrder, profile, tracking)
- `driver.*` - Driver screens
- `cleaner.*` - Cleaner screens  
- `admin.*` - Admin screens
- `order.*` - Order status and details
- `errors.*` - Error messages
- `language.*` - Language selection

## 🚀 Next Steps

1. Continue translating remaining screens using the pattern above
2. Update navigation files for tab labels
3. Translate OrderReceipt component
4. Test language switching on all screens
5. Build APK and verify translations work

## 💡 Tips

- Use `t('key', { defaultValue: 'fallback' })` for dynamic content
- Use interpolation: `t('greeting', { name: userName })`
- Check `en.json` first to see available keys
- Add new keys to both `en.json` and `fr.json` if needed
- Test with both English and French to ensure all text is translated
