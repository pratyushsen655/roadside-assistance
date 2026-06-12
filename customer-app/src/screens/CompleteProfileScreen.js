import React, { useState, useRef, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { AuthContext, API_URL } from '../context/AuthContext';

const ACCENT = '#B34700';
const BG = '#FFF8F5';

/* ── Emoji-prefixed input row ──────────────────────────────── */
function FieldInput({
  emoji,
  label,
  optional,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  editable = true,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={field.wrapper}>
      <View style={field.labelRow}>
        <Text style={field.label}>{label}</Text>
        {optional && <Text style={field.optional}>Optional</Text>}
      </View>
      <View style={[field.row, focused && field.rowFocused]}>
        <Text style={field.emoji}>{emoji}</Text>
        <TextInput
          ref={inputRef}
          style={field.input}
          placeholder={placeholder}
          placeholderTextColor="#C4A99A"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'words'}
          returnKeyType={returnKeyType || 'next'}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
        />
      </View>
    </View>
  );
}

const field = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#444' },
  optional: {
    fontSize: 11,
    color: '#B0A090',
    backgroundColor: '#F5ECE6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5D5CC',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  rowFocused: {
    borderColor: ACCENT,
    backgroundColor: '#FFF4EE',
  },
  emoji: { fontSize: 18, width: 26, textAlign: 'center' },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
    paddingVertical: 0,
  },
});

/* ════════════════════════════════════════════════════════════
   MAIN SCREEN
════════════════════════════════════════════════════════════ */
export default function CompleteProfileScreen({ navigation }) {
  const { token, updateUser } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  /* refs for tab-order */
  const emailRef = useRef();
  const makeRef = useRef();
  const modelRef = useRef();
  const yearRef = useRef();

  /* ── initials ──────────────────────────────────────────── */
  const initials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  /* ── submit ────────────────────────────────────────────── */
  const handleComplete = async () => {
    if (!name.trim()) {
      setNameError('Full name is required to continue.');
      return;
    }
    setNameError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase() || undefined,
          vehicleMake: vehicleMake.trim() || undefined,
          vehicleModel: vehicleModel.trim() || undefined,
          vehicleYear: vehicleYear.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await updateUser(data.user);
        navigation.replace('Home');
      } else {
        Alert.alert('Could not save profile', data.message || 'Please try again.');
      }
    } catch {
      // Network offline — don't block the user
      navigation.replace('Home');
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Progress dots (step 3 of 3) ──────────────────── */}
        <View style={styles.dotsRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, i === 2 && styles.dotActive]} />
          ))}
        </View>

        {/* ── Header text ──────────────────────────────────── */}
        <Text style={styles.headerTitle}>Almost there! 🎉</Text>
        <Text style={styles.headerSub}>Set up your profile to get started</Text>

        {/* ── Avatar circle ────────────────────────────────── */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          {/* Camera badge overlay */}
          <View style={styles.cameraBadge}>
            <Text style={styles.cameraEmoji}>📷</Text>
          </View>
        </View>

        {/* ── Form card ────────────────────────────────────── */}
        <View style={styles.card}>

          {/* Name */}
          <FieldInput
            emoji="👤"
            label="Full Name"
            placeholder="e.g. Priya Sharma"
            value={name}
            onChangeText={t => { setName(t); setNameError(''); }}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            editable={!loading}
          />
          {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

          {/* Email */}
          <FieldInput
            inputRef={emailRef}
            emoji="📧"
            label="Email Address"
            optional
            placeholder="priya@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => makeRef.current?.focus()}
            editable={!loading}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>🚗  Vehicle Details</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Vehicle Make */}
          <FieldInput
            inputRef={makeRef}
            emoji="🚗"
            label="Vehicle Make"
            optional
            placeholder="e.g. Maruti, Honda"
            value={vehicleMake}
            onChangeText={setVehicleMake}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => modelRef.current?.focus()}
            editable={!loading}
          />

          {/* Vehicle Model */}
          <FieldInput
            inputRef={modelRef}
            emoji="🏷️"
            label="Vehicle Model"
            optional
            placeholder="e.g. Swift, City, i20"
            value={vehicleModel}
            onChangeText={setVehicleModel}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => yearRef.current?.focus()}
            editable={!loading}
          />

          {/* Vehicle Year */}
          <FieldInput
            inputRef={yearRef}
            emoji="📅"
            label="Vehicle Year"
            optional
            placeholder="e.g. 2021"
            value={vehicleYear}
            onChangeText={setVehicleYear}
            keyboardType="number-pad"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleComplete}
            editable={!loading}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDim]}
            onPress={handleComplete}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnTxt}>Complete Setup →</Text>
            )}
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => navigation.replace('Home')}
            disabled={loading}
          >
            <Text style={styles.skipTxt}>Skip for now</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ══════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },

  /* Progress dots */
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5D5CC',
  },
  dotActive: {
    width: 28,
    backgroundColor: ACCENT,
    borderRadius: 5,
  },

  /* Header */
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSub: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },

  /* Avatar */
  avatarWrapper: {
    position: 'relative',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0D9CC',
    borderWidth: 3,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '900',
    color: ACCENT,
    letterSpacing: 1,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: BG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraEmoji: { fontSize: 14 },

  /* Card */
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#B34700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 5,
  },

  /* Field error */
  fieldError: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: -10,
    marginBottom: 12,
    marginLeft: 4,
  },

  /* Divider */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0E6E0' },
  dividerLabel: { fontSize: 13, fontWeight: '700', color: '#B0A090' },

  /* Primary button */
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnDim: { opacity: 0.5 },
  primaryBtnTxt: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Skip */
  skipBtn: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  skipTxt: { fontSize: 14, color: '#B0A090' },
});
