import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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
  let savedLanguage = 'en';
  try {
    const stored = await AsyncStorage.getItem('appLanguage');
    if (stored && resources[stored]) {
      savedLanguage = stored;
    }
  } catch (e) {
    console.log('[i18n] Could not read saved language:', e);
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      compatibilityJSON: 'v4',
    });
};

initI18n();

// Helper to change language and persist selection
export const changeLanguage = async (lang) => {
  try {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem('appLanguage', lang);
  } catch (e) {
    console.log('[i18n] Failed to change language:', e);
  }
};

export default i18n;
