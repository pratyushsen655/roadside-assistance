import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';

const JobsScreen = () => {
  const { mechanicToken } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('Active');
  const [jobs, setJobs] = useState({ active: [], completed: [] });
  const [loading, setLoading] = useState(true);

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
        Alert.alert('Error', data.message || 'Failed to fetch jobs');
      }
    } catch (error) {
      console.log('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to reach server. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mechanicToken) {
      fetchJobs();
    }
  }, [mechanicToken]);

  const renderJob = ({ item }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.customerName}>{item.customer}</Text>
        <View style={[styles.statusBadge, item.status === 'Active' ? styles.statusActive : styles.statusComplete]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.issueText}>{item.issue}</Text>
      <Text style={styles.locationText}>📍 {item.location}</Text>
      <View style={styles.jobFooter}>
        <Text style={styles.amountText}>{item.amount}</Text>
        {item.status === 'Active' && (
          <TouchableOpacity style={styles.navBtn}>
            <Text style={styles.navBtnText}>Navigate</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const filteredJobs = activeTab === 'Active' ? jobs.active : jobs.completed;

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Active' && styles.activeTab]}
          onPress={() => setActiveTab('Active')}
        >
          <Text style={[styles.tabText, activeTab === 'Active' && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Completed' && styles.activeTab]}
          onPress={() => setActiveTab('Completed')}
        >
          <Text style={[styles.tabText, activeTab === 'Completed' && styles.activeTabText]}>Completed</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#00BFA5" />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={fetchJobs}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No jobs yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#252542',
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00BFA5',
  },
  tabText: {
    color: '#aaaaaa',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#00BFA5',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  jobCard: {
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(0, 191, 165, 0.2)',
  },
  statusComplete: {
    backgroundColor: 'rgba(170, 170, 170, 0.2)',
  },
  statusText: {
    color: '#00BFA5',
    fontSize: 12,
    fontWeight: 'bold',
  },
  issueText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 5,
  },
  locationText: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 15,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#3a3a5a',
    paddingTop: 15,
  },
  amountText: {
    color: '#00BFA5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  navBtn: {
    backgroundColor: '#00BFA5',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#aaaaaa',
    fontSize: 16,
  },
});

export default JobsScreen;
