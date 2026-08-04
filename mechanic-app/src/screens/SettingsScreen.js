import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ScrollView, SafeAreaView, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import API_URL from '../config/api';

const VOLUME_LEVELS = [
  { value: 'high', label: 'High', icon: 'volume-high-outline' },
  { value: 'medium', label: 'Medium', icon: 'volume-medium-outline' },
  { value: 'low', label: 'Low', icon: 'volume-low-outline' },
];

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const DEFAULT_PREFS = {
  soundEnabled: true,
  vibrationEnabled: true,
  alertVolume: 'high',
  theme: 'dark',
  language: 'en',
};

const SettingsScreen = ({ navigation }) => {
  const { mechanicToken } = useContext(AuthContext);
  const { language: currentLang, setLanguage } = useLanguage();
  const { theme, themePreference, setThemePreference, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight || 24);

  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS, language: currentLang, theme: themePreference });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync themePreference to local state
  useEffect(() => {
    setPrefs(prev => ({ ...prev, theme: themePreference }));
  }, [themePreference]);

  // Load preferences from backend, fall back to AsyncStorage
  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      if (mechanicToken) {
        const res = await fetch(`${API_URL}/api/mechanic/profile`, {
          headers: { Authorization: `Bearer ${mechanicToken}` },
        });
        const data = await res.json();
        if (data.success && data.mechanic?.preferences) {
          const backendPrefs = data.mechanic.preferences;
          const merged = { ...DEFAULT_PREFS, ...backendPrefs, language: currentLang, theme: themePreference };
          setPrefs(merged);
          await AsyncStorage.setItem('mechanic_prefs', JSON.stringify(merged));
          setLoading(false);
          return;
        }
      }
      // Fallback: local AsyncStorage
      const stored = await AsyncStorage.getItem('mechanic_prefs');
      if (stored) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored), language: currentLang, theme: themePreference });
      }
    } catch (err) {
      console.log('[Settings] Load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [mechanicToken, currentLang, themePreference]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = async (newPrefs) => {
    setSaving(true);
    try {
      await AsyncStorage.setItem('mechanic_prefs', JSON.stringify(newPrefs));

      if (mechanicToken) {
        await fetch(`${API_URL}/api/mechanic/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mechanicToken}`,
          },
          body: JSON.stringify({ preferences: newPrefs }),
        });
      }
    } catch (err) {
      console.log('[Settings] Save error:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (key, value) => {
    if (key === 'theme') {
      setThemePreference(value);
    }
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    savePreferences(updated);
  };

  const handleLanguageChange = async (code) => {
    await setLanguage(code);
    const updated = { ...prefs, language: code };
    setPrefs(updated);
    savePreferences(updated);
  };

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.headerBg} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 6, backgroundColor: theme.headerBg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ─── LANGUAGE SECTION ─────────────────────────── */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="language-outline" size={20} color="#3B82F6" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Language</Text>
          </View>

          <View style={styles.chipGrid}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const selected = prefs.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langChip,
                    { backgroundColor: isDark ? '#27354A' : '#F8FAFC', borderColor: theme.border },
                    selected && styles.langChipSelected
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.langChipScript, { color: theme.text }, selected && styles.langChipScriptSelected]}>
                    {lang.script}
                  </Text>
                  <Text style={[styles.langChipLabel, { color: theme.textSecondary }, selected && styles.langChipLabelSelected]}>
                    {lang.nativeLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── THEME SECTION ────────────────────────────── */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette-outline" size={20} color="#8B5CF6" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>App Theme</Text>
          </View>

          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const selected = (themePreference || prefs.theme) === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.themeChip,
                    { backgroundColor: isDark ? '#27354A' : '#F8FAFC', borderColor: theme.border },
                    selected && styles.themeChipSelected
                  ]}
                  onPress={() => updatePref('theme', opt.value)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={selected ? '#FFFFFF' : theme.textSecondary}
                    style={{ marginBottom: 4 }}
                  />
                  <Text style={[styles.themeChipLabel, { color: theme.textSecondary }, selected && styles.themeChipLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── SOUND & ALERTS SECTION ───────────────────── */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Sound & Alerts</Text>
          </View>

          {/* Sound Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name={prefs.soundEnabled ? 'volume-high-outline' : 'volume-mute-outline'} size={20} color={theme.text} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Request Alert Sound</Text>
                <Text style={[styles.toggleSubLabel, { color: theme.textSecondary }]}>Play audio for incoming job requests</Text>
              </View>
            </View>
            <Switch
              value={prefs.soundEnabled}
              onValueChange={(val) => updatePref('soundEnabled', val)}
              trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
              thumbColor={prefs.soundEnabled ? '#3B82F6' : '#94A3B8'}
            />
          </View>

          {/* Vibration Toggle */}
          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
            <View style={styles.toggleLeft}>
              <Ionicons name="phone-portrait-outline" size={20} color={theme.text} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Vibration</Text>
                <Text style={[styles.toggleSubLabel, { color: theme.textSecondary }]}>Vibrate on new requests & alerts</Text>
              </View>
            </View>
            <Switch
              value={prefs.vibrationEnabled}
              onValueChange={(val) => updatePref('vibrationEnabled', val)}
              trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
              thumbColor={prefs.vibrationEnabled ? '#3B82F6' : '#94A3B8'}
            />
          </View>

          {/* Volume level — only show when sound is enabled */}
          {prefs.soundEnabled && (
            <View style={{ paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Text style={[styles.subSectionLabel, { color: theme.textSecondary }]}>Alert Volume</Text>
              <View style={styles.volumeRow}>
                {VOLUME_LEVELS.map((vol) => {
                  const selected = prefs.alertVolume === vol.value;
                  return (
                    <TouchableOpacity
                      key={vol.value}
                      style={[
                        styles.volumeChip,
                        { backgroundColor: isDark ? '#27354A' : '#F8FAFC', borderColor: theme.border },
                        selected && styles.volumeChipSelected
                      ]}
                      onPress={() => updatePref('alertVolume', vol.value)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={vol.icon} size={18} color={selected ? '#FFFFFF' : theme.textSecondary} />
                      <Text style={[styles.volumeChipLabel, { color: theme.textSecondary }, selected && styles.volumeChipLabelSelected]}>
                        {vol.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 8 }} />
            <Text style={styles.savingText}>Saving preferences…</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#1B2038',
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  sectionNote: { fontSize: 12, color: '#94A3B8', marginBottom: 14, marginTop: -6 },

  // Language chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '22%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  langChipSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  langChipScript: { fontSize: 18, color: '#475569', fontWeight: '600' },
  langChipScriptSelected: { color: '#1D4ED8' },
  langChipLabel: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  langChipLabelSelected: { color: '#3B82F6' },

  // Theme chips
  themeRow: { flexDirection: 'row', gap: 10 },
  themeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  themeChipSelected: { borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' },
  themeChipLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 2 },
  themeChipLabelSelected: { color: '#FFFFFF', fontWeight: '700' },

  // Toggles
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  toggleSubLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  // Volume chips
  subSectionLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  volumeRow: { flexDirection: 'row', gap: 10 },
  volumeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  volumeChipSelected: { borderColor: '#F59E0B', backgroundColor: '#F59E0B' },
  volumeChipLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  volumeChipLabelSelected: { color: '#FFFFFF', fontWeight: '700' },

  // Saving indicator
  savingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  savingText: { fontSize: 13, color: '#94A3B8' },
});

export default SettingsScreen;
