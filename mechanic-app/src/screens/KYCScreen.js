import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function KYCScreen({ navigation }) {
  const { mechanic, uploadKYCDocs, refreshProfile } = useContext(AuthContext);

  const [docType, setDocType] = useState('driver_license');
  const [docUrl, setDocUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Poll updates on launch
    refreshProfile();
  }, []);

  const handleUpload = async () => {
    if (!docUrl.trim()) {
      Alert.alert('Details Missing', 'Please enter a valid document file URL.');
      return;
    }

    setLoading(true);
    const res = await uploadKYCDocs(docType, docUrl.trim());
    setLoading(false);

    if (res.success) {
      Alert.alert('Submitted!', 'Verification documents uploaded. Admin will review shortly.');
    } else {
      Alert.alert('Upload Error', res.message);
    }
  };

  const status = mechanic?.kycStatus || 'pending';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KYC Verification Portal</Text>
      </View>

      <View style={styles.content}>
        {status === 'approved' ? (
          // Status: Approved
          <View style={styles.statusBox}>
            <Text style={styles.statusEmoji}>✅</Text>
            <Text style={styles.statusTitle}>Profile Approved!</Text>
            <Text style={styles.statusDesc}>Your credentials have been validated successfully. You are ready to start receiving assistance calls.</Text>
            
            <TouchableOpacity style={styles.dashboardBtn} onPress={() => navigation.navigate('Dashboard')}>
              <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : status === 'pending' && mechanic?.kycStatus ? (
          // Status: Pending
          <View style={styles.statusBox}>
            <Text style={styles.statusEmoji}>⏳</Text>
            <Text style={styles.statusTitle}>Verification Pending</Text>
            <Text style={styles.statusDesc}>Our administration is currently reviewing your uploaded license files. This usually takes less than 24 hours.</Text>
            
            <TouchableOpacity style={styles.refreshBtn} onPress={refreshProfile}>
              <Text style={styles.refreshBtnText}>Check Status Update</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Status: Unsubmitted / Rejected
          <View style={styles.formContainer}>
            {status === 'rejected' && (
              <View style={styles.rejectionBanner}>
                <Text style={styles.rejectionTitle}>Verification Rejected</Text>
                <Text style={styles.rejectionDesc}>Reason: {mechanic?.rejectionReason || 'Uploaded files are unreadable.'}</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Upload Proof of Identity</Text>
            <Text style={styles.sectionDesc}>Please provide credentials verifying your specialization training or license parameters.</Text>

            <Text style={styles.label}>Select Document Type</Text>
            <View style={styles.pickerRow}>
              {['driver_license', 'national_id', 'business_permit'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.pickerBtn, docType === type && styles.pickerBtnActive]}
                  onPress={() => setDocType(type)}
                >
                  <Text style={[styles.pickerBtnText, docType === type && styles.pickerBtnTextActive]}>
                    {type.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Document Image URL</Text>
            <TextInput
              style={styles.textInput}
              placeholder="https://example.com/uploads/license.jpg"
              placeholderTextColor="#666"
              value={docUrl}
              onChangeText={setDocUrl}
            />

            <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.uploadBtnText}>Submit Documents</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1e',
    borderBottomWidth: 1,
    borderColor: '#2c2c2e',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  statusBox: {
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  statusEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  statusDesc: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  dashboardBtn: {
    backgroundColor: '#ffcc00',
    borderRadius: 12,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardBtnText: {
    color: '#000',
    fontWeight: '700',
  },
  refreshBtn: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffcc00',
  },
  refreshBtnText: {
    color: '#ffcc00',
    fontWeight: '700',
  },
  formContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  rejectionBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  rejectionTitle: {
    color: '#ff3b30',
    fontWeight: '700',
    fontSize: 14,
  },
  rejectionDesc: {
    color: '#ff8a80',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#8e8e93',
    lineHeight: 18,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  pickerBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBtnActive: {
    backgroundColor: '#ffcc00',
  },
  pickerBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8e8e93',
  },
  pickerBtnTextActive: {
    color: '#000',
  },
  textInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    paddingHorizontal: 16,
    height: 48,
    color: '#fff',
    fontSize: 14,
    marginBottom: 24,
  },
  uploadBtn: {
    backgroundColor: '#ffcc00',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  }
});
