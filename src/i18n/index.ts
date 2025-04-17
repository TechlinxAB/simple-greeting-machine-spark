
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en';
import svTranslation from './locales/sv';

// Initialize i18next
i18n
  .use(LanguageDetector) // Detect language from browser
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      sv: {
        translation: svTranslation
      }
    },
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language' // Make sure it uses the same key as our context
    }
  });

export default i18n;
