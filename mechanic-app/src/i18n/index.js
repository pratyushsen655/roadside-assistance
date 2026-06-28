// src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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

i18n.use(initReactI18next).init({
  resources,
  lng: 'en', // default; will be updated by LanguageProvider
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
