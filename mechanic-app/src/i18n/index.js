// src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './translations/en.json';
import hi from './translations/hi.json';
import mr from './translations/mr.json';
import ml from './translations/ml.json';
import kn from './translations/kn.json';
import te from './translations/te.json';
import bn from './translations/bn.json';
import ta from './translations/ta.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
  ml: { translation: ml },
  kn: { translation: kn },
  te: { translation: te },
  bn: { translation: bn },
  ta: { translation: ta },
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
