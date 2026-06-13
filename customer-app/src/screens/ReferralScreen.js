import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  RefreshControl, Share, Clipboard, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL}/api` : 'https://roadside-assistance-production-ddaf.up.railway.app/api';

export default function ReferralScreen({ navigation }) {
  const [data, setData] = useState({
    referralCode: '',
    totalReferred: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    referrals: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const getToken = async () => {
    return (await AsyncStorage.getItem('userToken')) || (await AsyncStorage.getItem('token'));
  };

  const fetchReferralData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const res = await fetch(`${API_BASE}/referrals/my-code`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      
      if (res.ok) {
        setData({
          referralCode: json.referralCode || json.code || '',
          totalReferred: json.totalReferred || 0,
          totalEarnings: json.totalEarnings || 0,
          pendingEarnings: json.pendingEarnings || 0,
          paidEarnings: json.paidEarnings || 0,
          referrals: json.referrals || []
        });
      } else {
        Alert.alert('Error', json?.message || 'Failed to fetch referral data');
      }
    } catch (e) {
      console.log('Error fetching referral data:', e);
      Alert.alert('Error', 'Failed to load referral data. Please check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReferralData();
  };

  const copyToClipboard = () => {
    if (!data.referralCode) return;
    Clipboard.setString(data.referralCode);
    Alert.alert('Copied!', 'Referral code copied to clipboard.', [{ text: 'OK' }]);
  };

  const shareCode = async () => {
    if (!data.referralCode) return;
    try {
      await Share.share({
        message: `Use my code ${data.referralCode} on Roadside Assistance app and get your first service discounted!`
      });
    } catch (error) {
      console.log('Error sharing code:', error.message);
    }
  };

  const maskName = (name) => {
    if (!name) return 'Anonymous';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    return name;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#B34700" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Referral Code Box */}
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Your Referral Code</Text>
              <Text style={styles.codeText}>{data.referralCode || 'N/A'}</Text>
              <View style={styles.codeActions}>
                <TouchableOpacity style={styles.copyBtn} onPress={copyToClipboard}>
                  <Text style={styles.copyBtnText}>Copy Code</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
                  <Text style={styles.shareBtnText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Earnings Summary */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{data.totalReferred}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxHighlight]}>
                <Text style={styles.statValueHighlight}>₹{data.totalEarnings}</Text>
                <Text style={styles.statLabelHighlight}>Total Earned</Text>
              </View>
            </View>

            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Pending</Text>
                <Text style={styles.breakdownValue}>₹{data.pendingEarnings}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Paid</Text>
                <Text style={styles.breakdownValue}>₹{data.paidEarnings}</Text>
              </View>
            </View>

            {/* Referred Friends List */}
            <Text style={styles.sectionTitle}>Referred Friends</Text>
            {data.referrals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No referrals yet — start sharing!</Text>
              </View>
            ) : (
              data.referrals.map((ref, index) => (
                <View key={index} style={styles.referralItem}>
                  <View>
                    <Text style={styles.refName}>{maskName(ref.name)}</Text>
                    <Text style={styles.refDate}>Joined: {formatDate(ref.dateJoined || ref.createdAt)}</Text>
                  </View>
                  <Text style={styles.refEarnings}>+₹{ref.earningsEarned || 50}</Text>
                </View>
              ))
            )}

            {/* How it works */}
            <View style={styles.howItWorksCard}>
              <Text style={styles.howItWorksTitle}>How it Works</Text>
              
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}><Text style={styles.stepNumber}>1</Text></View>
                <Text style={styles.stepText}>Share your code</Text>
              </View>
              
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}><Text style={styles.stepNumber}>2</Text></View>
                <Text style={styles.stepText}>Friend signs up</Text>
              </View>
              
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}><Text style={styles.stepNumber}>3</Text></View>
                <Text style={styles.stepText}>You earn ₹50 per referral</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    elevation: 2,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 24, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eee'
  },
  codeLabel: { fontSize: 14, color: '#666', marginBottom: 10 },
  codeText: { fontSize: 32, fontWeight: 'bold', color: '#B34700', letterSpacing: 2, marginBottom: 20 },
  codeActions: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
  copyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#B34700',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10
  },
  copyBtnText: { color: '#B34700', fontWeight: 'bold', fontSize: 16 },
  shareBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#B34700',
    borderRadius: 8,
    alignItems: 'center'
  },
  shareBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
  },
  statBoxHighlight: { backgroundColor: '#FFB300', marginLeft: 10 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 5 },
  statValueHighlight: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  statLabelHighlight: { fontSize: 14, color: '#fff', marginTop: 5 },

  breakdownContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    elevation: 2,
    justifyContent: 'space-around'
  },
  breakdownItem: { alignItems: 'center' },
  breakdownLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  breakdownValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  emptyState: { padding: 20, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 25 },
  emptyText: { fontSize: 16, color: '#666', fontStyle: 'italic' },
  
  referralItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1
  },
  refName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  refDate: { fontSize: 12, color: '#999', marginTop: 4 },
  refEarnings: { fontSize: 16, fontWeight: 'bold', color: '#FFB300' },

  howItWorksCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#B34700'
  },
  howItWorksTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  stepItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFF3E0',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 15
  },
  stepNumber: { color: '#B34700', fontWeight: 'bold', fontSize: 14 },
  stepText: { fontSize: 14, color: '#666', flex: 1 },
});
