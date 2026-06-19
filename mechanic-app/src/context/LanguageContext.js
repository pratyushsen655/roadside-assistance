// src/context/LanguageContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

// Supported languages list (used by LanguageSelectionScreen)
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', script: 'A' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', script: 'अ' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', script: 'अ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', script: 'അ' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', script: 'अ' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', script: 'अ' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', script: 'অ' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', script: 'अ' },
];

// Context default values
export const LanguageContext = createContext({
  language: 'en',
  setLanguage: async () => {},
  languageLoading: true,
  hasSavedLanguage: false,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [languageLoading, setLanguageLoading] = useState(true);
  const [hasSavedLanguage, setHasSavedLanguage] = useState(false);

  // Load persisted language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      let savedExists = false;
      try {
        const saved = await AsyncStorage.getItem('appLanguage');
        if (saved && i18n.languages?.includes(saved)) {
          setLanguageState(saved);
          savedExists = true;
          if (i18n.language !== saved) {
            await i18n.changeLanguage(saved);
          }
        }
      } catch (e) {
        console.log('[LanguageContext] Failed to load language:', e);
      } finally {
        setLanguageLoading(false);
        setHasSavedLanguage(savedExists);
      }
    };
    loadLanguage();
  }, []);

  // Change language and persist
  const setLanguage = async (code) => {
    try {
      await AsyncStorage.setItem('appLanguage', code);
      await i18n.changeLanguage(code);
      setLanguageState(code);
      setHasSavedLanguage(true);
    } catch (e) {
      console.log('[LanguageContext] Failed to set language:', e);
    }
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, languageLoading, hasSavedLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
