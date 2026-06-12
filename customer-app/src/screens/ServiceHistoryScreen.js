import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { AuthContext, API_URL } from '../context/AuthContext';
import { downloadInvoice } from '../utils/downloadInvoice';

export default function ServiceHistoryScreen({ navigation }) {
  const { token } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('All'); // All, Completed, Pending, Cancelled

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/invoices/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHistory(data.history || []);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch history');
      }
    } catch (error) {
      console.log('Error fetching service history:', error);
      Alert.alert('Error', 'Failed to connect to the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const filteredHistory = history.filter((job) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Completed') return job.status === 'completed';
    if (activeTab === 'Pending') return ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'].includes(job.status);
    if (activeTab === 'Cancelled') return job.status === 'cancelled';
    return true;
  });

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'completed':
        return { bg: '#E8F5E9', text: '#2E7D32', label: 'Completed' };
      case 'cancelled':
        return { bg: '#FFEBEE', text: '#C62828', label: 'Cancelled' };
      case 'pending':
        return { bg: '#E0F7FA', text: '#006064', label: 'Pending' };
      default:
        return { bg: '#FFF3E0', text: '#E65100', label: 'In Progress' };
    }
  };

  const renderJobItem = ({ item }) => {
    const badge = getStatusBadgeStyle(item.status);
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isPaid = item.paymentStatus === 'paid';
    const isCompleted = item.status === 'completed';

    return (
      <View style={styles.jobCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.serviceName}>{String(item.serviceType || 'Breakdown Assist').replace(/_/g, ' ').toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>👨‍🔧 <Text style={{ fontWeight: 'bold' }}>{item.mechanicName}</Text></Text>
          <Text style={styles.detailText}>📅 {dateStr}</Text>
          <Text style={styles.detailText}>🚗 Vehicle: {item.vehicleMake || 'Car'} {item.vehicleModel || ''}</Text>
          <Text style={styles.amountText}>₹{item.amount}</Text>
        </View>

        <View style={styles.actionButtonsContainer}>
          {isCompleted && isPaid && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.invoiceBtn]}
              onPress={() => downloadInvoice(item.id, token)}
            >
              <Text style={styles.invoiceBtnText}>📄 Download Invoice</Text>
            </TouchableOpacity>
          )}

          {isCompleted && !item.isRated && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.rateBtn]}
              onPress={() => navigation.navigate('RateJob', {
                jobId: item.id,
                mechanicName: item.mechanicName
              })}
            >
              <Text style={styles.rateBtnText}>⭐ Rate Service</Text>
            </TouchableOpacity>
          )}

          {isCompleted && item.isRated && (
            <View style={styles.ratedBadge}>
              <Text style={styles.ratedBadgeText}>⭐ Rated</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#B34700" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navBackArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>Service History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {['All', 'Completed', 'Pending', 'Cancelled'].map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, isSelected && styles.tabItemSelected]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredHistory}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#B34700']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No requests found for this category.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  navbar: {
    height: 60,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 1,
  },
  navBackBtn: {
    padding: 8,
  },
  navBackArrow: {
    fontSize: 24,
    color: '#B34700',
    fontWeight: 'bold',
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tabItemSelected: {
    backgroundColor: '#FFF3E0',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextSelected: {
    color: '#B34700',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardDetails: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#B34700',
    marginTop: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceBtn: {
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#00BFA5',
  },
  invoiceBtnText: {
    color: '#00BFA5',
    fontWeight: 'bold',
    fontSize: 13,
  },
  rateBtn: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#B34700',
  },
  rateBtnText: {
    color: '#B34700',
    fontWeight: 'bold',
    fontSize: 13,
  },
  ratedBadge: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ratedBadgeText: {
    color: '#9CA3AF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
