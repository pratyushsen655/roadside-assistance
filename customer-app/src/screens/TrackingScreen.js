import React, { useEffect, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Dimensions, ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';

const { width, height } = Dimensions.get('window');

const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function TrackingScreen({ route, navigation }) {
  const { jobId, mechanicId, mechanicName, mechanicPhone, customerLat, customerLng } = route.params || {};
  const { token } = useContext(AuthContext);

  const [customerCoords, setCustomerCoords] = useState({
    latitude: customerLat || 28.6139,
    longitude: customerLng || 77.2090
  });
  const [mechanicCoords, setMechanicCoords] = useState(null);
  const [status, setStatus] = useState('accepted'); // accepted, en_route, arrived, in_progress, completed
  const [mapLoading, setMapLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mechanicRating, setMechanicRating] = useState(4.8);

  // Initialize Socket
  const socket = getSocket(token);

  useEffect(() => {
    if (!mechanicId) return;
    const fetchRating = async () => {
      try {
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';
        const res = await fetch(`${API_URL}/api/ratings/mechanic/${mechanicId}`);
        const data = await res.json();
        if (res.ok && data && data.ratings) {
          if (data.ratings.length > 0) {
            const avg = data.ratings.reduce((sum, r) => sum + r.rating, 0) / data.ratings.length;
            setMechanicRating(Math.round(avg * 10) / 10);
          }
        }
      } catch (err) {
        console.log('Error fetching mechanic rating:', err);
      }
    };
    fetchRating();
  }, [mechanicId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setUnreadCount(0);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // Request GPS permission and fetch live customer location
    (async () => {
      try {
        let { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
        if (permissionStatus === 'granted') {
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCustomerCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
        }
      } catch (err) {
        console.log('Error requesting location:', err);
      } finally {
        setMapLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!socket || !jobId) return;

    // Join room
    socket.emit('join:job:room', { jobId });
    console.log(`[Socket] Customer joined room job:${jobId}`);

    // Listen to mechanic location updates
    socket.on('mechanic:location:update', (coords) => {
      try {
        console.log('[Socket] Mechanic location update received:', coords);
        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
          setMechanicCoords({
            latitude: coords.lat,
            longitude: coords.lng
          });
        }
      } catch (err) {
        console.error('[Socket] Error handling mechanic:location:update:', err);
      }
    });

    // Listen to job status changes
    socket.on('job:status:changed', (data) => {
      try {
        console.log('[Socket] Job status changed received:', data);
        if (data && data.status) {
          setStatus(data.status);
          if (data.status === 'completed') {
            navigation.navigate('Payment', {
              jobId,
              mechanicName,
              amount: data.amount || 350
            });
          }
        }
      } catch (err) {
        console.error('[Socket] Error handling job:status:changed:', err);
      }
    });

    // Listen to new chat messages to increment unread badge
    socket.on('chat:message', (msg) => {
      try {
        console.log('[Socket] Chat message received in Tracking:', msg);
        if (msg && msg.jobId === jobId && msg.senderType === 'mechanic') {
          setUnreadCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error('[Socket] Error handling chat:message in Tracking:', err);
      }
    });

    return () => {
      socket.off('mechanic:location:update');
      socket.off('job:status:changed');
      socket.off('chat:message');
    };
  }, [jobId, socket]);

  // NOTE: Navigation to Payment is handled exclusively by the job:status:changed socket
  // listener above. Do NOT add a status watcher here — it causes double-navigation after
  // the component is already unmounted, which crashes the app.

  const handleCancelJob = async () => {
    Alert.alert(
      'Cancel Request?',
      'Are you sure you want to cancel this roadside assistance request?',
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';
              const response = await fetch(`${API_URL}/api/requests/${jobId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'cancelled' })
              });
              const json = await response.json();
              if (response.ok) {
                // emit cancelled event
                socket.emit('job:status:update', { jobId, status: 'cancelled' });
                Alert.alert('Cancelled', 'Your request has been cancelled.', [
                  { text: 'OK', onPress: () => navigation.navigate('Home') }
                ]);
              } else {
                Alert.alert('Error', json.message || 'Failed to cancel job');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to reach server');
            }
          }
        }
      ]
    );
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'accepted':
        return { text: '🔵 Mechanic Accepted', color: '#1E88E5' };
      case 'en_route':
        return { text: '🟡 En Route', color: '#FBC02D' };
      case 'arrived':
        return { text: '🟠 Arrived', color: '#F57C00' };
      case 'in_progress':
        return { text: '🟢 In Progress', color: '#388E3C' };
      case 'completed':
        return { text: '✅ Completed', color: '#2E7D32' };
      case 'cancelled':
        return { text: '❌ Cancelled', color: '#C62828' };
      default:
        return { text: '🔵 Connected', color: '#1E88E5' };
    }
  };

  const badge = getStatusBadge();

  // Distance & ETA calculation
  let distance = 0;
  let eta = 0;
  if (mechanicCoords) {
    distance = getDistanceInKm(
      customerCoords.latitude,
      customerCoords.longitude,
      mechanicCoords.latitude,
      mechanicCoords.longitude
    );
    eta = Math.round(distance * 3); // 3 mins per km estimate
    if (eta < 1) eta = 1;
  }

  const isCancellable = ['accepted', 'en_route'].includes(status);

  return (
    <View style={styles.container}>
      {mapLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: customerCoords.latitude,
            longitude: customerCoords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
        >
          {/* Customer Location */}
          <Marker coordinate={customerCoords} title="You">
            <View style={styles.customerPin}>
              <Text style={{ fontSize: 24 }}>📍</Text>
            </View>
          </Marker>

          {/* Mechanic Location */}
          {mechanicCoords && (
            <Marker coordinate={mechanicCoords} title="Mechanic">
              <View style={styles.mechanicPin}>
                <Text style={{ fontSize: 24 }}>🔧</Text>
              </View>
            </Marker>
          )}

          {/* Route Line */}
          {mechanicCoords && (
            <Polyline
              coordinates={[customerCoords, mechanicCoords]}
              strokeColor="#1E88E5"
              strokeWidth={4}
            />
          )}
        </MapView>
      )}

      {/* Top Status Bar */}
      <View style={styles.topBar}>
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>
      </View>

      {/* Bottom Sheet Card */}
      <View style={styles.bottomSheet}>
        <View style={styles.mechanicDetails}>
          <TouchableOpacity 
            style={styles.avatar}
            onPress={() => mechanicId && navigation.navigate('MechanicProfile', { mechanicId })}
          >
            <Text style={styles.avatarText}>{mechanicName?.charAt(0) || 'M'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.nameContainer}
            onPress={() => mechanicId && navigation.navigate('MechanicProfile', { mechanicId })}
          >
            <Text style={styles.mechanicName}>{mechanicName || 'Professional Mechanic'}</Text>
            <Text style={styles.ratingText}>⭐ {mechanicRating.toFixed(1)} Rating</Text>
          </TouchableOpacity>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${mechanicPhone || '+919999999999'}`)}
            >
              <Text style={styles.callBtnText}>📞 Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => {
                setUnreadCount(0);
                navigation.navigate('Chat', { jobId, mechanicId, mechanicName });
              }}
            >
              <Text style={styles.chatBtnText}>💬 Chat</Text>
              {unreadCount > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>
              {mechanicCoords ? `${distance.toFixed(1)} km` : 'Calculating...'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ETA</Text>
            <Text style={styles.statValue}>
              {mechanicCoords ? `~${eta} mins` : 'Calculating...'}
            </Text>
          </View>
        </View>

        {isCancellable && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelJob}>
            <Text style={styles.cancelBtnText}>Cancel Request</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: width,
    height: height,
  },
  customerPin: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mechanicPin: {
    width: 44,
    height: 44,
    backgroundColor: '#E0F7FA',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00BFA5',
    elevation: 3,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  badge: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
  },
  mechanicDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#B34700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  nameContainer: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#FFB300',
    fontWeight: 'bold',
  },
  callBtn: {
    backgroundColor: '#E0F2F1',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00BFA5',
    marginRight: 6,
  },
  callBtnText: {
    color: '#00BFA5',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBtn: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B34700',
    position: 'relative',
  },
  chatBtnText: {
    color: '#B34700',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chatBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd',
  },
  cancelBtn: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  cancelBtnText: {
    color: '#C62828',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
