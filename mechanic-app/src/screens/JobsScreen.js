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
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { useTranslation } from 'react-i18next';
import { useBottomNavSafeArea } from '../hooks/useBottomNavSafeArea';
import DrawerMenu from '../components/DrawerMenu';

const JobsScreen = ({ navigation }) => {
  const { mechanicToken, mechanic, pendingRequests, removePendingRequest, logout } = useContext(AuthContext);
  const translationRes = useTranslation();
  const t = translationRes?.t || ((k) => k);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight || 24);
  const { paddingBottom } = useBottomNavSafeArea();
  const [activeTab, setActiveTab] = useState('New');
  const [jobs, setJobs] = useState({ new: [], inProgress: [], completed: [] });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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
          new: data.new || [],
          inProgress: data.active || [],
          completed: data.completed || []
        });
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

  const getTimeAgo = (dateInput) => {
    if (!dateInput) {
      return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) {
      return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const diffSecs = Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / 1000));

    if (diffSecs < 60) {
      return `${timeStr} (${diffSecs}s ago)`;
    }
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) {
      return `${timeStr} (${diffMins}m ago)`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${timeStr} (${diffHours}h ago)`;
    }
    return dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const combinedNewList = React.useMemo(() => {
    const serverList = jobs.new || [];
    const localList = pendingRequests || [];
    const merged = [...localList];
    serverList.forEach(s => {
      const sId = (s._id || s.id || s.requestId)?.toString();
      if (!merged.some(m => (m._id || m.id || m.requestId)?.toString() === sId)) {
        merged.push(s);
      }
    });
    return merged;
  }, [jobs.new, pendingRequests]);

  const newList = combinedNewList;
  const inProgList = jobs.inProgress || [];
  const compList = jobs.completed || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. DEEP INDIGO HEADER WITH SAFE AREA TOP INSET */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <TouchableOpacity style={styles.headerIconCircle} onPress={() => setDrawerVisible(true)}>
          <Ionicons name="menu" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Jobs</Text>

        <TouchableOpacity style={styles.headerIconCircle} onPress={() => Alert.alert('Notifications', 'No new job notifications')}>
          <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* SEGMENTED TAB BAR */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'New' && styles.activeTabPill]}
          onPress={() => setActiveTab('New')}
        >
          <Text style={[styles.tabPillText, activeTab === 'New' && styles.activeTabPillText]}>New</Text>
          <View style={styles.badgeNewCircle}>
            <Text style={styles.badgeNewText}>{newList.length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'InProgress' && styles.activeTabPill]}
          onPress={() => setActiveTab('InProgress')}
        >
          <Text style={[styles.tabPillText, activeTab === 'InProgress' && styles.activeTabPillText]}>In Progress</Text>
          <View style={styles.badgeProgCircle}>
            <Text style={styles.badgeProgText}>{inProgList.length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'Completed' && styles.activeTabPill]}
          onPress={() => setActiveTab('Completed')}
        >
          <Text style={[styles.tabPillText, activeTab === 'Completed' && styles.activeTabPillText]}>Completed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: paddingBottom + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchJobs} tintColor="#362A84" colors={["#362A84"]} />
        }
      >
        {activeTab === 'New' && (
          <View>
            {newList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="clipboard-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No New Jobs</Text>
                <Text style={styles.emptySub}>Turn online on the Home screen to receive new job requests.</Text>
              </View>
            ) : (
              newList.map((job) => (
                <TouchableOpacity
                  key={job._id || job.id}
                  style={styles.jobItemCard}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('IncomingRequest', { requestData: { requestId: job._id || job.id } })}
                >
                  <View style={[styles.jobIconBox, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="construct-outline" size={22} color="#362A84" />
                  </View>

                  <View style={styles.jobContentCol}>
                    <View style={styles.jobRowTop}>
                      <Text style={styles.jobItemTitle}>{job.serviceType || job.issueType || 'Job Request'}</Text>
                      <Text style={styles.jobTimeText}>{getTimeAgo(job.createdAt || job.created_at || job.timestamp || job.time || job.date)}</Text>
                    </View>

                    <View style={styles.jobRowBottom}>
                      <View style={styles.locRow}>
                        <Ionicons name="location-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.locText} numberOfLines={1}>{job.customerAddress || job.location || 'Location provided'}</Text>
                      </View>
                      <Text style={styles.distText}>{job.price ? `₹${job.price}` : ''}</Text>
                    </View>
                  </View>

                  <View style={styles.badgeNewPill}>
                    <Text style={styles.badgeNewPillText}>New</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'InProgress' && (
          <View>
            {inProgList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-sport-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Jobs In Progress</Text>
                <Text style={styles.emptySub}>Accepted job requests will appear here while active.</Text>
              </View>
            ) : (
              inProgList.map((job) => (
                <TouchableOpacity
                  key={job._id || job.id}
                  style={styles.jobItemCard}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('OnTheWay', { requestId: job._id || job.id })}
                >
                  <View style={[styles.jobIconBox, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="car-sport-outline" size={22} color="#362A84" />
                  </View>

                  <View style={styles.jobContentCol}>
                    <View style={styles.jobRowTop}>
                      <Text style={styles.jobItemTitle}>{job.serviceType || job.issueType || 'Active Service'}</Text>
                      <Text style={styles.jobTimeText}>Active</Text>
                    </View>

                    <View style={styles.jobRowBottom}>
                      <View style={styles.locRow}>
                        <Ionicons name="location-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.locText} numberOfLines={1}>{job.customerAddress || job.location || 'Location provided'}</Text>
                      </View>
                      <Text style={styles.distText}>{job.price ? `₹${job.price}` : ''}</Text>
                    </View>
                  </View>

                  <View style={styles.badgeProgPill}>
                    <Text style={styles.badgeProgPillText}>In Progress</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'Completed' && (
          <View>
            {compList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Completed Jobs Yet</Text>
                <Text style={styles.emptySub}>Jobs you successfully finish will be listed here.</Text>
              </View>
            ) : (
              compList.map((job) => (
                <View key={job._id || job.id} style={styles.jobItemCard}>
                  <View style={[styles.jobIconBox, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#059669" />
                  </View>

                  <View style={styles.jobContentCol}>
                    <View style={styles.jobRowTop}>
                      <Text style={styles.jobItemTitle}>{job.serviceType || job.issueType || 'Completed Job'}</Text>
                      <Text style={styles.jobTimeText}>{job.completedAt ? new Date(job.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Done'}</Text>
                    </View>

                    <View style={styles.jobRowBottom}>
                      <View style={styles.locRow}>
                        <Ionicons name="location-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.locText} numberOfLines={1}>{job.customerAddress || job.location || 'Location'}</Text>
                      </View>
                      <Text style={styles.distText}>{job.price ? `₹${job.price}` : ''}</Text>
                    </View>
                  </View>

                  <View style={styles.badgeCompPill}>
                    <Text style={styles.badgeCompPillText}>Completed</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Side Drawer Menu */}
      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        mechanic={mechanic}
        logout={logout}
      />
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  activeTabPill: {
    backgroundColor: '#EEF2FF',
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabPillText: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  badgeNewCircle: {
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  badgeNewText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeProgCircle: {
    backgroundColor: '#4F46E5',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  badgeProgText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
  },
  sectionSubLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 12,
    marginTop: 4,
  },
  jobItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#362A84',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  jobIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  jobContentCol: {
    flex: 1,
    marginRight: 8,
  },
  jobRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  jobTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  jobRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  distText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
  },
  badgeNewPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeNewPillText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeProgPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeProgPillText: {
    color: '#4F46E5',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeCompPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeCompPillText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default JobsScreen;
