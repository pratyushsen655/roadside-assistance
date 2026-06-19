import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';

const RegisterScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);

  // Form States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [city, setCity] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  
  // Document states (simulated uploads)
  const [docs, setDocs] = useState({
    idProof: null,
    drivingLicense: null,
    shopPhoto: null
  });
  const [uploadingDoc, setUploadingDoc] = useState(null);

  // Form checkbox
  const [agree, setAgree] = useState(false);

  // Navigation / Loading / Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown Pickers Modals
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [specModalVisible, setSpecModalVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);

  // OTP Verification States
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune'];
  const specializations = ['Car', 'Bike', 'Heavy Vehicle', 'Electrician', 'Engine Diagnostics', 'Tyre & Puncture Support'];

  // Handle Document Upload simulation
  const handleUploadDoc = (docKey, label) => {
    Alert.alert(
      `Upload ${label}`,
      'Select document source',
      [
        {
          text: 'Camera',
          onPress: () => simulateUpload(docKey)
        },
        {
          text: 'Gallery',
          onPress: () => simulateUpload(docKey)
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const simulateUpload = (docKey) => {
    setUploadingDoc(docKey);
    setTimeout(() => {
      setDocs(prev => ({
        ...prev,
        [docKey]: `https://roadmitra-docs.s3.amazonaws.com/mock_${docKey}_${Date.now()}.jpg`
      }));
      setUploadingDoc(null);
    }, 1500);
  };

  // OTP Handling
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

  // Submit Form - Request OTP
  const handleRegisterPress = async () => {
    setError('');

    // Validation
    if (!fullName.trim()) return setError('Please enter your Full Name.');
    if (phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid 10-digit Phone Number.');
    if (!email.trim() || !email.includes('@')) return setError('Please enter a valid Email Address.');
    if (!shopName.trim()) return setError('Please enter your Shop/Garage Name.');
    if (!city) return setError('Please select your City.');
    if (!specialization) return setError('Please select your Specialization.');
    if (!shopAddress.trim()) return setError('Please enter your Shop Address.');
    if (!docs.idProof) return setError('Please upload your ID Proof.');
    if (!docs.drivingLicense) return setError('Please upload your Driving License.');
    if (!docs.shopPhoto) return setError('Please upload a Shop Photo.');
    if (!agree) return setError('You must agree to the Terms & Conditions and Privacy Policy.');

    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, '');

    try {
      const response = await fetch(`${API_URL}/api/mechanic/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await response.json();
      if (data.success) {
        setOtp(['', '', '', '', '', '']);
        setOtpModalVisible(true);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      console.warn(err);
      setError('Cannot reach server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and Complete Registration Profile
  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setError('');
    const cleanPhone = phone.replace(/\D/g, '');

    try {
      // 1. Verify OTP
      const response = await fetch(`${API_URL}/api/mechanic/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, otp: otpCode }),
      });
      const data = await response.json();

      if (data.success) {
        const token = data.token;
        
        // 2. Update Profile with Shop Details, Name, Email, Specialization, Docs
        const profileUpdateResponse = await fetch(`${API_URL}/api/mechanic/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim(),
            shopName: shopName.trim(),
            shopAddress: shopAddress.trim(),
            city: city,
            vehicleSpecializations: [specialization],
            documents: {
              identityProof: docs.idProof,
              licenseImage: docs.drivingLicense,
              certificationImages: [docs.shopPhoto]
            }
          }),
        });

        const profileData = await profileUpdateResponse.json();
        
        if (profileData.success) {
          setOtpModalVisible(false);
          // Log in the user on the client side
          await login(token, profileData.mechanic);
        } else {
          setError(profileData.message || 'Verification succeeded, but failed to save profile details.');
        }
      } else {
        setError(data.message || 'Incorrect OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
      }
    } catch (err) {
      console.warn(err);
      setError('Cannot reach server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Banner Section */}
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="construct" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Mechanic Registration</Text>
          <View style={styles.headerDivider} />
          <Text style={styles.headerSubtitle}>
            Join our platform and start serving more customers
          </Text>
        </View>

        <View style={styles.card}>
          {/* Section 1: Personal Information */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputWrapper, { marginRight: 10 }]}>
              <Ionicons name="person-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.halfInput}
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={(text) => { setError(''); setFullName(text); }}
              />
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.halfInput}
                placeholder="Phone Number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(text) => { setError(''); setPhone(text); }}
              />
            </View>
          </View>

          <View style={[styles.inputWrapper, { width: '100%' }]}>
            <Ionicons name="mail-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.fullInput}
              placeholder="Email Address"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => { setError(''); setEmail(text); }}
            />
          </View>

          {/* Section 2: Shop Information */}
          <View style={[styles.sectionHeaderRow, { marginTop: 25 }]}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="briefcase" size={16} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Shop Information</Text>
          </View>

          <View style={[styles.inputWrapper, { width: '100%' }]}>
            <Ionicons name="business-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.fullInput}
              placeholder="Shop / Garage Name"
              placeholderTextColor="#94a3b8"
              value={shopName}
              onChangeText={(text) => { setError(''); setShopName(text); }}
            />
          </View>

          <View style={styles.row}>
            <TouchableOpacity 
              style={[styles.inputWrapper, { marginRight: 10, flex: 1 }]}
              onPress={() => setCityModalVisible(true)}
            >
              <Ionicons name="location-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
              <Text style={[styles.selectText, !city && { color: '#94a3b8' }]}>
                {city || 'City'}
              </Text>
              <Ionicons name="chevron-down-outline" size={16} color="#64748b" style={styles.chevronIcon} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.inputWrapper, { flex: 1 }]}
              onPress={() => setSpecModalVisible(true)}
            >
              <Ionicons name="build-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
              <Text style={[styles.selectText, !specialization && { color: '#94a3b8' }]} numberOfLines={1}>
                {specialization || 'Specialization'}
              </Text>
              <Ionicons name="chevron-down-outline" size={16} color="#64748b" style={styles.chevronIcon} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <Ionicons name="map-outline" size={18} color="#94a3b8" style={[styles.inputIcon, { marginTop: 12 }]} />
            <TextInput
              style={styles.textArea}
              placeholder="Shop Address"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={shopAddress}
              onChangeText={(text) => { setError(''); setShopAddress(text); }}
            />
          </View>

          {/* Section 3: Documents */}
          <View style={[styles.sectionHeaderRow, { marginTop: 25 }]}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="document-text" size={16} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Documents</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Upload the required documents to verify your account</Text>

          <View style={styles.docsRow}>
            {/* ID Proof Card */}
            <TouchableOpacity 
              style={styles.docCard} 
              onPress={() => handleUploadDoc('idProof', 'ID Proof')}
              disabled={uploadingDoc === 'idProof'}
            >
              {uploadingDoc === 'idProof' ? (
                <ActivityIndicator color="#1565C0" style={{ marginBottom: 8 }} />
              ) : (
                <Ionicons 
                  name={docs.idProof ? "checkmark-circle" : "card-outline"} 
                  size={26} 
                  color={docs.idProof ? "#22c55e" : "#1565C0"} 
                  style={{ marginBottom: 6 }} 
                />
              )}
              <Text style={styles.docLabel}>ID Proof</Text>
              <Text style={[styles.docUploadLink, docs.idProof && { color: '#22c55e' }]}>
                {docs.idProof ? 'Uploaded' : 'Upload'}
              </Text>
            </TouchableOpacity>

            {/* Driving License Card */}
            <TouchableOpacity 
              style={styles.docCard} 
              onPress={() => handleUploadDoc('drivingLicense', 'Driving License')}
              disabled={uploadingDoc === 'drivingLicense'}
            >
              {uploadingDoc === 'drivingLicense' ? (
                <ActivityIndicator color="#1565C0" style={{ marginBottom: 8 }} />
              ) : (
                <Ionicons 
                  name={docs.drivingLicense ? "checkmark-circle" : "document-text-outline"} 
                  size={26} 
                  color={docs.drivingLicense ? "#22c55e" : "#1565C0"} 
                  style={{ marginBottom: 6 }} 
                />
              )}
              <Text style={styles.docLabel}>Driving License</Text>
              <Text style={[styles.docUploadLink, docs.drivingLicense && { color: '#22c55e' }]}>
                {docs.drivingLicense ? 'Uploaded' : 'Upload'}
              </Text>
            </TouchableOpacity>

            {/* Shop Photo Card */}
            <TouchableOpacity 
              style={styles.docCard} 
              onPress={() => handleUploadDoc('shopPhoto', 'Shop Photo')}
              disabled={uploadingDoc === 'shopPhoto'}
            >
              {uploadingDoc === 'shopPhoto' ? (
                <ActivityIndicator color="#1565C0" style={{ marginBottom: 8 }} />
              ) : (
                <Ionicons 
                  name={docs.shopPhoto ? "checkmark-circle" : "image-outline"} 
                  size={26} 
                  color={docs.shopPhoto ? "#22c55e" : "#1565C0"} 
                  style={{ marginBottom: 6 }} 
                />
              )}
              <Text style={styles.docLabel}>Shop Photo</Text>
              <Text style={[styles.docUploadLink, docs.shopPhoto && { color: '#22c55e' }]}>
                {docs.shopPhoto ? 'Uploaded' : 'Upload'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Agreement Checkbox */}
          <TouchableOpacity 
            style={styles.agreeRow} 
            activeOpacity={0.8} 
            onPress={() => { setError(''); setAgree(!agree); }}
          >
            <Ionicons 
              name={agree ? "checkbox" : "square-outline"} 
              size={20} 
              color={agree ? "#1565C0" : "#64748b"} 
              style={{ marginRight: 8 }}
            />
            <Text style={styles.agreeText}>
              I agree to the <Text style={styles.linkText}>Terms & Conditions</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Register Button */}
          <TouchableOpacity 
            style={[styles.registerButton, loading && styles.disabledButton]} 
            onPress={handleRegisterPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.buttonInner}>
                <Ionicons name="shield-checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.registerButtonText}>Register</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Footer Navigation link */}
          <TouchableOpacity 
            style={styles.footerLinkContainer}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.footerLinkText}>
              Already have an account? <Text style={styles.footerLinkHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* City Modal Picker */}
      <Modal visible={cityModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            {cities.map((c) => (
              <TouchableOpacity
                key={c}
                style={styles.modalOption}
                onPress={() => {
                  setError('');
                  setCity(c);
                  setCityModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, city === c && styles.modalSelectedOptionText]}>{c}</Text>
                {city === c && <Ionicons name="checkmark" size={20} color="#1565C0" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Specialization Modal Picker */}
      <Modal visible={specModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Specialization</Text>
              <TouchableOpacity onPress={() => setSpecModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            {specializations.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.modalOption}
                onPress={() => {
                  setError('');
                  setSpecialization(s);
                  setSpecModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, specialization === s && styles.modalSelectedOptionText]}>{s}</Text>
                {specialization === s && <Ionicons name="checkmark" size={20} color="#1565C0" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContent}>
            <Text style={styles.otpTitle}>Verify Phone Number</Text>
            <Text style={styles.otpSubtitle}>
              Please enter the 6-digit OTP code sent to <Text style={{ fontWeight: 'bold', color: '#1565C0' }}>+91 {phone}</Text>
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

            {error ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 15 }]}>{error}</Text> : null}

            <View style={styles.otpActions}>
              <TouchableOpacity 
                style={[styles.otpCancelButton]} 
                onPress={() => setOtpModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.otpVerifyButton, loading && styles.disabledButton]} 
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.otpVerifyText}>Verify & Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerContainer: {
    backgroundColor: '#1565C0',
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 280,
  },
  headerDivider: {
    width: 40,
    height: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
    marginTop: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 30,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
    marginTop: -8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    flex: 1,
    height: 48,
  },
  textAreaWrapper: {
    height: 90,
    alignItems: 'flex-start',
    width: '100%',
  },
  inputIcon: {
    marginRight: 10,
  },
  chevronIcon: {
    marginLeft: 'auto',
  },
  halfInput: {
    flex: 1,
    color: '#1e293b',
    fontSize: 14,
    height: '100%',
  },
  fullInput: {
    flex: 1,
    color: '#1e293b',
    fontSize: 14,
    height: '100%',
  },
  selectText: {
    flex: 1,
    color: '#1e293b',
    fontSize: 14,
  },
  textArea: {
    flex: 1,
    color: '#1e293b',
    fontSize: 14,
    paddingTop: 10,
    height: '100%',
    textAlignVertical: 'top',
  },
  docsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  docCard: {
    flex: 1,
    aspectRatio: 1.0,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    marginHorizontal: 4,
  },
  docLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 4,
  },
  docUploadLink: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  agreeText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    flexWrap: 'wrap',
  },
  linkText: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginVertical: 10,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#1565C0',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerLinkContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    width: '100%',
  },
  footerLinkText: {
    fontSize: 14,
    color: '#64748b',
  },
  footerLinkHighlight: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#334155',
  },
  modalSelectedOptionText: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  // OTP Modal
  otpModalContent: {
    backgroundColor: '#ffffff',
    width: '100%',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  otpInput: {
    width: 42,
    height: 50,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    color: '#1565C0',
    fontSize: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: '#f8fafc',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  otpCancelButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    marginRight: 10,
  },
  otpCancelText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: 'bold',
  },
  otpVerifyButton: {
    flex: 2,
    height: 48,
    backgroundColor: '#1565C0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  otpVerifyText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
