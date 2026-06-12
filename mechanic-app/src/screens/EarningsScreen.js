import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { downloadInvoice } from '../utils/downloadInvoice';

const EarningsScreen = () => {
  const { mechanicToken } = useContext(AuthContext);
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
        Alert.alert('Error', data.message || 'Failed to fetch earnings');
      }
    } catch (error) {
      console.log('Error fetching earnings:', error);
      Alert.alert('Error', 'Failed to reach server. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mechanicToken) {
      fetchEarnings();
    }
  }, [mechanicToken]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00BFA5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Earnings</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total Earnings</Text>
        <Text style={styles.heroAmount}>₹{earningsData.total}</Text>
        <TouchableOpacity style={styles.payoutBtn}>
          <Text style={styles.payoutBtnText}>Request Payout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.breakdownRow}>
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownLabel}>This Week</Text>
          <Text style={styles.breakdownValue}>₹{earningsData.thisWeek}</Text>
        </View>
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownLabel}>This Month</Text>
          <Text style={styles.breakdownValue}>₹{earningsData.thisMonth}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Earnings</Text>

      <View style={styles.listContainer}>
        {earningsData.jobs.length === 0 ? (
          <Text style={styles.emptyText}>No recent earnings yet.</Text>
        ) : (
          earningsData.jobs.map((item) => (
            <View key={item.id} style={styles.earningItem}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.earningJob}>{String(item.job).replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.earningDate}>{item.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.earningAmount}>{item.amount}</Text>
                <TouchableOpacity
                  style={styles.invoiceBtn}
                  onPress={() => downloadInvoice(item.id, mechanicToken)}
                >
                  <Text style={styles.invoiceBtnText}>📄 Invoice</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: '#00BFA5',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLabel: {
    color: '#e0f2f1',
    fontSize: 16,
    marginBottom: 5,
  },
  heroAmount: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  payoutBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  payoutBtnText: {
    color: '#00BFA5',
    fontWeight: 'bold',
    fontSize: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  breakdownCard: {
    backgroundColor: '#252542',
    padding: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  breakdownLabel: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 5,
  },
  breakdownValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  listContainer: {
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 15,
    marginBottom: 40,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a5a',
  },
  earningJob: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  earningDate: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  earningAmount: {
    color: '#00BFA5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#aaaaaa',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  invoiceBtn: {
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00BFA5',
    marginTop: 6,
  },
  invoiceBtnText: {
    color: '#00BFA5',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default EarningsScreen;
