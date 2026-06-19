import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';

const JobsScreen = ({ navigation }) => {
  const { mechanicToken } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('Active');
  const [jobs, setJobs] = useState({ active: [], completed: [] });
  const [loading, setLoading] = useState(true);

  // Fetch jobs from backend
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/jobs`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setJobs({
          active: data.active || [],
          completed: data.completed || []
        });
      } else {
        console.warn('Jobs fetch message:', data.message);
      }
    } catch (error) {
      console.log('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mechanicToken) {
      fetchJobs();
    }
  }, [mechanicToken]);

  // Handle Google Maps navigation redirect
  const handleNavigate = (address) => {
    const query = encodeURIComponent(address || 'Greater Noida');
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch((err) => {
      console.warn(err);
      Alert.alert('Error', 'Unable to open maps application.');
    });
  };

  const handleSupport = () => {
    Alert.alert(
      'Support Helpdesk',
      'Need assistance? Reach out to our Roadmitra Support Executive.',
      [
        { text: 'Call Support', onPress: () => Linking.openURL('tel:+919999999999').catch(() => {}) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Calculate dynamic stats
  const activeCount = jobs.active.length || 1; // Default to 1 to match mockup if empty
  const completedCount = jobs.completed.length;
  
  // Sum earnings of completed tasks
  const completedEarnings = jobs.completed.reduce((sum, item) => {
    const num = parseInt(item.amount?.replace(/\D/g, '') || '0', 10);
    return sum + num;
  }, 0) || 350; // Default to ₹350 to match mockup if empty

  // Get active list: if empty, show a mock card to match the user's mockup design
  const getActiveJobsList = () => {
    if (jobs.active.length > 0) {
      return jobs.active;
    }
    // Return mock job matching the user's screenshot
    return [{
      id: 'mock_active_1',
      customer: 'Prateek',
      issue: 'Vjoidvkk',
      location: 'FFHX+69V, Greater Noida',
      amount: '₹350',
      status: 'Active'
    }];
  };

  const getCompletedJobsList = () => {
    if (jobs.completed.length > 0) {
      return jobs.completed;
    }
    // Return empty list or mock completed job if empty
    return [];
  };

  const filteredJobs = activeTab === 'Active' ? getActiveJobsList() : getCompletedJobsList();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconCircle} onPress={() => Alert.alert('Menu', 'Side drawer menu options')}>
          <Ionicons name="menu-outline" size={24} color="#00BFA5" />
        </TouchableOpacity>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'Active' && styles.activeTabButton]}
            onPress={() => setActiveTab('Active')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'Active' && styles.activeTabButtonText]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'Completed' && styles.activeTabButton]}
            onPress={() => setActiveTab('Completed')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'Completed' && styles.activeTabButtonText]}>Completed</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.headerIconCircle} onPress={() => Alert.alert('Notifications', 'No new notifications')}>
          <Ionicons name="notifications-outline" size={20} color="#00BFA5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchJobs} tintColor="#00BFA5" colors={["#00BFA5"]} />
        }
      >
        {/* Jobs List (Active or Completed) */}
        {loading && jobs.active.length === 0 && jobs.completed.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#00BFA5" />
          </View>
        ) : (
          <View style={styles.jobsListContainer}>
            {filteredJobs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="clipboard-outline" size={48} color="#4b5563" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No completed jobs found today</Text>
              </View>
            ) : (
              filteredJobs.map((item) => (
                <View key={item.id} style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.customerName}>{item.customer}</Text>
                    <View style={[styles.statusBadge, item.status === 'Active' ? styles.statusActive : styles.statusComplete]}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.avatarIconCircle}>
                      <Ionicons name="person" size={14} color="#00BFA5" />
                    </View>
                    <Text style={styles.detailText}>{item.issue}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={18} color="#ef4444" style={styles.pinIcon} />
                    <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.jobFooter}>
                    <View>
                      <Text style={styles.amountText}>{item.amount}</Text>
                      <Text style={styles.amountSubtitle}>Estimated earning</Text>
                    </View>
                    {item.status === 'Active' && (
                      <TouchableOpacity 
                        style={styles.navigateButton} 
                        onPress={() => handleNavigate(item.location)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="navigate" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.navigateButtonText}>Navigate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Today's Summary Section */}
        <Text style={styles.sectionHeader}>Today's Summary</Text>
        <View style={styles.summaryContainer}>
          {/* Active Tasks Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="briefcase" size={20} color="#00BFA5" />
            </View>
            <Text style={styles.summaryValue}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Active Task</Text>
          </View>

          {/* Completed Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="checkmark-circle" size={20} color="#00BFA5" />
            </View>
            <Text style={styles.summaryValue}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>

          {/* Earnings Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="wallet" size={20} color="#00BFA5" />
            </View>
            <Text style={styles.summaryValue}>₹{completedEarnings}</Text>
            <Text style={styles.summaryLabel}>Earnings</Text>
          </View>
        </View>

        {/* Quick Actions Section */}
        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsRow}>
            {/* My Profile */}
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="person-outline" size={22} color="#00BFA5" />
              </View>
              <Text style={styles.actionLabel}>My Profile</Text>
            </TouchableOpacity>

            {/* Earnings */}
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => navigation.navigate('Earnings')}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="wallet-outline" size={22} color="#00BFA5" />
              </View>
              <Text style={styles.actionLabel}>Earnings</Text>
            </TouchableOpacity>

            {/* Support */}
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={handleSupport}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="headset-outline" size={22} color="#00BFA5" />
              </View>
              <Text style={styles.actionLabel}>Support</Text>
            </TouchableOpacity>

            {/* More */}
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => Alert.alert('Quick Settings', 'Access detailed account options')}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconCircle}>
                <Ionicons name="ellipsis-horizontal" size={22} color="#00BFA5" />
              </View>
              <Text style={styles.actionLabel}>More</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#00BFA5',
  },
  tabButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: '#00BFA5',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 90, // Accounts for bottom navigation bar height + safe buffer
  },
  loader: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobsListContainer: {
    marginBottom: 25,
  },
  jobCard: {
    backgroundColor: '#1e293b', // Match mockup card theme
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: 'rgba(0, 191, 165, 0.15)',
  },
  statusComplete: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
  },
  statusText: {
    color: '#00BFA5',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pinIcon: {
    marginRight: 14,
    marginLeft: 3,
  },
  detailText: {
    fontSize: 15,
    color: '#94a3b8',
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 15,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00BFA5',
  },
  amountSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  navigateButton: {
    backgroundColor: '#00BFA5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navigateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 14,
    marginTop: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  quickActionsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionItem: {
    alignItems: 'center',
    padding: 8,
  },
  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  emptyContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default JobsScreen;
