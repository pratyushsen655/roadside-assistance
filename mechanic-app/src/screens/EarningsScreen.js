import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { downloadInvoice } from '../utils/downloadInvoice';
import { useBottomNavSafeArea } from '../hooks/useBottomNavSafeArea';

const EarningsScreen = () => {
  const navigation = useNavigation();
  const { mechanicToken } = useContext(AuthContext);
  const { paddingBottom } = useBottomNavSafeArea();
  
  const [earningsData, setEarningsData] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    jobs: []
  });
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/earnings`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setEarningsData({
          total: data.total || 0,
          thisWeek: data.thisWeek || 0,
          thisMonth: data.thisMonth || 0,
          jobs: data.jobs || []
        });
      } else {
        console.warn('Earnings fetch message:', data.message);
      }
    } catch (error) {
      console.log('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mechanicToken) {
      fetchEarnings();
    }
  }, [mechanicToken]);

  const handleRequestPayout = () => {
    if (earningsData.total === 0) {
      Alert.alert('Payout Request', 'You currently do not have any earnings to withdraw.');
      return;
    }
    Alert.alert(
      'Request Payout',
      `Would you like to initiate a payout request for ₹${earningsData.total}?`,
      [
        { text: 'Yes, Request', onPress: () => Alert.alert('Success', 'Payout request submitted successfully. It will process in 2-3 business days.') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <TouchableOpacity style={styles.headerInfoBtn} onPress={() => Alert.alert('Earnings Info', 'Lifetime, weekly, and monthly earnings summaries are calculated from completed and paid breakdown requests.')}>
          <Ionicons name="information-circle-outline" size={24} color="#00BFA5" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom }]} 
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#00BFA5" />
          </View>
        ) : (
          <View>
            {/* 1. TOTAL EARNINGS CARD */}
            <View style={styles.heroCard}>
              {/* Wallet Background Overlay Icon */}
              <View style={styles.heroWalletOverlay}>
                <Ionicons name="wallet" size={130} color="rgba(255, 255, 255, 0.08)" />
              </View>

              <Text style={styles.heroLabel}>Total Earnings</Text>
              <Text style={styles.heroAmount}>₹{earningsData.total}</Text>
              <Text style={styles.heroSub}>Your total lifetime earnings</Text>
              
              <TouchableOpacity 
                style={styles.payoutBtn} 
                onPress={handleRequestPayout}
                activeOpacity={0.8}
              >
                <Text style={styles.payoutBtnText}>Request Payout</Text>
                <Ionicons name="chevron-forward" size={16} color="#00BFA5" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            {/* 2. WEEKLY & MONTHLY BREAKDOWN */}
            <View style={styles.breakdownRow}>
              {/* This Week */}
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeaderRow}>
                  <Text style={styles.breakdownLabel}>This Week</Text>
                  <Ionicons name="calendar-outline" size={18} color="#00BFA5" />
                </View>
                <Text style={styles.breakdownValue}>₹{earningsData.thisWeek}</Text>
              </View>

              {/* This Month */}
              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeaderRow}>
                  <Text style={styles.breakdownLabel}>This Month</Text>
                  <Ionicons name="calendar-outline" size={18} color="#00BFA5" />
                </View>
                <Text style={styles.breakdownValue}>₹{earningsData.thisMonth}</Text>
              </View>
            </View>

            {/* 3. RECENT EARNINGS HEADER */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Earnings</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
                <Text style={styles.viewAllText}>View All {'>'}</Text>
              </TouchableOpacity>
            </View>

            {/* 4. RECENT EARNINGS CONTAINER */}
            <View style={styles.listContainer}>
              {earningsData.jobs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="document-text-outline" size={32} color="#64748b" />
                    <Ionicons name="search" size={16} color="#00BFA5" style={styles.emptySearchSubIcon} />
                  </View>
                  <Text style={styles.emptyTextTitle}>No recent earnings yet</Text>
                  <Text style={styles.emptyTextSub}>Your recent earnings will appear here</Text>
                </View>
              ) : (
                earningsData.jobs.map((item, index) => (
                  <View 
                    key={item.id} 
                    style={[
                      styles.earningItem, 
                      index === earningsData.jobs.length - 1 && { borderBottomWidth: 0 }
                    ]}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.earningJob} numberOfLines={1}>
                        {String(item.job).replace(/_/g, ' ').toUpperCase()}
                      </Text>
                      <Text style={styles.earningDate}>{item.date}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.earningAmount}>{item.amount}</Text>
                      <TouchableOpacity
                        style={styles.invoiceBtn}
                        onPress={() => downloadInvoice(item.id, mechanicToken)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="document-text" size={12} color="#00BFA5" style={{ marginRight: 4 }} />
                        <Text style={styles.invoiceBtnText}>Invoice</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* 5. SECURE & RELIABLE BANNER */}
            <View style={styles.securityBanner}>
              <View style={styles.securityIconCircle}>
                <Ionicons name="shield-checkmark" size={24} color="#00BFA5" />
              </View>
              <View style={styles.securityTextCol}>
                <Text style={styles.securityTitle}>Secure & Reliable</Text>
                <Text style={styles.securitySub}>
                  Your earnings are safe with us. Request payout anytime!
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a', // Sleek dark slate
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerBackBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerInfoBtn: {
    padding: 4,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 90, // Spacing for bottom tab navigator
  },
  loaderContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: '#00BFA5',
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#00BFA5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 20,
  },
  heroWalletOverlay: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    transform: [{ rotate: '-15deg' }],
  },
  heroLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  heroAmount: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    marginBottom: 20,
  },
  payoutBtn: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payoutBtnText: {
    color: '#00BFA5',
    fontWeight: 'bold',
    fontSize: 15,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  breakdownCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 14,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  breakdownValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    color: '#00BFA5',
    fontSize: 13,
    fontWeight: 'bold',
  },
  listContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  earningJob: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  earningDate: {
    color: '#64748b',
    fontSize: 12,
  },
  earningAmount: {
    color: '#00BFA5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 191, 165, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 191, 165, 0.3)',
    marginTop: 6,
  },
  invoiceBtnText: {
    color: '#00BFA5',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Empty State Styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 14,
  },
  emptySearchSubIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  emptyTextTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyTextSub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  // Security Banner
  securityBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  securityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  securityTextCol: {
    flex: 1,
  },
  securityTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  securitySub: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});

export default EarningsScreen;
