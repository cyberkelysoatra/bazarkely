/**
 * i18n Configuration for BazarKELY
 * 
 * Multi-language support (French, English, Malagasy) using react-i18next.
 * Integrates with existing appStore language state for VoiceInterface and PDF generation.
 * 
 * Language detection order:
 * 1. localStorage (appStore persisted state)
 * 2. Browser navigator language
 * 3. Default to French (fr)
 */

import i18n from 'i18next';
import type { InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import frTranslations from './locales/fr.json';
import enTranslations from './locales/en.json';
import mgTranslations from './locales/mg.json';

/**
 * Get language from appStore persisted state
 * This function reads the language preference from appStore localStorage
 */
function getAppStoreLanguage(): 'fr' | 'en' | 'mg' | undefined {
  try {
    // Check appStore persisted state in localStorage
    const appStoreData = localStorage.getItem('bazarkely-app-store');
    if (appStoreData) {
      const parsed = JSON.parse(appStoreData);
      if (parsed?.state?.language) {
        const lang = parsed.state.language;
        // Map appStore language codes to i18next codes
        if (lang === 'fr' || lang === 'mg' || lang === 'en') {
          return lang;
        }
      }
    }
    
    // Also check preferences store
    const preferencesData = localStorage.getItem('bazarkely-preferences-store');
    if (preferencesData) {
      const parsed = JSON.parse(preferencesData);
      if (parsed?.state?.language) {
        const lang = parsed.state.language;
        if (lang === 'fr' || lang === 'mg' || lang === 'en') {
          return lang;
        }
      }
    }
  } catch (error) {
    console.warn('[i18n] Error reading appStore language:', error);
  }
  return undefined;
}

// Configure i18next
// Use LanguageDetector directly - according to i18next-browser-languagedetector v8 API,
// you can pass either the constructor function or a concrete instance to i18next.use()
i18n
  // Add browser language detector (use directly, no instantiation needed)
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next);

// Initialize i18next with configuration
const initOptions: InitOptions = {
  // Translation resources
  resources: {
    fr: {
      translation: frTranslations
    },
    en: {
      translation: enTranslations
    },
    mg: {
      translation: mgTranslations
    }
  },

  // Default language and fallback
  // Try to get language from appStore first, fallback to 'fr'
  lng: getAppStoreLanguage() || 'fr', // Default language: French or appStore preference
  fallbackLng: 'fr', // Fallback language: French

  // Supported languages
  supportedLngs: ['fr', 'en', 'mg'],

  // Language detection configuration
  detection: {
    // Order of detection methods
    // Note: appStoreLanguageDetector is handled via initial lng value
    // Standard detectors will handle localStorage, navigator, etc.
    order: ['localStorage', 'navigator', 'htmlTag'],
    
    // localStorage key for language (if not using appStore)
    lookupLocalStorage: 'i18nextLng',
    
    // Cache user language in localStorage (disabled to avoid conflicts with appStore)
    caches: []
  },

  // Interpolation configuration
  interpolation: {
    // React already escapes values, so disable i18next escaping
    escapeValue: false
  },

  // React-specific configuration
  react: {
    // Disable Suspense to avoid loading states
    // Better error handling without Suspense boundaries
    useSuspense: false
  },

  // Debug mode (enabled for development)
  debug: true,

  // Return empty string for missing keys (instead of key path)
  returnEmptyString: false,
  
  // Return objects for missing keys (useful for nested translations)
  returnObjects: true,

  // Default namespace
  defaultNS: 'translation',
  ns: ['translation'],

  // Language code normalization
  load: 'languageOnly', // Load 'fr' instead of 'fr-FR'
  
  // Clean code (remove region codes)
  cleanCode: true,

  // Missing key handling
  saveMissing: false, // Don't save missing keys in development
  
  // Key separator for nested translations
  keySeparator: '.',
  
  // Namespace separator
  nsSeparator: ':'
};

i18n.init(initOptions);

// Export i18n instance
export default i18n;

// Export helper function to get current language
export const getCurrentLanguage = (): 'fr' | 'en' | 'mg' => {
  return (i18n.language || 'fr') as 'fr' | 'en' | 'mg';
};

// Export helper function to change language (syncs with appStore if needed)
export const changeLanguage = async (lng: 'fr' | 'en' | 'mg'): Promise<void> => {
  await i18n.changeLanguage(lng);
};

// Type definitions for TypeScript
export type SupportedLanguage = 'fr' | 'en' | 'mg';

// Export type-safe translation function type
export type TranslationFunction = (key: string, options?: any) => string;
