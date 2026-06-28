import React, { useState, useContext, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { useTranslation } from 'react-i18next';

const LoginScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef([]);
  const maskedPhone = () => {
    const d = phone.replace(/\D/g, '');
    if (d.length < 4) return `+91 ${d}`;
    return `+91 XXXXXX${d.slice(-4)}`;
  };

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/auth/send-otp`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      clearTimeout(timeout);
      const data = await response.json();
      if (data.success) {
        setStep(2);
        setOtp(['', '', '', '', '', '']);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      clearTimeout(timeout);
      console.warn(err);
      setError('Cannot reach server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/auth/verify-otp`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, otp: otpCode }),
      });
      clearTimeout(timeout);
      const data = await response.json();
      if (data.success) {
        // Log in the user
        await login(data.token, data.mechanic);
      } else {
        setError(data.message || 'Incorrect OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
      }
    } catch (err) {
      clearTimeout(timeout);
      console.warn(err);
      setError('Cannot reach server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const updateOtp = (text, index) => {
    const cleanText = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanText;
    setOtp(newOtp);
    setError('');
    if (cleanText && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKey = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('login_title') || 'Welcome Back'}</Text>
      <Text style={{color:'#00BFA5', fontSize:11, marginBottom: 10}}>API: {API_URL}</Text>
      <Text style={styles.subtitle}>{t('login_subtitle') || 'Login to RoadMitra Mechanic'}</Text>

      {step === 1 ? (
        <View style={styles.inputContainer}>
          <Text style={styles.prefix}>🇮🇳 +91</Text>
          <TextInput
            style={styles.input}
            placeholder={t('login_phone') || 'Phone Number'}
            placeholderTextColor="#aaaaaa"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(text) => {
              setError('');
              setPhone(text);
            }}
            maxLength={10}
          />
        </View>
      ) : (
        <View>
          <Text style={{ color: '#aaaaaa', fontSize: 14, marginBottom: 15 }}>
            {t('login_otp_sent') || 'OTP sent to'} <Text style={{ color: '#00BFA5', fontWeight: 'bold' }}>{maskedPhone()}</Text>
          </Text>
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(r) => (otpRefs.current[index] = r)}
                style={styles.otpInput}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => updateOtp(text, index)}
                onKeyPress={(e) => handleOtpKey(e, index)}
              />
            ))}
          </View>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity 
        style={styles.button} 
        onPress={step === 1 ? handleSendOtp : handleVerifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>
            {step === 1 ? (t('login_send_otp') || 'Send OTP') : (t('login_verify') || 'Verify & Login')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.registerLink}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.registerLinkText}>
          Don't have an account? <Text style={styles.registerLinkHighlight}>Register</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaaaaa',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  prefix: {
    color: '#ffffff',
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    paddingVertical: 15,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    backgroundColor: '#252542',
    borderRadius: 10,
    color: '#00BFA5',
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#e53935',
    fontSize: 14,
    marginBottom: 15,
  },
  devOtpContainer: {
    backgroundColor: '#3a3a5a',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  devOtpText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#00BFA5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 10,
  },
  registerLinkText: {
    fontSize: 14,
    color: '#aaaaaa',
  },
  registerLinkHighlight: {
    color: '#00BFA5',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
