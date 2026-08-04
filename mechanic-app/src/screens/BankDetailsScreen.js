import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const BankDetailsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android' ? Math.max(insets.top, 24) : insets.top;
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom;

  const { mechanicToken } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);

  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountType, setAccountType] = useState('savings'); // 'savings' or 'current'

  const [errors, setErrors] = useState({});
  const [ifscSuccessMessage, setIfscSuccessMessage] = useState('');

  // Fetch current bank details on mount
  useEffect(() => {
    const fetchBankDetails = async () => {
      if (!mechanicToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/mechanic/bank-details?edit=true`, {
          headers: {
            Authorization: `Bearer ${mechanicToken}`
          }
        });
        const data = await response.json();

        if (data.success && data.bankDetails) {
          const bd = data.bankDetails;
          setAccountHolderName(bd.accountHolderName || '');
          const accNo = bd.rawAccountNumber || bd.accountNumber || '';
          setAccountNumber(accNo);
          setConfirmAccountNumber(accNo);
          setIfscCode(bd.ifscCode || '');
          setBankName(bd.bankName || '');
          setBranchName(bd.branchName || '');
          setAccountType(bd.accountType || 'savings');
        }
      } catch (err) {
        console.error('[BankDetailsScreen] Error fetching bank details:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBankDetails();
  }, [mechanicToken]);

  // Handle IFSC Code change & auto-lookup
  const handleIfscChange = (text) => {
    const uppercaseText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setIfscCode(uppercaseText);
    setIfscSuccessMessage('');
    setErrors((prev) => ({ ...prev, ifscCode: '' }));

    if (uppercaseText.length === 11) {
      if (IFSC_REGEX.test(uppercaseText)) {
        lookupIfsc(uppercaseText);
      } else {
        setErrors((prev) => ({ ...prev, ifscCode: 'Invalid IFSC format. Example: SBIN0001234' }));
      }
    }
  };

  const lookupIfsc = async (code) => {
    setIfscLoading(true);
    setIfscSuccessMessage('');
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (response.ok) {
        const data = await response.json();
        if (data.BANK) setBankName(data.BANK);
        if (data.BRANCH) setBranchName(data.BRANCH);
        setIfscSuccessMessage(`Verified: ${data.BANK} (${data.BRANCH || 'Branch'})`);
        setErrors((prev) => ({ ...prev, ifscCode: '' }));
      } else {
        setIfscSuccessMessage('');
        setErrors((prev) => ({ ...prev, ifscCode: 'IFSC Code not found in bank database.' }));
      }
    } catch (err) {
      console.warn('[BankDetailsScreen] IFSC Lookup failed:', err.message);
    } finally {
      setIfscLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account Holder Name is required.';
    }

    const cleanAccNo = accountNumber.trim();
    if (!cleanAccNo) {
      newErrors.accountNumber = 'Account Number is required.';
    } else if (!/^\d{9,18}$/.test(cleanAccNo)) {
      newErrors.accountNumber = 'Account Number must be between 9 and 18 digits.';
    }

    if (cleanAccNo !== confirmAccountNumber.trim()) {
      newErrors.confirmAccountNumber = 'Account numbers do not match.';
    }

    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (!cleanIfsc) {
      newErrors.ifscCode = 'IFSC Code is required.';
    } else if (!IFSC_REGEX.test(cleanIfsc)) {
      newErrors.ifscCode = 'Invalid IFSC format. 5th character must be 0 (e.g. SBIN0001234).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/bank-details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          bankName: bankName.trim(),
          branchName: branchName.trim(),
          accountType: accountType
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', 'Bank payout details saved successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to save bank details.');
      }
    } catch (err) {
      console.error('[BankDetailsScreen] Error saving bank details:', err.message);
      Alert.alert('Error', 'Unable to reach server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#362A84" />
        <Text style={styles.loadingText}>Loading bank details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. DEEP INDIGO HEADER */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Payout Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 30 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* NOTICE BANNER */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#362A84" style={{ marginRight: 10 }} />
            <Text style={styles.infoBannerText}>
              Enter your bank account details for direct payout transfers. Your information is securely encrypted.
            </Text>
          </View>

          {/* ACCOUNT HOLDER NAME */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Account Holder Name *</Text>
            <TextInput
              style={[styles.input, errors.accountHolderName && styles.inputError]}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#94A3B8"
              value={accountHolderName}
              onChangeText={(text) => {
                setAccountHolderName(text);
                setErrors((prev) => ({ ...prev, accountHolderName: '' }));
              }}
            />
            {errors.accountHolderName ? (
              <Text style={styles.errorText}>{errors.accountHolderName}</Text>
            ) : null}
          </View>

          {/* IFSC CODE WITH AUTO-LOOKUP */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>IFSC Code *</Text>
            <View style={styles.ifscInputWrapper}>
              <TextInput
                style={[styles.input, { flex: 1, textTransform: 'uppercase' }, errors.ifscCode && styles.inputError]}
                placeholder="e.g. SBIN0001234"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                maxLength={11}
                value={ifscCode}
                onChangeText={handleIfscChange}
              />
              {ifscLoading && (
                <ActivityIndicator size="small" color="#362A84" style={styles.ifscLoader} />
              )}
            </View>
            {errors.ifscCode ? <Text style={styles.errorText}>{errors.ifscCode}</Text> : null}
            {ifscSuccessMessage ? <Text style={styles.successText}>{ifscSuccessMessage}</Text> : null}
          </View>

          {/* BANK NAME (AUTO-FILLED OR MANUAL) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. State Bank of India"
              placeholderTextColor="#94A3B8"
              value={bankName}
              onChangeText={setBankName}
            />
          </View>

          {/* BRANCH NAME (AUTO-FILLED OR MANUAL) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Branch Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cyber City Branch"
              placeholderTextColor="#94A3B8"
              value={branchName}
              onChangeText={setBranchName}
            />
          </View>

          {/* ACCOUNT NUMBER */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Account Number *</Text>
            <TextInput
              style={[styles.input, errors.accountNumber && styles.inputError]}
              placeholder="Enter 9–18 digit account number"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              secureTextEntry
              value={accountNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                setAccountNumber(cleaned);
                setErrors((prev) => ({ ...prev, accountNumber: '' }));
              }}
            />
            {errors.accountNumber ? <Text style={styles.errorText}>{errors.accountNumber}</Text> : null}
          </View>

          {/* CONFIRM ACCOUNT NUMBER */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm Account Number *</Text>
            <TextInput
              style={[styles.input, errors.confirmAccountNumber && styles.inputError]}
              placeholder="Re-enter account number"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={confirmAccountNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '');
                setConfirmAccountNumber(cleaned);
                setErrors((prev) => ({ ...prev, confirmAccountNumber: '' }));
              }}
            />
            {errors.confirmAccountNumber ? (
              <Text style={styles.errorText}>{errors.confirmAccountNumber}</Text>
            ) : null}
          </View>

          {/* ACCOUNT TYPE */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Account Type *</Text>
            <View style={styles.accountTypeRow}>
              <TouchableOpacity
                style={[
                  styles.accountTypeCard,
                  accountType === 'savings' && styles.accountTypeCardActive
                ]}
                onPress={() => setAccountType('savings')}
              >
                <Ionicons
                  name={accountType === 'savings' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={accountType === 'savings' ? '#362A84' : '#94A3B8'}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.accountTypeLabel,
                    accountType === 'savings' && styles.accountTypeLabelActive
                  ]}
                >
                  Savings Account
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.accountTypeCard,
                  accountType === 'current' && styles.accountTypeCardActive
                ]}
                onPress={() => setAccountType('current')}
              >
                <Ionicons
                  name={accountType === 'current' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={accountType === 'current' ? '#362A84' : '#94A3B8'}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.accountTypeLabel,
                    accountType === 'current' && styles.accountTypeLabelActive
                  ]}
                >
                  Current Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Bank Details</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F5FB',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  header: {
    backgroundColor: '#362A84',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoBannerText: {
    flex: 1,
    color: '#362A84',
    fontSize: 13,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  ifscInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  ifscLoader: {
    position: 'absolute',
    right: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  successText: {
    color: '#16A34A',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  accountTypeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  accountTypeCardActive: {
    borderColor: '#362A84',
    backgroundColor: '#EEF2FF',
  },
  accountTypeLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  accountTypeLabelActive: {
    color: '#362A84',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#362A84',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#362A84',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BankDetailsScreen;
