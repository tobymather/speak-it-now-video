import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import strings from '../lib/strings.json';

export type Language = 'en' | 'ro' | 'tr' | 'arab' | 'fr' | 'es' | 'il';

interface LocalizationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

interface LocalizationProviderProps {
  children: ReactNode;
}

// Function to detect browser language and map to supported languages
const detectBrowserLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();
  
  // Map browser language codes to our supported languages
  if (browserLang.startsWith('tr')) return 'tr';
  if (browserLang.startsWith('ar')) return 'arab';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('he') || browserLang.startsWith('iw')) return 'il';
  if (browserLang.startsWith('ro')) return 'ro';
  
  // Default to English for other languages
  return 'en';
};

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Try to get saved language from localStorage first
    const savedLanguage = localStorage.getItem('preferred-language') as Language;
    if (savedLanguage && Object.keys(strings).includes(savedLanguage)) {
      return savedLanguage;
    }
    // Fall back to browser detection
    return detectBrowserLanguage();
  });

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('preferred-language', language);
  }, [language]);

  const toggleLanguage = useCallback(() => {
    const languages: Language[] = ['en', 'ro', 'tr', 'arab', 'fr', 'es', 'il'];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
  }, [language]);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let value: unknown = strings[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback to English if key not found
        value = strings.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = (value as Record<string, unknown>)[fallbackKey];
          } else {
            return key; // Return key if not found in fallback
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  }, [language]);

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}; 