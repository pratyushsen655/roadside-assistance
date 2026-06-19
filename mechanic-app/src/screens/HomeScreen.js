// src/screens/HomeScreen.js
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Animated, Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getSocket } from '../config/socket';

const RadarScanner = () => {
  const scaleAnim1 = useRef(new Animated.Value(0.2)).current;
  const opacityAnim1 = useRef(new Animated.Value(1)).current;
  const scaleAnim2 = useRef(new Animated.Value(0.2)).current;
  const opacityAnim2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse1 = Animated.loop(
      Animated.parallel([
        Animated.timing(scaleAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        })
      ])
    );

    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.parallel([
          Animated.timing(scaleAnim2, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim2, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          })
        ])
      ])
    );

    pulse1.start();
    pulse2.start();

    return () => {
      pulse1.stop();
      pulse2.stop();
    };
  }, []);

  return (
    <View style={styles.radarContainer}>
      <View style={styles.radarCenter}>
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              transform: [{ scale: scaleAnim1 }],
              opacity: opacityAnim1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              transform: [{ scale: scaleAnim2 }],
              opacity: opacityAnim2,
            },
          ]}
        />
        <View style={styles.sonarCore}>
          <Text style={{ fontSize: 24 }}>📡</Text>
        </View>
      </View>
      <Text style={styles.scanningText}>Scanning for nearby requests...</Text>
      <Text style={styles.scanningSub}>Auto-refreshing live dispatcher</Text>
    </View>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const { mechanic, mechanicToken } = useContext(AuthContext);
  const [isOnline, setIsOnline] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const [unreadCount] = useState(3); // Mock unread notification badge count

  const [stats, setStats] = useState({
    jobsToday: 0,
    earningsToday: 0,
    rating: 5.0,
    totalJobs: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [acceptLoading, setAcceptLoading] = useState({});
  const [requests, setRequests] = useState([]);
  const [toggleLoading, setToggleLoading] = useState(false);

  const computeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good evening';
  };

  useFocusEffect(
    React.useCallback(() => {
      setGreeting(computeGreeting());
    }, [])
  );

  useEffect(() => {
    if (mechanicToken) {
      fetchStats();
      fetchProfileOnlineStatus();

      const unsubscribe = navigation.addListener('focus', () => {
        fetchStats();
        fetchProfileOnlineStatus();
      });

      return unsubscribe;
    }
  }, [mechanicToken, navigation]);

  useEffect(() => {
    let interval;
    let socket;
    if (mechanicToken && isOnline) {
      fetchPendingRequests();
      
      socket = getSocket(mechanicToken);
      if (socket) {
        socket.emit('join:mechanics:room');
        
        socket.on('request:price_updated', (data) => {
          console.log('[Socket] Request price updated in real-time, reloading...', data);
          fetchPendingRequests();
        });

        socket.on('request:price_updated_global', (data) => {
          console.log('[Socket] Global request price updated, reloading...', data);
          fetchPendingRequests();
        });

        socket.on('request_claimed', () => {
          fetchPendingRequests();
        });
      }

      interval = setInterval(() => {
        fetchPendingRequests();
      }, 10000);
    } else {
      setRequests([]);
      if (socket) {
        socket.off('request:price_updated');
        socket.off('request:price_updated_global');
        socket.off('request_claimed');
      }
    }
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('request:price_updated');
        socket.off('request:price_updated_global');
        socket.off('request_claimed');
      }
    };
  }, [isOnline, mechanicToken]);

  const fetchProfileOnlineStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mechanic/profile`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success && data.mechanic) {
        setIsOnline(data.mechanic.isOnline || false);
      }
    } catch (error) {
      console.log('Error fetching online status:', error);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/stats`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats({
          jobsToday: data.jobsToday || 0,
          earningsToday: data.earningsToday || 0,
          rating: data.rating || 5.0,
          totalJobs: data.totalJobs || 0
        });
      }
    } catch (error) {
      console.log('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/requests/pending`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setRequests(data);
      }
    } catch (error) {
      console.log('Error fetching pending requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const toggleStatus = async () => {
    const newStatus = !isOnline;
    setToggleLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({ isOnline: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        setIsOnline(data.isOnline);
      } else {
        Alert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status. Server is unreachable.');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleAcceptRequest = async (id) => {
    setAcceptLoading(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch(`${API_URL}/api/mechanic/requests/${id}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();

      if (data.success) {
        if (!data.jobId) {
          console.error('[ACCEPT_REQUEST_ERROR] Missing jobId in accept response payload:', data);
          Alert.alert('Error', 'Could not start the job — missing job ID.');
          return;
        }

        // Emit Socket event to notify customer
        const socket = getSocket(mechanicToken);
        if (socket) {
          socket.emit('job:accepted', {
            jobId: data.jobId,
            mechanicName: mechanic?.name || 'Mechanic',
            mechanicPhone: mechanic?.phone || '+919999999999'
          });
        }

        // Navigate to OnTheWayScreen
        try {
          navigation.navigate('OnTheWay', { requestId: data.jobId });
        } catch (navErr) {
          console.error('[ACCEPT_REQUEST_ERROR] Navigation navigate crashed:', navErr, { requestId: data.jobId });
          Alert.alert('Error', 'Navigation failed.');
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to accept request');
      }
    } catch (error) {
      console.error('[ACCEPT_REQUEST_ERROR] Failed during accept flow:', error, { id });
      Alert.alert('Error', 'Failed to accept request. Server is unreachable.');
    } finally {
      setAcceptLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/mechanic/requests/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setRequests(prev => prev.filter(r => r._id !== id));
      } else {
        Alert.alert('Error', data.message || 'Failed to reject request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request. Server is unreachable.');
    }
  };

  const renderStars = (rating) => {
    const starCount = Math.round(rating || 5);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= starCount ? "star" : "star-outline"}
          size={10}
          color="#F1C40F"
          style={{ marginRight: 1 }}
        />
      );
    }
    return <View style={styles.starRow}>{stars}</View>;
  };

  return (
    <View style={styles.container}>
      {/* 1. DARK HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => Alert.alert('Menu', 'Side drawer menu clicked.')}>
            <Ionicons name="menu" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationBtn} onPress={() => Alert.alert('Notifications', 'Open notifications screen.')}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.greetingRow}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.mechanicName}>{mechanic?.name || 'Mechanic User'}</Text>
          </View>
          {/* Static Mechanic Illustration Icon on Right */}
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account-wrench" size={48} color="#00BFA5" />
          </View>
        </View>

        {/* Online Status Row */}
        <View style={styles.onlineStatusRow}>
          <View style={styles.statusLabelContainer}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#00BFA5' : '#767577' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
          {toggleLoading ? (
            <ActivityIndicator size="small" color="#00BFA5" />
          ) : (
            <Switch
              trackColor={{ false: '#767577', true: 'rgba(0, 191, 165, 0.3)' }}
              thumbColor={isOnline ? '#00BFA5' : '#f4f3f4'}
              onValueChange={toggleStatus}
              value={isOnline}
            />
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="clipboard" size={20} color="#00BFA5" style={{ marginBottom: 4 }} />
            {statsLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.statValue}>{stats.jobsToday}</Text>
            )}
            <Text style={styles.statLabel}>Jobs Today</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="wallet" size={20} color="#00BFA5" style={{ marginBottom: 4 }} />
            {statsLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.statValue}>₹{stats.earningsToday}</Text>
            )}
            <Text style={styles.statLabel}>Earnings Today</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star" size={20} color="#00BFA5" style={{ marginBottom: 4 }} />
            {statsLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.statValue}>{Number(stats.rating || 5).toFixed(1)}</Text>
            )}
            <Text style={styles.statLabel}>Rating</Text>
            {renderStars(stats.rating)}
          </View>
        </View>
      </View>

      {/* LIGHT BODY */}
      <ScrollView contentContainerStyle={styles.bodyScroll} showsVerticalScrollIndicator={false}>
        {/* 2. PERFORMANCE BANNER CARD */}
        <View style={styles.performanceBanner}>
          <View style={styles.perfLeftIcon}>
            <Ionicons name="ribbon" size={24} color="#27AE60" />
          </View>
          <View style={styles.perfTextContainer}>
            <Text style={styles.perfTitle}>Complete more jobs</Text>
            <Text style={styles.perfSubtitle}>Earn more & improve your rating</Text>
          </View>
          <TouchableOpacity style={styles.perfLinkRow} onPress={() => navigation.navigate('Performance')}>
            <Text style={styles.perfLinkLabel}>View Performance</Text>
            <Ionicons name="chevron-forward" size={14} color="#27AE60" />
          </TouchableOpacity>
        </View>

        {/* 3. INCOMING REQUESTS SECTION */}
        <View style={styles.requestsSectionHeader}>
          <Text style={styles.sectionTitle}>Incoming Requests</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {requestsLoading ? (
          <ActivityIndicator size="large" color="#00BFA5" style={{ marginVertical: 20 }} />
        ) : requests.length === 0 ? (
          isOnline ? (
            <RadarScanner />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="wifi-outline" size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>Go online to receive requests</Text>
            </View>
          )
        ) : (
          requests.slice(0, 3).map(req => {
            const formattedService = req.issueType || req.serviceType || 'Roadside Job';
            const vehicleText = req.vehicleMake || req.vehicleModel || req.vehicleType || 'Vehicle';
            return (
              <View key={req._id} style={styles.requestCard}>
                <View style={styles.reqHeader}>
                  <View style={styles.reqCustomerRow}>
                    <View style={styles.customerAvatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#9CA3AF" />
                    </View>
                    <View style={styles.reqCustomerTextCol}>
                      <Text style={styles.reqCustomerName}>{req.customerName || 'Customer'}</Text>
                      <Text style={styles.reqSub}>{String(vehicleText).toUpperCase()} • {String(formattedService).replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                  <View style={styles.badgeRow}>
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceBadgeText}>₹{req.price || req.amount || 350}</Text>
                    </View>
                    <Text style={styles.distanceBadge}>
                      {req.distanceKm !== undefined ? `${req.distanceKm} km` : req.distance || 'Nearby'}
                    </Text>
                  </View>
                </View>

                {/* Location row */}
                <View style={styles.reqLocRow}>
                  <Ionicons name="location" size={14} color="#E74C3C" style={{ marginRight: 4 }} />
                  <Text style={styles.reqLocText} numberOfLines={1}>
                    {req.location || req.customerAddress || 'Nearby coordinates'}
                  </Text>
                </View>

                {/* Customer Note (if present) */}
                {req.issueDescription ? (
                  <View style={styles.customerNoteContainer}>
                    <Text style={styles.customerNoteText}>"{req.issueDescription}"</Text>
                  </View>
                ) : null}

                {/* Reject/Accept actions */}
                <View style={styles.reqActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleRejectRequest(req._id)}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAcceptRequest(req._id)}
                    disabled={acceptLoading[req._id]}
                  >
                    {acceptLoading[req._id] ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* 4. RATING BANNER */}
        <TouchableOpacity style={styles.ratingBanner} onPress={() => navigation.navigate('Performance')}>
          <View style={styles.trophyIconContainer}>
            <MaterialCommunityIcons name="trophy" size={24} color="#F1C40F" />
          </View>
          <View style={styles.ratingTextContainer}>
            <Text style={styles.ratingBannerTitle}>Maintain a high rating</Text>
            <Text style={styles.ratingBannerSubtitle}>Great service brings more jobs!</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  bodyScroll: { paddingBottom: 30, paddingHorizontal: 16 },
  // 1. HEADER SECTION
  header: {
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  notificationBtn: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#E74C3C',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greetingTextContainer: {},
  greetingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  mechanicName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#252542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  statusLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#232342',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    textAlign: 'center',
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  // 2. PERFORMANCE BANNER
  performanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  perfLeftIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  perfTextContainer: {
    flex: 1,
  },
  perfTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  perfSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  perfLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perfLinkLabel: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: 'bold',
    marginRight: 2,
  },
  // 3. INCOMING REQUESTS
  requestsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  viewAllText: {
    fontSize: 13,
    color: '#00BFA5',
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    paddingVertical: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reqCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reqCustomerTextCol: {},
  reqCustomerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  reqSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  badgeRow: {
    alignItems: 'flex-end',
  },
  priceBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  priceBadgeText: {
    color: '#00BFA5',
    fontSize: 12,
    fontWeight: 'bold',
  },
  distanceBadge: {
    fontSize: 11,
    color: '#27AE60',
    fontWeight: 'bold',
  },
  reqLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reqLocText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  customerNoteContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  customerNoteText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  reqActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#FDECEA',
  },
  rejectBtnText: {
    color: '#E74C3C',
    fontWeight: 'bold',
    fontSize: 14,
  },
  acceptBtn: {
    backgroundColor: '#27AE60',
  },
  acceptBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // RADAR SCANNER
  radarContainer: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radarCenter: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  pulseCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: '#00BFA5',
    backgroundColor: 'rgba(0, 191, 165, 0.04)',
  },
  sonarCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00BFA5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#00BFA5',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 10,
  },
  scanningText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scanningSub: {
    color: '#6B7280',
    fontSize: 11,
  },
  // 4. RATING BANNER
  ratingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  trophyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#252542',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ratingTextContainer: {
    flex: 1,
  },
  ratingBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  ratingBannerSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
