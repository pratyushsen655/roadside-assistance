// src/screens/HomeScreen.js
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Animated, Image, Modal, Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getSocket } from '../config/socket';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';

const { width } = Dimensions.get('window');

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1a1a2e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a1a2e" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#30304f" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#252542" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#30304f" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f0f1d" }] }
];

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
  const isMounted = useRef(true);
  const acceptInProgress = useRef({});
  const [mechanicCoords, setMechanicCoords] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
      if (isMounted.current) {
        setGreeting(computeGreeting());
      }
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
      if (isMounted.current) {
        setRequests([]);
      }
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
        if (isMounted.current) {
          setIsOnline(data.mechanic.isOnline || false);
        }
      }
    } catch (error) {
      console.log('Error fetching online status:', error);
    }
  };

  const fetchStats = async () => {
    if (isMounted.current) {
      setStatsLoading(true);
    }
    try {
      const response = await fetch(`${API_URL}/api/mechanic/stats`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        if (isMounted.current) {
          setStats({
            jobsToday: data.jobsToday || 0,
            earningsToday: data.earningsToday || 0,
            rating: data.rating || 5.0,
            totalJobs: data.totalJobs || 0
          });
        }
      }
    } catch (error) {
      console.log('Error fetching stats:', error);
    } finally {
      if (isMounted.current) {
        setStatsLoading(false);
      }
    }
  };

  const fetchPendingRequests = async () => {
    if (isMounted.current) {
      setRequestsLoading(true);
    }
    try {
      const response = await fetch(`${API_URL}/api/mechanic/requests/pending`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        if (isMounted.current) {
          setRequests(data);
        }
      }
    } catch (error) {
      console.log('Error fetching pending requests:', error);
    } finally {
      if (isMounted.current) {
        setRequestsLoading(false);
      }
    }
  };

  const toggleStatus = async () => {
    const newStatus = !isOnline;
    if (isMounted.current) {
      setToggleLoading(true);
    }
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
        if (isMounted.current) {
          setIsOnline(data.isOnline);
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status. Server is unreachable.');
    } finally {
      if (isMounted.current) {
        setToggleLoading(false);
      }
    }
  };

  const updateBackendLocation = async (coords) => {
    try {
      await fetch(`${API_URL}/api/mechanic/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude
        })
      });
      console.log('[Location] Location synced with backend:', coords);
    } catch (err) {
      console.log('[Location] Failed to sync location with backend:', err.message);
    }
  };

  // Watch location continuously when online
  useEffect(() => {
    let subscriber;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[Location] GPS permission not granted on Home');
          return;
        }

        const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: initialLoc.coords.latitude, longitude: initialLoc.coords.longitude };
        if (isMounted.current) {
          setMechanicCoords(coords);
          updateBackendLocation(coords);
        }

        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 50
          },
          (loc) => {
            const currentCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            if (isMounted.current) {
              setMechanicCoords(currentCoords);
              updateBackendLocation(currentCoords);
            }
          }
        );
      } catch (err) {
        console.log('[Location] Error watching position on Home:', err.message);
      }
    };

    if (isOnline && mechanicToken) {
      startWatching();
    } else {
      if (isMounted.current) {
        setMechanicCoords(null);
      }
    }

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, [isOnline, mechanicToken]);

  const formatDistance = (distanceKm) => {
    if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
      return 'Distance unavailable';
    }
    if (distanceKm > 100) {
      return 'Distance unavailable'; // Sanity check to filter location bugs (like [0,0] calculations)
    }
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      return `${meters} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  };

  const isValidCoordinate = (coord) => {
    return coord && 
           typeof coord.latitude === 'number' && !isNaN(coord.latitude) &&
           typeof coord.longitude === 'number' && !isNaN(coord.longitude);
  };

  const handleAcceptRequest = async (id) => {
    if (acceptInProgress.current[id]) {
      return;
    }
    acceptInProgress.current[id] = true;
    if (isMounted.current) {
      setAcceptLoading(prev => ({ ...prev, [id]: true }));
    }
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
        const jobId = data.jobId || data.request?._id || id;
        if (!jobId) {
          console.error('[ACCEPT_REQUEST_ERROR] Missing jobId in accept response payload:', data);
          Alert.alert('Error', 'Could not start the job — missing job ID.');
          return;
        }

        // Emit Socket event to notify customer
        try {
          const socket = getSocket(mechanicToken);
          if (socket) {
            socket.emit('job:accepted', {
              jobId: jobId,
              mechanicName: mechanic?.name || 'Mechanic',
              mechanicPhone: mechanic?.phone || '+919999999999'
            });
          }
        } catch (socketErr) {
          console.error('[ACCEPT_REQUEST_SOCKET_ERROR] Error emitting job:accepted:', socketErr);
        }

        // Navigate to OnTheWayScreen
        if (isMounted.current && navigation) {
          try {
            navigation.navigate('OnTheWay', { requestId: jobId });
          } catch (navErr) {
            console.error('[ACCEPT_REQUEST_ERROR] Navigation navigate crashed:', navErr, { requestId: jobId });
            Alert.alert('Error', 'Navigation failed.');
          }
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to accept request');
      }
    } catch (error) {
      console.error('[ACCEPT_REQUEST_ERROR] Failed during accept flow:', error, { id });
      Alert.alert('Error', 'Failed to accept request. Server is unreachable.');
    } finally {
      acceptInProgress.current[id] = false;
      if (isMounted.current) {
        setAcceptLoading(prev => ({ ...prev, [id]: false }));
      }
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
        if (isMounted.current) {
          setRequests(prev => prev.filter(r => r._id !== id));
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('[REJECT_REQUEST_ERROR] Failed to reject request:', error);
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
            if (!req || !req._id) return null;
            const formattedService = req.issueType || req.serviceType || 'Roadside Job';
            const vehicleText = req.vehicleMake || req.vehicleModel || req.vehicleType || 'Vehicle';
            return (
              <TouchableOpacity key={req._id} activeOpacity={0.95} onPress={() => setSelectedRequest(req)} style={styles.requestCard}>
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
                      {formatDistance(req.distanceKm)}
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
              </TouchableOpacity>
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
  bodyScroll: { paddingBottom: 90, paddingHorizontal: 16 },
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
          <View style={styles.ratingBannerSubtitle}>
            <Text style={styles.ratingBannerSubtitleText}>Great service brings more jobs!</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Map Preview Modal */}
      <Modal
        visible={!!selectedRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Job Location Preview</Text>
              <TouchableOpacity onPress={() => setSelectedRequest(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Map Area */}
            {selectedRequest && (
              <View style={styles.mapContainer}>
                {(() => {
                  const custCoords = selectedRequest.customerLocation?.coordinates
                    ? { latitude: selectedRequest.customerLocation.coordinates[1], longitude: selectedRequest.customerLocation.coordinates[0] }
                    : null;
                  
                  return isValidCoordinate(custCoords) ? (
                    <MapView
                      style={styles.previewMap}
                      customMapStyle={darkMapStyle}
                      initialRegion={{
                        latitude: custCoords.latitude,
                        longitude: custCoords.longitude,
                        latitudeDelta: 0.03,
                        longitudeDelta: 0.03,
                      }}
                      showsUserLocation={false}
                    >
                      {/* Customer Pin */}
                      <Marker coordinate={custCoords} title="Customer Location">
                        <View style={styles.customerPinBadge}>
                          <Text style={{ fontSize: 22 }}>🚗</Text>
                        </View>
                      </Marker>

                      {/* Mechanic Live Location Pin */}
                      {isValidCoordinate(mechanicCoords) && (
                        <Marker coordinate={mechanicCoords} title="Your Location">
                          <View style={styles.mechanicMarkerDot} />
                        </Marker>
                      )}

                      {/* Path route line */}
                      {isValidCoordinate(mechanicCoords) && (
                        <Polyline
                          coordinates={[mechanicCoords, custCoords]}
                          strokeColor="#00BFA5"
                          strokeWidth={4}
                        />
                      )}
                    </MapView>
                  ) : (
                    <View style={styles.noMapContainer}>
                      <Ionicons name="map-outline" size={48} color="#94a3b8" />
                      <Text style={styles.noMapText}>Map view unavailable for this request</Text>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Job Details */}
            {selectedRequest && (
              <View style={styles.modalDetailsContainer}>
                <View style={styles.modalDetailsRow}>
                  <Text style={styles.modalCustomerName}>
                    {selectedRequest.customerName || 'Customer'}
                  </Text>
                  <Text style={styles.modalDistanceVal}>
                    {formatDistance(selectedRequest.distanceKm)}
                  </Text>
                </View>

                <Text style={styles.modalServiceSub}>
                  {String(selectedRequest.vehicleMake || selectedRequest.vehicleModel || 'Vehicle').toUpperCase()} • {String(selectedRequest.issueType || 'Roadside Assistance').replace(/_/g, ' ')}
                </Text>

                <View style={styles.modalLocRow}>
                  <Ionicons name="location" size={14} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.modalLocText} numberOfLines={2}>
                    {selectedRequest.location || 'Nearby location'}
                  </Text>
                </View>

                {selectedRequest.issueDescription ? (
                  <View style={styles.modalNoteBox}>
                    <Text style={styles.modalNoteText}>"{selectedRequest.issueDescription}"</Text>
                  </View>
                ) : null}

                {/* Pricing / Fare */}
                <View style={styles.modalPriceContainer}>
                  <Text style={styles.modalPriceLabel}>Fare Amount</Text>
                  <Text style={styles.modalPriceValue}>₹{selectedRequest.price || selectedRequest.amount || 350}</Text>
                </View>

                {/* Actions inside modal */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalRejectBtn]}
                    onPress={() => {
                      const reqId = selectedRequest._id;
                      setSelectedRequest(null);
                      handleRejectRequest(reqId);
                    }}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalAcceptBtn, acceptLoading[selectedRequest._id] && styles.modalAcceptBtnDisabled]}
                    onPress={async () => {
                      const reqId = selectedRequest._id;
                      setSelectedRequest(null);
                      await handleAcceptRequest(reqId);
                    }}
                    disabled={acceptLoading[selectedRequest._id]}
                  >
                    {acceptLoading[selectedRequest._id] ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.acceptBtnText}>Accept Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  bodyScroll: { paddingBottom: 90, paddingHorizontal: 16 },
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
    fontSize: 22,
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#252542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252542',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
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
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  // 2. PERFORMANCE BANNER
  performanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#A3E4D7',
  },
  perfLeftIcon: {
    marginRight: 12,
  },
  perfTextContainer: {
    flex: 1,
  },
  perfTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#16A085',
  },
  perfSubtitle: {
    fontSize: 11,
    color: '#1abc9c',
    marginTop: 2,
  },
  perfLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perfLinkLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#27AE60',
    marginRight: 4,
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
  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
    flex: 1,
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
  reqCustomerTextCol: {
    flex: 1,
  },
  reqCustomerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  reqSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  badgeRow: {
    alignItems: 'flex-end',
  },
  priceBadge: {
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  priceBadgeText: {
    color: '#00BFA5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  distanceBadge: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  reqLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reqLocText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  customerNoteContainer: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  customerNoteText: {
    fontSize: 12,
    color: '#D97706',
    fontStyle: 'italic',
  },
  reqActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  rejectBtnText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptBtn: {
    backgroundColor: '#00BFA5',
    marginLeft: 8,
  },
  acceptBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radarCenter: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sonarCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
    zIndex: 1,
  },
  scanningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
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
  // Map preview modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252542',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseBtn: {
    padding: 4,
  },
  mapContainer: {
    height: 250,
    width: '100%',
    backgroundColor: '#0f0f1d',
  },
  previewMap: {
    flex: 1,
  },
  noMapContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1d',
  },
  noMapText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
  customerPinBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mechanicMarkerDot: {
    width: 16,
    height: 16,
    backgroundColor: '#00BFA5',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 4,
  },
  modalDetailsContainer: {
    padding: 20,
  },
  modalDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalCustomerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalDistanceVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00BFA5',
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalServiceSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
    fontWeight: '600',
  },
  modalLocRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalLocText: {
    fontSize: 14,
    color: '#94a3b8',
    flex: 1,
    lineHeight: 18,
  },
  modalNoteBox: {
    backgroundColor: '#252542',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modalNoteText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
  modalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  modalPriceLabel: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
  modalPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00BFA5',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRejectBtn: {
    backgroundColor: '#E74C3C',
    marginRight: 10,
  },
  modalAcceptBtn: {
    backgroundColor: '#00BFA5',
  },
  modalAcceptBtnDisabled: {
    opacity: 0.6,
  },
});
