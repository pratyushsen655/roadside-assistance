// src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './translations/en.json';

const resources = {
  en: { translation: en },
  hi: { translation: en },
  mr: { translation: en },
  ml: { translation: en },
  kn: { translation: en },
  te: { translation: en },
  bn: { translation: en },
  ta: { translation: en },
};

const initI18n = async () => {
  const saved = await AsyncStorage.getItem('appLanguage');
  const fallback = Localization.locale.split('-')[0];
  const lng = saved && resources[saved] ? saved : resources[fallback] ? fallback : 'en';
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
};

initI18n();

export const changeLanguage = async (lang) => {
  try {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem('appLanguage', lang);
  } catch (e) {
    console.log('[i18n] changeLanguage error:', e);
  }
};

export default i18n;
