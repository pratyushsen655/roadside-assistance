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
  Alert,
  ScrollView
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen() {
  const { register, requestOTP, verifyOTP } = useContext(AuthContext);

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [step, setStep] = useState(1);       // for login: 1: Phone input, 2: OTP verify

  // Form states
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specCar, setSpecCar] = useState(true);
  const [specBike, setSpecBike] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone) {
      Alert.alert('Missing Fields', 'Please complete all required fields.');
      return;
    }

    const specializations = [];
    if (specCar) specializations.push('car');
    if (specBike) specializations.push('bike');

    if (specializations.length === 0) {
      Alert.alert('Selection Error', 'Select at least one specialization (Car or Bike).');
      return;
    }

    setLoading(true);
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const res = await register(name, email, formattedPhone, specializations);
    setLoading(false);

    if (res.success) {
      Alert.alert('Registration Successful', res.message);
      setMode('login');
      setStep(1);
    } else {
      Alert.alert('Registration Failed', res.message);
    }
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const res = await requestOTP(formattedPhone);
    setLoading(false);

    if (res.success) {
      setStep(2);
    } else {
      Alert.alert('Login Error', res.message);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Invalid Code', 'OTP must be 4 digits.');
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
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.glassCard}>
          <Text style={styles.brandTitle}>PARTNER APP</Text>
          <Text style={styles.brandSubtitle}>Mechanic Roadside Assistance Portal</Text>

          {/* Toggle Tab */}
          {step === 1 && (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, mode === 'login' && styles.tabBtnActive]}
                onPress={() => setMode('login')}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, mode === 'register' && styles.tabBtnActive]}
                onPress={() => setMode('register')}
              >
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Register</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'login' ? (
            // SIGN IN FLOW
            step === 1 ? (
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
                <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Send Login OTP</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formContainer}>
                <Text style={styles.label}>Enter OTP Code</Text>
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
                <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Verify & Proceed</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)} disabled={loading}>
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            // REGISTRATION FLOW
            <View style={styles.formContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="John Doe"
                placeholderTextColor="#666"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />

              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="john@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />

              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Phone Number (10 digits)"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
                editable={!loading}
              />

              <Text style={styles.label}>Vehicle Specialization</Text>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={[styles.checkboxBtn, specCar && styles.checkboxBtnActive]}
                  onPress={() => setSpecCar(!specCar)}
                >
                  <Text style={[styles.checkboxText, specCar && styles.checkboxTextActive]}>Four Wheeler (Car)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.checkboxBtn, specBike && styles.checkboxBtnActive]}
                  onPress={() => setSpecBike(!specBike)}
                >
                  <Text style={[styles.checkboxText, specBike && styles.checkboxTextActive]}>Two Wheeler (Bike)</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Register Partner</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flexGrow: 1,
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
    fontSize: 28,
    fontWeight: '900',
    color: '#ffcc00', // Yellow safety theme for mechanics
    textAlign: 'center',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#ffcc00',
  },
  tabText: {
    color: '#8e8e93',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#000',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    paddingHorizontal: 16,
    height: 52,
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
    height: 52,
    letterSpacing: 10,
    marginBottom: 20,
    fontWeight: '700',
  },
  formInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    paddingHorizontal: 16,
    height: 50,
    color: '#fff',
    fontSize: 15,
    marginBottom: 14,
  },
  checkboxContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  checkboxBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBtnActive: {
    borderColor: '#ffcc00',
    backgroundColor: 'rgba(255, 204, 0, 0.15)',
  },
  checkboxText: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxTextActive: {
    color: '#ffcc00',
  },
  button: {
    backgroundColor: '#ffcc00',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffcc00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
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
