import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { AuthContext, API_URL } from '../context/AuthContext';

const { height: SCREEN_H } = Dimensions.get('window');
const ACCENT = '#B34700';
const HERO_H = SCREEN_H * 0.38;

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);

  /* ── shared state ─────────────────────────────────────────── */
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');

  /* ── step-2 state ─────────────────────────────────────── */
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [focusedBox, setFocusedBox] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState(''); // shown when SMS not configured
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  /* ── loading flags ───────────────────────────────────────── */
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  /* ── slide animation (card coming up from bottom) ────────── */
  const cardSlide = useRef(new Animated.Value(0)).current;

  const animateCard = () => {
    cardSlide.setValue(60);
    Animated.spring(cardSlide, {
      toValue: 0,
      tension: 55,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  /* step-2 side effects */
  useEffect(() => {
    if (step === 2) {
      animateCard();
      startCountdown();
      // auto-focus first OTP box after animation
      setTimeout(() => otpRefs.current[0]?.focus(), 400);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  /* ── countdown ──────────────────────────────────────────── */
  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const fmtCountdown = (s) =>
    `0:${String(s).padStart(2, '0')}`;

  /* ── send OTP ───────────────────────────────────────────── */
  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setOtpError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSendLoading(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(2);
        // If backend returned OTP in response (dev fallback when MSG91 not configured)
        // auto-fill the boxes and show a hint
        if (data.otp) {
          const digits91 = String(data.otp).slice(0, 6).split('');
          const filled = [...digits91, ...Array(6).fill('')].slice(0, 6);
          setOtp(filled);
          setDevOtpHint(`Dev mode — OTP: ${data.otp}`);
        } else {
          setOtp(['', '', '', '', '', '']);
          setDevOtpHint('');
        }
      } else {
        setOtpError(data.message || 'Could not send OTP. Please try again.');
      }
    } catch {
      setOtpError('Cannot reach the server. Check your connection.');
    } finally {
      setSendLoading(false);
    }
  };

  /* ── resend OTP ─────────────────────────────────────────── */
  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setDevOtpHint('');
    startCountdown();
    const digits = phone.replace(/\D/g, '');
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (data.otp) {
        const d = String(data.otp).slice(0, 6).split('');
        const filled = [...d, ...Array(6).fill('')].slice(0, 6);
        setOtp(filled);
        setDevOtpHint(`Dev mode — OTP: ${data.otp}`);
      } else {
        setOtp(['', '', '', '', '', '']);
      }
    } catch {
      setOtpError('Could not resend OTP. Check your connection.');
    }
    setTimeout(() => otpRefs.current[0]?.focus(), 300);
  };

  /* ── OTP box handlers ───────────────────────────────────── */
  const handleOtpChange = (text, idx) => {
    const val = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    setOtpError('');
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  /* ── verify OTP ─────────────────────────────────────────── */
  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setOtpError('Please enter all 6 digits of the OTP.');
      return;
    }
    setVerifyLoading(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), otp: code }),
      });
      const data = await res.json();
      if (data.success) {
        await login(data.user, data.token);
        navigation.replace(data.isNewUser ? 'CompleteProfile' : 'Home');
      } else {
        setOtpError(data.message || 'Incorrect OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {
      setOtpError('Cannot reach the server. Try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  /* ── masked phone ───────────────────────────────────────── */
  const maskedPhone = () => {
    const d = phone.replace(/\D/g, '');
    if (d.length < 4) return `+91 ${d}`;
    return `+91 XXXXXX${d.slice(-4)}`;
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={ACCENT} />

      {/* ── Hero background (top ~38%) ──────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🚗</Text>
        </View>
        <Text style={styles.heroTitle}>Roadside Assistance</Text>
        <Text style={styles.heroSub}>Fast help, wherever you are</Text>
      </View>

      {/* ── White card sheet (bottom ~62%) ──────────────────── */}
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: cardSlide }] }]}
        >

          {/* ─── STEP 1 ─────────────────────────────────────── */}
          {step === 1 && (
            <>
              <Text style={styles.sheetTitle}>Enter your mobile number</Text>
              <Text style={styles.sheetSub}>
                {"We'll send a 6-digit OTP to verify your number"}
              </Text>

              {/* Phone row */}
              <View style={[
                styles.phoneRow,
                phone.length > 0 && styles.phoneRowActive,
              ]}>
                {/* Prefix box */}
                <View style={styles.prefixBox}>
                  <Text style={styles.flagText}>🇮🇳</Text>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <View style={styles.phoneInputDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#C4A99A"
                  keyboardType="number-pad"
                  value={phone}
                  onChangeText={t => {
                    setOtpError('');
                    setPhone(t.replace(/\D/g, '').slice(0, 10));
                  }}
                  maxLength={10}
                  autoFocus
                  editable={!sendLoading}
                />
                {phone.length === 10 && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>

              {/* Inline error */}
              {otpError ? (
                <Text style={styles.errorText}>{otpError}</Text>
              ) : null}

              {/* Debug API URL */}
              <Text style={{ fontSize: 11, color: '#C4A99A', textAlign: 'center', marginBottom: 10 }}>
                Server URL: {API_URL}
              </Text>

              {/* Send OTP button */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (sendLoading || phone.length < 10) && styles.primaryBtnDim,
                ]}
                onPress={handleSendOtp}
                disabled={sendLoading || phone.length < 10}
                activeOpacity={0.85}
              >
                {sendLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnTxt}>Send OTP</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                By continuing, you agree to our{' '}
                <Text style={styles.disclaimerLink}>Terms of Service</Text>
              </Text>
            </>
          )}

          {/* ─── STEP 2 ─────────────────────────────────────── */}
          {step === 2 && (
            <>
              {/* Back arrow */}
              <TouchableOpacity
                style={styles.backRow}
                onPress={() => {
                  clearInterval(timerRef.current);
                  setStep(1);
                  setOtp(['', '', '', '', '', '']);
                  setOtpError('');
                }}
              >
                <Text style={styles.backArrow}>←</Text>
                <Text style={styles.backTxt}>Change number</Text>
              </TouchableOpacity>

              <Text style={styles.sheetTitle}>Verify OTP</Text>
              <Text style={styles.sheetSub}>
                Sent to{' '}
                <Text style={styles.accentTxt}>{maskedPhone()}</Text>
              </Text>

              {/* 6 OTP boxes */}
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => (otpRefs.current[i] = r)}
                    style={[
                      styles.otpBox,
                      focusedBox === i && styles.otpBoxFocused,
                      digit && styles.otpBoxFilled,
                      otpError && !digit && styles.otpBoxError,
                    ]}
                    value={digit}
                    onChangeText={t => handleOtpChange(t, i)}
                    onKeyPress={e => handleOtpKey(e, i)}
                    onFocus={() => setFocusedBox(i)}
                    onBlur={() => setFocusedBox(null)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                    editable={!verifyLoading}
                    caretHidden
                  />
                ))}
              </View>

              {/* Dev OTP hint banner (only visible when MSG91 not configured) */}
              {devOtpHint ? (
                <View style={styles.devHintBanner}>
                  <Text style={styles.devHintText}>🔧 {devOtpHint}</Text>
                </View>
              ) : null}

              {/* Error */}
              {otpError ? (
                <Text style={styles.errorText}>{otpError}</Text>
              ) : null}

              {/* Resend timer */}
              <View style={styles.resendRow}>
                {canResend ? (
                  <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                    <Text style={styles.resendActive}>Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendTimer}>
                    Resend OTP in{' '}
                    <Text style={styles.accentTxt}>{fmtCountdown(countdown)}</Text>
                  </Text>
                )}
              </View>

              {/* Verify button */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (verifyLoading || otp.join('').length < 6) && styles.primaryBtnDim,
                ]}
                onPress={handleVerify}
                disabled={verifyLoading || otp.join('').length < 6}
                activeOpacity={0.85}
              >
                {verifyLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnTxt}>Verify &amp; Login</Text>
                )}
              </TouchableOpacity>
            </>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ══════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ACCENT,
  },

  /* ── Hero ───────────────────────────────────────────────── */
  hero: {
    height: HERO_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  logoEmoji: { fontSize: 36 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.2,
  },

  /* ── White card sheet ───────────────────────────────────── */
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    flexGrow: 1,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 48,
    minHeight: SCREEN_H * 0.64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  sheetSub: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginBottom: 28,
  },

  /* ── Phone row ──────────────────────────────────────────── */
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5D5CC',
    borderRadius: 16,
    backgroundColor: '#FFF8F5',
    marginBottom: 6,
    overflow: 'hidden',
  },
  phoneRowActive: {
    borderColor: ACCENT,
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 17,
    backgroundColor: '#FFF0E6',
    gap: 6,
  },
  flagText: { fontSize: 20 },
  prefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  phoneInputDivider: {
    width: 1.5,
    height: '60%',
    backgroundColor: '#E5D5CC',
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 17,
    letterSpacing: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#2CA05A',
    fontWeight: '700',
    paddingRight: 14,
  },

  /* ── Error ──────────────────────────────────────────────── */
  errorText: {
    fontSize: 13,
    color: '#D32F2F',
    marginBottom: 14,
    marginTop: 2,
    lineHeight: 18,
  },

  /* ── Primary button ─────────────────────────────────────── */
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnDim: { opacity: 0.5 },
  primaryBtnTxt: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* ── Disclaimer ─────────────────────────────────────────── */
  disclaimer: {
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 18,
  },
  disclaimerLink: { color: '#B34700', textDecorationLine: 'underline' },

  /* ── Step 2: back ───────────────────────────────────────── */
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  backArrow: { fontSize: 20, color: ACCENT, fontWeight: '700' },
  backTxt: { fontSize: 14, color: ACCENT, fontWeight: '600' },

  /* ── OTP boxes ──────────────────────────────────────────── */
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5D5CC',
    backgroundColor: '#FFF8F5',
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  otpBoxFocused: {
    borderColor: ACCENT,
    borderWidth: 2,
    backgroundColor: '#FFF0E6',
  },
  otpBoxFilled: {
    borderColor: ACCENT,
    backgroundColor: '#FFF0E6',
    color: ACCENT,
  },
  otpBoxError: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF5F5',
  },
  accentTxt: { color: ACCENT, fontWeight: '700' },

  /* ── Resend ─────────────────────────────────────────────── */
  resendRow: {
    alignItems: 'center',
    marginVertical: 18,
  },
  resendTimer: { fontSize: 14, color: '#888' },
  resendActive: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* ── Dev hint banner ────────────────────────────────────── */
  devHintBanner: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFCA2C',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  devHintText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
  },
});
