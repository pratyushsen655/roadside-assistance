import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1a1a2e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a1a2e" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#30304f" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#252542" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#30304f" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f0f1d" }] }
];

export const LIGHT_THEME = {
  mode: 'light',
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  accent: '#E8192C',
  headerBg: '#362A84',
  headerText: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  inputBg: '#F1F5F9',
  badgeBg: '#FEE2E2',
  mapStyle: [],
  statusBarStyle: 'dark',
};

export const DARK_THEME = {
  mode: 'dark',
  background: '#1A1A2E',
  card: '#1E293B',
  cardSecondary: '#27354A',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  border: '#334155',
  accent: '#E8192C',
  headerBg: '#362A84',
  headerText: '#FFFFFF',
  tabBarBg: '#1E293B',
  inputBg: '#27354A',
  badgeBg: '#371B26',
  mapStyle: darkMapStyle,
  statusBarStyle: 'light',
};

const STORAGE_KEY = 'customer_theme_preference';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useRNColorScheme();
  const [themePreference, setThemePreferenceState] = useState('system'); // 'light' | 'dark' | 'system'

  useEffect(() => {
    const loadThemePref = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          setThemePreferenceState(stored);
        }
      } catch (err) {
        console.log('[Customer ThemeContext] Failed to load theme preference:', err.message);
      }
    };
    loadThemePref();
  }, []);

  const setThemePreference = useCallback(async (newPref) => {
    if (!['light', 'dark', 'system'].includes(newPref)) return;
    setThemePreferenceState(newPref);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newPref);
    } catch (err) {
      console.log('[Customer ThemeContext] Error saving theme preference:', err.message);
    }
  }, []);

  const isDark = themePreference === 'dark' || (themePreference === 'system' && systemColorScheme === 'dark');
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{
      theme,
      themePreference,
      setThemePreference,
      isDark,
      systemColorScheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: LIGHT_THEME,
      themePreference: 'light',
      setThemePreference: () => {},
      isDark: false,
      systemColorScheme: 'light'
    };
  }
  return context;
};
