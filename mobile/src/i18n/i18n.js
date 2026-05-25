import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from './locales/en.json';
import fr from './locales/fr.json';

const LANGUAGE_STORAGE_KEY = '@app_language';

// Respect the user's saved preference; default to French on first launch.
const getInitialLanguage = async () => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'fr') return saved;
  } catch (_) {}
  return 'fr';
};

// Initialize i18n
const initI18n = async () => {
  const initialLanguage = await getInitialLanguage();

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources: {
        en: { translation: en },
        fr: { translation: fr },
      },
      lng: initialLanguage,
      fallbackLng: 'fr',
      interpolation: {
        escapeValue: false, // React already escapes
      },
    });

  return i18n;
};

// Save language preference
export const saveLanguage = async (language) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

export default initI18n;
