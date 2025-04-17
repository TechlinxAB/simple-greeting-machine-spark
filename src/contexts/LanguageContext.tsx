
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '@/i18n';
import { updateHtmlLang } from '@/i18n';

type Language = 'en' | 'sv';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Initialize from localStorage or browser language
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && ['en', 'sv'].includes(savedLang)) {
      return savedLang;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'sv' ? 'sv' : 'en';
  });

  const setLanguage = (lang: Language) => {
    if (lang === language) return; // Avoid unnecessary updates if language is the same
    
    console.log(`Setting language to ${lang} in LanguageContext`);
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    i18n.changeLanguage(lang);
    updateHtmlLang(lang);
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'sv' : 'en';
    setLanguage(newLang);
  };

  // Set initial language on mount
  useEffect(() => {
    console.log(`Initial language in context: ${language}`);
    i18n.changeLanguage(language);
    updateHtmlLang(language);
  }, []);

  // Force a language update when the component mounts to ensure consistency with localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && ['en', 'sv'].includes(savedLang) && savedLang !== language) {
      console.log(`Found saved language in localStorage: ${savedLang}, updating context`);
      setLanguageState(savedLang);
      i18n.changeLanguage(savedLang);
      updateHtmlLang(savedLang);
    }
  }, [language]);

  const value = {
    language,
    setLanguage,
    toggleLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
};
