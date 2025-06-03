
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { en } from './locales/en';
import svTranslation from './locales/sv';

// Initialize i18next
i18n
  .use(LanguageDetector) // Detect language from browser
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources: {
      en: {
        translation: en
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

// Helper function to update HTML lang attribute
export const updateHtmlLang = (language: string) => {
  document.documentElement.lang = language;
};

// Apply initial language setting to HTML
const currentLang = i18n.language || localStorage.getItem('language') || 'en';
updateHtmlLang(currentLang);

export default i18n;
