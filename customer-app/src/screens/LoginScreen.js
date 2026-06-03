import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen() {
  const { requestOTP, verifyOTP } = useContext(AuthContext);
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    // Standard phone formatting for local region
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; // Fallback to Indian prefix for demonstration
    const res = await requestOTP(formattedPhone);
    setLoading(false);

    if (res.success) {
      setStep(2);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit code sent to your phone.');
      return;
    }
    setLoading(true);
    const res = await verifyOTP(otp);
    setLoading(false);

    if (!res.success) {
      Alert.alert('Verification Failed', res.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.glassCard}>
        <Text style={styles.brandTitle}>RESCUE ME</Text>
        <Text style={styles.brandSubtitle}>24/7 Roadside Assistance & Breakdown Support</Text>

        {step === 1 ? (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Enter Mobile Number</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="98765 43210"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
                editable={!loading}
              />
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Get OTP Code</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Verify OTP Code</Text>
            <Text style={styles.infoText}>Enter the 4-digit verification code sent to your phone.</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="0 0 0 0"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={4}
              textAlign="center"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(1)}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>Change Phone Number</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ff9500', // Energetic rescue orange
    textAlign: 'center',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
  },
  phonePrefix: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: '100%',
  },
  otpInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    fontSize: 24,
    height: 56,
    letterSpacing: 10,
    marginBottom: 20,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#ff9500',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 16,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#8e8e93',
    fontSize: 14,
  }
});
