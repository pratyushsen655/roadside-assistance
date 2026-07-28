import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { downloadInvoice } from '../utils/downloadInvoice';
import { useBottomNavSafeArea } from '../hooks/useBottomNavSafeArea';

const EarningsScreen = () => {
  const navigation = useNavigation();
  const { mechanicToken } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight || 24);
  const { paddingBottom } = useBottomNavSafeArea();
  const [filterTab, setFilterTab] = useState('Daily');
  
  const [earningsData, setEarningsData] = useState({
    total: 0,
    jobsCompleted: 0,
    baseFare: 0,
    distanceFare: 0,
    tips: 0,
    history: []
  });
  const [loading, setLoading] = useState(false);

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
        setEarningsData(prev => ({
          ...prev,
          total: data.total || 0,
          jobsCompleted: data.jobsCount || 0,
          baseFare: data.baseFare || 0,
          distanceFare: data.distanceFare || 0,
          tips: data.tips || 0,
          history: data.history || []
        }));
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. DEEP INDIGO HEADER WITH SAFE AREA TOP INSET */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => Alert.alert('Calendar', 'Select date range')}>
          <Ionicons name="calendar-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* FILTER TABS */}
      <View style={styles.tabBarContainer}>
        {['Daily', 'Weekly', 'Monthly'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, filterTab === tab && styles.activeTabBtn]}
            onPress={() => setFilterTab(tab)}
          >
            <Text style={[styles.tabBtnText, filterTab === tab && styles.activeTabBtnText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: paddingBottom + 30 }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* DATE SELECTOR BAR */}
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity style={styles.dateArrowBtn}>
            <Ionicons name="chevron-back" size={18} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.dateText}>Today, 20 May 2025</Text>
          <TouchableOpacity style={styles.dateArrowBtn}>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* TOTAL EARNINGS HERO CARD */}
        <View style={styles.heroEarningsCard}>
          <Text style={styles.heroLabel}>Total Earnings</Text>
          <Text style={styles.heroAmount}>₹{earningsData.total.toLocaleString()}</Text>
          <Text style={styles.heroJobsCount}>{earningsData.jobsCompleted} Jobs Completed</Text>

          <View style={styles.heroDivider} />

          <View style={styles.fareBreakdownRow}>
            <View style={styles.fareCol}>
              <Text style={styles.fareLabel}>Base Fare</Text>
              <Text style={styles.fareValue}>₹{earningsData.baseFare.toLocaleString()}</Text>
            </View>

            <View style={styles.fareDivider} />

            <View style={styles.fareCol}>
              <Text style={styles.fareLabel}>Distance Fare</Text>
              <Text style={styles.fareValue}>₹{earningsData.distanceFare.toLocaleString()}</Text>
            </View>

            <View style={styles.fareDivider} />

            <View style={styles.fareCol}>
              <Text style={styles.fareLabel}>Tips</Text>
              <Text style={styles.fareValue}>₹{earningsData.tips}</Text>
            </View>
          </View>
        </View>

        {/* EARNINGS BREAKDOWN SECTION */}
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>

        <View style={styles.breakdownListContainer}>
          {earningsData.history.map((item) => (
            <View key={item.id} style={styles.breakdownItemRow}>
              <View style={[styles.itemIconCircle, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>

              <View style={styles.itemTextCol}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemTime}>{item.time}</Text>
              </View>

              <View style={styles.itemPriceCol}>
                <Text style={styles.itemPriceText}>{item.price}</Text>
                {item.sub && <Text style={styles.itemSubText}>{item.sub}</Text>}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },
  header: {
    backgroundColor: '#362A84',
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F1F5F9',
  },
  activeTabBtn: {
    backgroundColor: '#362A84',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateArrowBtn: {
    padding: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  heroEarningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#362A84',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  heroLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  heroJobsCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  heroDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  fareBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  fareCol: {
    alignItems: 'center',
    flex: 1,
  },
  fareLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  fareValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  fareDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  breakdownListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#362A84',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  itemPriceCol: {
    alignItems: 'flex-end',
  },
  itemPriceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  itemSubText: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
  },
});

export default EarningsScreen;
