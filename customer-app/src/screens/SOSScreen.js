import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Linking, Alert, Animated, Vibration,
} from 'react-native';

const SOS_NUMBER = '112'; // India emergency / roadside
const API = process.env.EXPO_PUBLIC_API_URL || 'http://10.104.223.76:5000/api';

export default function SOSScreen({ navigation }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [calling, setCalling] = useState(false);

  /* Continuous pulse animation on the SOS button */
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const triggerSOS = async () => {
    Vibration.vibrate([0, 200, 100, 200]);

    /* Notify backend – dispatch push to nearby mechanics */
    try {
      await fetch(`${API}/sos/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // best-effort – still open phone dialer
    }

    const url = `tel:${SOS_NUMBER}`;
    const canCall = await Linking.canOpenURL(url);
    if (canCall) {
      setCalling(true);
      await Linking.openURL(url);
      setCalling(false);
    } else {
      Alert.alert('Error', 'Your device cannot make phone calls.');
    }
  };

  const TIPS = [
    { emoji: '🔆', text: 'Turn on hazard lights' },
    { emoji: '🚧', text: 'Move to road shoulder' },
    { emoji: '🛑', text: 'Place warning triangle' },
    { emoji: '📍', text: 'Share your location' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0E0E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency SOS</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Press the button below to immediately call roadside emergency services and alert nearby mechanics.
        </Text>

        {/* Animated SOS button */}
        <View style={styles.sosWrapper}>
          {/* Outer pulse rings */}
          <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[styles.ring, styles.ring2]} />
          <TouchableOpacity style={styles.sosBtn} onPress={triggerSOS} activeOpacity={0.85}>
            <Text style={styles.sosBtnIcon}>📞</Text>
            <Text style={styles.sosBtnText}>{calling ? 'Calling...' : 'SOS'}</Text>
            <Text style={styles.sosBtnSub}>Hold for emergency</Text>
          </TouchableOpacity>
        </View>

        {/* Safety tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>While you wait</Text>
          <View style={styles.tipsGrid}>
            {TIPS.map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Alternative – call mechanic */}
        <TouchableOpacity
          style={styles.altBtn}
          onPress={() => navigation.navigate('Request')}
        >
          <Text style={styles.altBtnText}>🔧 Book a Mechanic Instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0E0E' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#FF6B00' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FF3B30' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  sosWrapper: { justifyContent: 'center', alignItems: 'center', marginBottom: 40, width: 240, height: 240 },
  ring: {
    position: 'absolute', borderRadius: 120, borderWidth: 2,
  },
  ring3: { width: 230, height: 230, borderColor: 'rgba(255,59,48,0.15)', backgroundColor: 'rgba(255,59,48,0.05)' },
  ring2: { width: 180, height: 180, borderColor: 'rgba(255,59,48,0.25)', backgroundColor: 'rgba(255,59,48,0.08)' },
  sosBtn: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#FF3B30',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 16,
  },
  sosBtnIcon: { fontSize: 32, marginBottom: 4 },
  sosBtnText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  sosBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  tipsCard: {
    width: '100%', backgroundColor: '#1A1A1A',
    borderRadius: 18, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 16 },
  tipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tipItem: { width: '45%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipEmoji: { fontSize: 22 },
  tipText: { fontSize: 13, color: '#aaa', flex: 1, lineHeight: 18 },
  altBtn: {
    width: '100%', backgroundColor: 'transparent',
    borderWidth: 1, borderColor: '#FF6B00', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  altBtnText: { color: '#FF6B00', fontWeight: '700', fontSize: 15 },
});
