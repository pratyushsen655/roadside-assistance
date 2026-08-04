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

export const DARK_THEME = {
  mode: 'dark',
  background: '#1A1A2E',
  card: '#1E293B',
  cardSecondary: '#27354A',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  border: '#334155',
  accent: '#00BFA5',
  headerBg: '#362A84',
  headerText: '#FFFFFF',
  tabBarBg: '#362A84',
  inputBg: '#27354A',
  badgeBg: '#1E293B',
  mapStyle: darkMapStyle,
  statusBarStyle: 'light',
};

export const LIGHT_THEME = {
  mode: 'light',
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  accent: '#00BFA5',
  headerBg: '#362A84',
  headerText: '#FFFFFF',
  tabBarBg: '#362A84',
  inputBg: '#F1F5F9',
  badgeBg: '#EEF2FF',
  mapStyle: [],
  statusBarStyle: 'dark',
};

const STORAGE_KEY = 'mechanic_theme_preference';

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
        } else {
          // Check mechanic_prefs fallback
          const prefs = await AsyncStorage.getItem('mechanic_prefs');
          if (prefs) {
            const parsed = JSON.parse(prefs);
            if (parsed?.theme && ['light', 'dark', 'system'].includes(parsed.theme)) {
              setThemePreferenceState(parsed.theme);
            }
          }
        }
      } catch (err) {
        console.log('[ThemeContext] Failed to load theme preference:', err.message);
      }
    };
    loadThemePref();
  }, []);

  const setThemePreference = useCallback(async (newPref) => {
    if (!['light', 'dark', 'system'].includes(newPref)) return;
    setThemePreferenceState(newPref);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newPref);
      // Sync to mechanic_prefs
      const prefs = await AsyncStorage.getItem('mechanic_prefs');
      const parsed = prefs ? JSON.parse(prefs) : {};
      await AsyncStorage.setItem('mechanic_prefs', JSON.stringify({ ...parsed, theme: newPref }));
    } catch (err) {
      console.log('[ThemeContext] Error saving theme preference:', err.message);
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
    // Return default dark theme fallback if used outside provider
    return {
      theme: DARK_THEME,
      themePreference: 'dark',
      setThemePreference: () => {},
      isDark: true,
      systemColorScheme: 'dark'
    };
  }
  return context;
};
