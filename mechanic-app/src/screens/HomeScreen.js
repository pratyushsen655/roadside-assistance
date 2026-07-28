// src/screens/HomeScreen.js
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Animated, Image, Modal, Dimensions, StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getSocket } from '../config/socket';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useBottomNavSafeArea } from '../hooks/useBottomNavSafeArea';
import DrawerMenu from '../components/DrawerMenu';

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
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight || 24);
  const { paddingBottom } = useBottomNavSafeArea();
  const isMounted = useRef(true);
  const acceptInProgress = useRef({});
  // mechanicLocation is managed globally in AuthContext
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const {
    mechanic,
    mechanicToken,
    logout,
    mechanicLocation,
    setMechanicLocation,
    locationPermissionGranted,
    setLocationPermissionGranted,
    pendingRequests,
    setPendingRequests,
    removePendingRequest
  } = useContext(AuthContext);
  const [isOnline, setIsOnline] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const [unreadCount, setUnreadCount] = useState(3);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'New Message 💬',
      body: "Customer Prateek sent: 'Are you on the way?'",
      time: '5 mins ago',
      read: false,
    },
    {
      id: 'n2',
      title: 'Payment Received 💰',
      body: 'Payout of ₹350 successfully processed.',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 'n3',
      title: 'System Update 🛠️',
      body: 'Welcome to RoadMitra Mechanic! Check specialization info.',
      time: '1 day ago',
      read: false,
    },
  ]);

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleTapNotification = (id) => {
    setNotifications(prev =>
      prev.map(n => {
        if (n.id === id && !n.read) {
          setUnreadCount(count => Math.max(0, count - 1));
          return { ...n, read: true };
        }
        return n;
      })
    );
  };

  const handleDeleteNotification = (id) => {
    const itemToDelete = notifications.find(n => n.id === id);
    if (itemToDelete && !itemToDelete.read) {
      setUnreadCount(count => Math.max(0, count - 1));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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
        fetchPendingRequests();
      });

      return unsubscribe;
    }
  }, [mechanicToken, navigation]);

  useEffect(() => {
    let interval;
    let socket;
    if (mechanicToken && isOnline) {
      fetchPendingRequests();
      
      socket = getSocket(mechanicToken, mechanic?._id || mechanic?.id);
      if (socket) {
        socket.on('new_breakdown_request', (data) => {
          console.log('[Socket] New breakdown request received on Home:', data);
          fetchPendingRequests();
        });

        socket.on('incoming-request', (data) => {
          console.log('[Socket] Incoming request received on Home:', data);
          fetchPendingRequests();
        });

        socket.on('incoming_request', (data) => {
          console.log('[Socket] Incoming request received on Home:', data);
          fetchPendingRequests();
        });

        socket.on('new_request_available', (data) => {
          console.log('[Socket] New request available on Home:', data);
          fetchPendingRequests();
        });

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

        socket.on('incoming_request_timeout', (data) => {
          if (data && data.requestId) {
            console.log('[Socket] Request timed out, removing from list:', data.requestId);
            if (isMounted.current) {
              setRequests(prev => prev.filter(r => r._id !== data.requestId));
            }
          }
        });

        socket.on('request_cancelled', (data) => {
          if (data && data.requestId) {
            console.log('[Socket] Request cancelled, removing from list:', data.requestId);
            if (isMounted.current) {
              setRequests(prev => prev.filter(r => r._id !== data.requestId));
            }
          }
        });
      }

      interval = setInterval(() => {
        fetchPendingRequests();
      }, 5000);
    } else {
      if (isMounted.current) {
        setRequests([]);
      }
      if (socket) {
        socket.off('incoming-request');
        socket.off('incoming_request');
        socket.off('new_request_available');
        socket.off('request:price_updated');
        socket.off('request:price_updated_global');
        socket.off('request_claimed');
        socket.off('incoming_request_timeout');
        socket.off('request_cancelled');
      }
    }
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('incoming-request');
        socket.off('incoming_request');
        socket.off('new_request_available');
        socket.off('request:price_updated');
        socket.off('request:price_updated_global');
        socket.off('request_claimed');
        socket.off('incoming_request_timeout');
        socket.off('request_cancelled');
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
      const rawData = await response.json();
      const list = Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.requests || []);
      console.log(`[TRACE UI State Handler] [HomeScreen fetchPendingRequests] API returned ${list.length} pending requests.`);
      if (isMounted.current) {
        setRequests(list);
        if (list.length > 0) {
          setPendingRequests(prev => {
            const merged = [...list];
            prev.forEach(p => {
              const pId = (p.requestId || p._id || p.id)?.toString();
              if (!merged.some(m => (m.requestId || m._id || m.id)?.toString() === pId)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }
      }
    } catch (error) {
      console.log('[TRACE Step 6 UI State ERROR] Error fetching pending requests:', error.message);
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
      let payload = { isOnline: newStatus };
      if (newStatus) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc && loc.coords) {
            payload.latitude = loc.coords.latitude;
            payload.longitude = loc.coords.longitude;
            setMechanicLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        } catch (locErr) {
          if (mechanicLocation) {
            payload.latitude = mechanicLocation.latitude;
            payload.longitude = mechanicLocation.longitude;
          }
        }
      }

      const response = await fetch(`${API_URL}/api/mechanic/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        console.log('[TRACE Step 1 Client Status Toggle Success] Mechanic status updated:', data);
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
          if (isMounted.current) {
            setLocationPermissionGranted(false);
          }
          return;
        }

        if (isMounted.current) {
          setLocationPermissionGranted(true);
        }

        const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: initialLoc.coords.latitude, longitude: initialLoc.coords.longitude };
        if (isMounted.current) {
          setMechanicLocation(coords);
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
              setMechanicLocation(currentCoords);
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
        setMechanicLocation(null);
      }
    }

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, [isOnline, mechanicToken]);

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const created = new Date(dateString);
    if (isNaN(created.getTime())) return 'Just now';
    const diffMins = Math.floor((Date.now() - created.getTime()) / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return created.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDistance = (req) => {
    console.log('[formatDistance DEBUG] req ID:', req?._id);
    console.log('[formatDistance DEBUG] locationPermissionGranted:', locationPermissionGranted);
    console.log('[formatDistance DEBUG] mechanicLocation:', mechanicLocation);
    console.log('[formatDistance DEBUG] req.distanceKm:', req?.distanceKm);
    console.log('[formatDistance DEBUG] req.coordsMissing:', req?.coordsMissing);

    if (!req) return 'Distance unavailable';
    
    if (req.coordsMissing) {
      return 'Location pending';
    }

    if (!locationPermissionGranted || !mechanicLocation) {
      return 'Enable location to see distance';
    }

    const distanceKm = req.distanceKm;

    if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
      return 'Distance unavailable';
    }
    if (distanceKm > 100) {
      return 'Distance unavailable';
    }
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      return `${meters} m away`;
    }
    return `${distanceKm.toFixed(1)} km away`;
  };

  const handleRequestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setMechanicLocation(coords);
        updateBackendLocation(coords);
      } else {
        setLocationPermissionGranted(false);
        Alert.alert(
          'Location Permission Required',
          'Please enable location access in your device settings to see distance to customer.'
        );
      }
    } catch (err) {
      console.log('Error requesting location permission:', err.message);
    }
  };

  const handleCardPress = (req) => {
    if (!locationPermissionGranted || !mechanicLocation) {
      handleRequestLocationPermission();
    } else {
      setSelectedRequest(req);
    }
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
        removePendingRequest(id);
        removePendingRequest(jobId);
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

        // Explicitly clear loading state BEFORE navigating
        if (isMounted.current) {
          setAcceptLoading(prev => ({ ...prev, [id]: false }));
        }

        // Navigate to OnTheWayScreen after state commits
        setTimeout(() => {
          if (isMounted.current && navigation) {
            try {
              if (!jobId) {
                console.warn('[WARNING] jobId is missing during OnTheWay navigation');
              }
              navigation.navigate('OnTheWay', { requestId: jobId });
            } catch (navErr) {
              console.error('[ACCEPT_REQUEST_ERROR] Navigation navigate crashed:', navErr, { requestId: jobId });
              Alert.alert('Error', 'Navigation failed.');
            }
          }
        }, 100);
      } else {
        Alert.alert('Error', data.message || 'Failed to accept request');
        // Immediately clear the stale request from the local state list
        if (isMounted.current) {
          setRequests(prev => prev.filter(r => r._id !== id));
        }
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
        removePendingRequest(id);
        if (isMounted.current) {
          setRequests(prev => prev.filter(r => (r._id || r.requestId) !== id));
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
      {/* 1. DEEP INDIGO HEADER WITH SAFE AREA TOP INSET */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setDrawerVisible(true)}>
            <Ionicons name="menu" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.greetingHeaderContainer}>
            <Text style={styles.greetingText}>{greeting} 👋</Text>
            <Text style={styles.mechanicName}>{mechanic?.name || 'Mechanic'}</Text>
          </View>

          <View style={styles.headerRightRow}>
            <View style={[styles.onlinePill, { backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)' }]}>
              <Text style={[styles.onlinePillText, { color: isOnline ? '#10B981' : '#94A3B8' }]}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
            {toggleLoading ? (
              <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 6 }} />
            ) : (
              <Switch
                trackColor={{ false: '#475569', true: '#10B981' }}
                thumbColor="#FFF"
                onValueChange={toggleStatus}
                value={isOnline}
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }], marginLeft: 2 }}
              />
            )}
          </View>
        </View>

        {/* 2. ONLINE STATUS HERO CARD */}
        <View style={styles.statusHeroCard}>
          <View style={styles.statusHeroTextCol}>
            <Text style={styles.statusHeroTitle}>You are {isOnline ? 'Online' : 'Offline'}</Text>
            <Text style={styles.statusHeroSub}>
              {isOnline ? 'Ready to receive new jobs' : 'Turn online to start accepting jobs'}
            </Text>
          </View>
          <View style={styles.heroAvatarWrapper}>
            <Image
              source={{ uri: mechanic?.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80' }}
              style={styles.heroAvatarImage}
            />
          </View>
        </View>

        {/* 3. TODAY'S STATS TILES */}
        <View style={styles.statsContainer}>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Today's Jobs</Text>
            <Text style={styles.statVal}>{stats.jobsToday || 0}</Text>
          </View>

          <View style={styles.statTileDivider} />

          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Earnings Today</Text>
            <Text style={styles.statVal}>₹{(stats.earningsToday || 0).toLocaleString()}</Text>
          </View>

          <View style={styles.statTileDivider} />

          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Rating</Text>
            <View style={styles.ratingValRow}>
              <Text style={styles.statVal}>{Number(stats.rating || 5.0).toFixed(1)}</Text>
              <Ionicons name="star" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
            </View>
          </View>
        </View>
      </View>

      {/* BODY CONTENT */}
      <ScrollView contentContainerStyle={[styles.bodyScroll, { paddingBottom: paddingBottom + 20 }]} showsVerticalScrollIndicator={false}>
        {/* NEW JOB REQUEST SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>New Job Request</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
            <Text style={styles.viewAllBtnText}>View all</Text>
          </TouchableOpacity>
        </View>

        {(() => {
          const displayRequests = (pendingRequests && pendingRequests.length > 0) ? pendingRequests : requests;
          if (requestsLoading && displayRequests.length === 0) {
            return <ActivityIndicator size="large" color="#362A84" style={{ marginVertical: 20 }} />;
          }
          if (displayRequests.length === 0) {
            return <RadarScanner />;
          }
          return displayRequests.slice(0, 3).map(req => {
            if (!req) return null;
            const reqId = (req._id || req.requestId || req.id)?.toString();
            const formattedService = req.issueType || req.serviceType || req.issueDescription || 'Job Request';
            return (
              <TouchableOpacity
                key={reqId}
                style={styles.mockJobCard}
                onPress={() => navigation.navigate('IncomingRequest', { requestData: req })}
                activeOpacity={0.9}
              >
                <View style={styles.jobTopHeader}>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>INCOMING REQUEST</Text>
                  </View>
                  <Text style={styles.jobTimeText}>{getTimeAgo(req.createdAt || req.timestamp)}</Text>
                </View>

                <Text style={styles.jobTitle}>{String(formattedService).replace(/_/g, ' ')}</Text>

                <View style={styles.jobLocationRow}>
                  <Ionicons name="location-outline" size={16} color="#64748B" style={{ marginTop: 2, marginRight: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobAddressLine1}>{req.customerAddress || req.location || 'Location provided'}</Text>
                  </View>
                </View>

                <View style={styles.jobDistancePriceRow}>
                  <View style={styles.distanceBadgeRow}>
                    <Ionicons name="navigate-outline" size={15} color="#10B981" style={{ marginRight: 5 }} />
                    <Text style={styles.distanceText}>{formatDistance(req)}</Text>
                  </View>
                  <Text style={styles.jobPrice}>₹{req.price || req.estimatedFare || req.pricing?.totalAmount || req.amount || 350}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginRight: 6 }}
                    onPress={() => handleAcceptRequest(reqId)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginLeft: 6 }}
                    onPress={() => handleRejectRequest(reqId)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          });
        })()}

        {/* TODAY'S SCHEDULE SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
            <Text style={styles.viewAllBtnText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleCardContainer}>
          <View style={styles.emptyScheduleContainer}>
            <Ionicons name="calendar-outline" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyScheduleTitle}>No Scheduled Jobs Today</Text>
            <Text style={styles.emptyScheduleText}>Your scheduled appointments for the day will appear here.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Side Drawer Menu */}
      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        mechanic={mechanic}
        logout={logout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },
  header: {
    backgroundColor: '#362A84',
    paddingTop: 46,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingHeaderContainer: {
    flex: 1,
    marginLeft: 12,
  },
  greetingText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
  mechanicName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlinePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlinePillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statusHeroTextCol: {
    flex: 1,
  },
  statusHeroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusHeroSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  heroAvatarWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  statVal: {
    fontSize: 19,
    fontWeight: '800',
    color: '#362A84',
  },
  statTileDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  ratingValRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bodyScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  viewAllBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#362A84',
  },
  mockJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  jobTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    color: '#362A84',
    fontSize: 12,
    fontWeight: 'bold',
  },
  jobTimeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  jobLocationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobAddressLine1: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  jobAddressLine2: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  jobDistancePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  distanceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  jobPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  jobActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  rejectButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#362A84',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    color: '#362A84',
    fontSize: 15,
    fontWeight: 'bold',
  },
  acceptButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#362A84',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#362A84',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  timerContainer: {
    marginTop: 4,
  },
  timerText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  timerBarTrack: {
    height: 5,
    backgroundColor: '#EEF2FF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: '#362A84',
    borderRadius: 3,
  },
  scheduleCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  scheduleLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  scheduleTextCol: {
    flex: 1,
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scheduleService: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 6,
  },
  scheduleLocation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  inProgressPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  inProgressPillText: {
    color: '#362A84',
    fontSize: 12,
    fontWeight: 'bold',
  },
  upcomingPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  upcomingPillText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  emptyScheduleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyScheduleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4,
  },
  emptyScheduleText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
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
  // Notifications Modal Styles
  notifOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  notifContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#252542',
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notifCountBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  notifCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  notifHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllBtn: {
    marginRight: 16,
    paddingVertical: 4,
  },
  markAllText: {
    color: '#00BFA5',
    fontSize: 13,
    fontWeight: 'bold',
  },
  notifCloseBtn: {
    padding: 4,
  },
  notifScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  notifEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  notifBellCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 191, 165, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notifEmptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  notifEmptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  notifItem: {
    flexDirection: 'row',
    backgroundColor: '#252542',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30304f',
  },
  notifItemUnread: {
    borderColor: '#00BFA5',
    backgroundColor: '#1E1E38',
  },
  notifItemLeft: {
    position: 'relative',
    marginRight: 12,
  },
  notifIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00BFA5',
    borderWidth: 1.5,
    borderColor: '#1E1E38',
  },
  notifItemCenter: {
    flex: 1,
    marginRight: 8,
  },
  notifItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  notifItemTitle: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
    flex: 1,
    marginRight: 6,
  },
  notifItemTitleUnread: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  notifItemTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  notifItemBody: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  notifDeleteBtn: {
    padding: 8,
  },
  notifFooter: {
    borderTopWidth: 1,
    borderTopColor: '#252542',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  clearAllBtn: {
    backgroundColor: '#E74C3C15',
    borderWidth: 1,
    borderColor: '#E74C3C40',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: 'bold',
  },
});