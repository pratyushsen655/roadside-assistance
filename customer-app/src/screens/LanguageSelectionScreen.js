import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

// ─── Sparkle Icon Component ────────────────────────────────────────────────
const Sparkle = ({ style, size = 16 }) => (
  <Text style={[{ fontSize: size, color: '#FFD700' }, style]}>✦</Text>
);

// ─── Radio Button ──────────────────────────────────────────────────────────
const RadioButton = ({ selected }) => (
  <View style={[styles.radio, selected && styles.radioSelected]}>
    {selected && <View style={styles.radioDot} />}
  </View>
);

// ─── Language Card ─────────────────────────────────────────────────────────
const LanguageCard = ({ item, selected, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress(item.code);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '48%' }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={[styles.langCard, selected && styles.langCardSelected]}
        accessibilityLabel={`Select ${item.label}`}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
      >
        <View style={styles.langCardInner}>
          <Text style={[styles.langNativeLabel, selected && styles.langNativeLabelSelected]}>
            {item.nativeLabel}
          </Text>
          {/* Dotted underline */}
          <View style={[styles.dottedLine, selected && styles.dottedLineSelected]} />
        </View>
        <RadioButton selected={selected} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Decorative Bubbles ────────────────────────────────────────────────────
const DecorativeBubbles = () => {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(float1, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(float2, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(float2, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.bubblesContainer}>
      {/* Sparkles */}
      <Sparkle style={styles.sparkle1} size={14} />
      <Sparkle style={styles.sparkle2} size={10} />
      <Sparkle style={styles.sparkle3} size={12} />
      <Sparkle style={styles.sparkle4} size={8} />

      {/* Bubble 1 — English "A" */}
      <Animated.View
        style={[
          styles.bubble,
          styles.bubble1,
          { transform: [{ translateY: float1 }] },
        ]}
      >
        <View style={styles.bubbleTail1} />
        <Text style={styles.bubbleLetter}>A</Text>
        <Text style={styles.bubbleSubLabel}>English</Text>
      </Animated.View>

      {/* Bubble 2 — Devanagari "आ" */}
      <Animated.View
        style={[
          styles.bubble,
          styles.bubble2,
          { transform: [{ translateY: float2 }] },
        ]}
      >
        <View style={styles.bubbleTail2} />
        <Text style={[styles.bubbleLetter, styles.bubbleLetterDevanagari]}>आ</Text>
        <Text style={styles.bubbleSubLabel}>हिन्दी</Text>
      </Animated.View>
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function LanguageSelectionScreen({ navigation, route }) {
  const { setLanguage, language: currentLanguage } = useLanguage();
  const [selectedCode, setSelectedCode] = useState(currentLanguage || null);
  const fromSettings = route?.params?.fromSettings === true;

  const sheetAnim = useRef(new Animated.Value(height * 0.55)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide up the bottom sheet
    Animated.spring(sheetAnim, {
      toValue: 0,
      tension: 60,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pulse the Confirm button when selection changes
  useEffect(() => {
    if (selectedCode) {
      Animated.sequence([
        Animated.timing(btnAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(btnAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [selectedCode]);

  const handleConfirm = async () => {
    if (!selectedCode) return;
    try {
      await setLanguage(selectedCode);
      if (fromSettings) {
        navigation.goBack();
      } else {
        // First-launch: go to Onboarding
        navigation.replace('Onboarding');
      }
    } catch (err) {
      console.error('[LanguageSelection] Error setting language:', err);
      Alert.alert('Error', 'Could not save language. Please try again.');
    }
  };

  const handleHelp = () => {
    Alert.alert(
      'Need Help?',
      'Call us 24/7 at +1-800-555-0199 or email support@rescueme.app',
      [{ text: 'OK' }]
    );
  };

  const isConfirmEnabled = !!selectedCode;

  // Render 2-column grid from SUPPORTED_LANGUAGES
  const rows = [];
  for (let i = 0; i < SUPPORTED_LANGUAGES.length; i += 2) {
    rows.push(SUPPORTED_LANGUAGES.slice(i, i + 2));
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />

      {/* ── Top Gradient Section ── */}
      {/* Pure RN gradient simulation: layered views */}
      <View style={styles.topSection}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0D1B3E' }]} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0A', opacity: 0.45, top: '55%' }]} />

        {/* Help Pill */}
        <TouchableOpacity
          style={styles.helpPill}
          onPress={handleHelp}
          activeOpacity={0.8}
          accessibilityLabel="Help"
        >
          <Ionicons name="headset-outline" size={15} color="#fff" />
          <Text style={styles.helpPillText}>Help</Text>
        </TouchableOpacity>

        {/* Decorative Bubbles */}
        <DecorativeBubbles />
      </View>

      {/* ── Bottom White Sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: sheetAnim }] },
        ]}
      >
        {/* Drag Handle */}
        <View style={styles.sheetHandle} />

        {/* Title */}
        <Text style={styles.sheetTitle}>Select App Language</Text>
        <Text style={styles.sheetSubtitle}>Choose your preferred language to continue</Text>

        {/* Language Grid — Scrollable */}
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((item) => (
                <LanguageCard
                  key={item.code}
                  item={item}
                  selected={selectedCode === item.code}
                  onPress={setSelectedCode}
                />
              ))}
              {/* Fill odd row */}
              {row.length === 1 && <View style={{ width: '48%' }} />}
            </View>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Confirm Button */}
        <View style={styles.confirmContainer}>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              !isConfirmEnabled && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            activeOpacity={isConfirmEnabled ? 0.85 : 1}
            disabled={!isConfirmEnabled}
            accessibilityLabel="Confirm language selection"
            accessibilityState={{ disabled: !isConfirmEnabled }}
          >
            {isConfirmEnabled ? (
              <View style={styles.confirmGradient}>
                <Text style={styles.confirmText}>Confirm</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </View>
            ) : (
              <View style={styles.confirmInner}>
                <Text style={styles.confirmTextDisabled}>Select a language to continue</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const SHEET_TOP = height * 0.42;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // ── Top Section
  topSection: {
    height: SHEET_TOP + 30,
    paddingTop: 52,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpPill: {
    position: 'absolute',
    top: 52,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  helpPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Decorative Bubbles
  bubblesContainer: {
    width: 260,
    height: 160,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  bubble1: {
    backgroundColor: '#FFFFFF',
    left: 10,
    top: 10,
    zIndex: 2,
    width: 110,
    height: 100,
  },
  bubble2: {
    backgroundColor: '#1E3A8A',
    right: 10,
    top: 28,
    zIndex: 1,
    width: 110,
    height: 100,
  },
  bubbleTail1: {
    position: 'absolute',
    bottom: -12,
    left: 18,
    width: 20,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 4,
  },
  bubbleTail2: {
    position: 'absolute',
    bottom: -12,
    right: 18,
    width: 20,
    height: 14,
    backgroundColor: '#1E3A8A',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 10,
  },
  bubbleLetter: {
    fontSize: 38,
    fontWeight: '800',
    color: '#1A2F5E',
    lineHeight: 44,
  },
  bubbleLetterDevanagari: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bubbleSubLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sparkle1: { position: 'absolute', top: 2, left: 55 },
  sparkle2: { position: 'absolute', top: 20, right: 22 },
  sparkle3: { position: 'absolute', bottom: 10, left: 20 },
  sparkle4: { position: 'absolute', bottom: 0, right: 55 },

  // ── Sheet
  sheet: {
    position: 'absolute',
    top: SHEET_TOP,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },

  // ── Grid
  gridScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  gridContent: {
    paddingBottom: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // ── Language Card
  langCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langCardSelected: {
    borderColor: '#E8192C',
    backgroundColor: '#FFF5F5',
    shadowColor: '#E8192C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  langCardInner: {
    flex: 1,
    paddingRight: 8,
  },
  langNativeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  langNativeLabelSelected: {
    color: '#E8192C',
  },
  dottedLine: {
    height: 1.5,
    borderRadius: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  dottedLineSelected: {
    borderColor: '#FCA5A5',
  },

  // ── Radio Button
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: '#E8192C',
    backgroundColor: '#fff',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8192C',
  },

  // ── Confirm Button
  confirmContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  confirmBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 56,
  },
  confirmBtnDisabled: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  confirmGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E8192C',
    borderRadius: 16,
  },
  confirmInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  confirmTextDisabled: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
