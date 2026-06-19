import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, Animated, Vibration
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from '../config/socket';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';

export default function SOSConfirmationScreen({ route, navigation }) {
  const { sosId, lat, lng } = route.params || {};
  const [status, setStatus] = useState('pending'); // pending, accepted
  const [mechanic, setMechanic] = useState(null);
  const [searchRadius, setSearchRadius] = useState(5);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation while waiting
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    if (status === 'pending') {
      pulse.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => pulse.stop();
  }, [status]);

  useEffect(() => {
    let socket;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        socket = getSocket(token);
        if (socket) {
          // Join socket room
          socket.emit('join:job:room', { jobId: sosId });
          console.log(`[Socket] Customer joined SOS room job:${sosId}`);

          // Listen for mechanic acceptance
          socket.on('job:accepted:notify', (details) => {
            try {
              console.log('[Socket] SOS request accepted:', details);
              Vibration.vibrate([0, 500, 200, 500]);
              
              const mName = details?.mechanicName || 'Professional Mechanic';
              const mPhone = details?.mechanicPhone || '';
              const mId = details?.mechanicId || '';

              try {
                navigation.replace('SOSCustomerBoard', {
                  sosId,
                  customerLat: lat,
                  customerLng: lng,
                  mechanicName: mName,
                  mechanicPhone: mPhone,
                  mechanicId: mId
                });
              } catch (navErr) {
                console.error('[REQUEST_ACCEPTED_LISTENER_ERROR] SOS navigation replaces crashed:', navErr, { sosId });
                Alert.alert('Error', 'Unable to redirect to SOS customer board.');
              }
            } catch (err) {
              console.error('[REQUEST_ACCEPTED_LISTENER_ERROR] General error in SOS accepted handler:', err, { details });
            }
          });

          // Listen for search radius updates
          socket.off('request:search_radius_update');
          socket.on('request:search_radius_update', (data) => {
            if (data && data.radiusKm) {
              setSearchRadius(data.radiusKm);
            }
          });
        }
      } catch (err) {
        console.log('Error initializing socket in SOSConfirmationScreen:', err);
      }
    })();

    return () => {
      if (socket) {
        socket.off('job:accepted:notify');
        socket.off('request:search_radius_update');
      }
    };
  }, [sosId]);

  const handleCall = () => {
    if (mechanic?.phone) {
      Linking.openURL(`tel:${mechanic.phone}`);
    } else {
      Alert.alert('Error', 'Mechanic phone number is not available.');
    }
  };

  const handleCancelSOS = async () => {
    Alert.alert(
      'Cancel SOS?',
      'Are you sure you want to cancel this emergency request?',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        {status === 'pending' && (
          <TouchableOpacity onPress={handleCancelSOS} style={styles.backBtn}>
            <Text style={styles.backIcon}>✕</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Emergency SOS Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {status === 'pending' ? (
          <View style={StyleSheet.absoluteFillObject}>
            <MapView
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: lat || 28.6139,
                longitude: lng || 77.2090,
                latitudeDelta: 0.25,
                longitudeDelta: 0.25,
              }}
            >
              <Marker coordinate={{ latitude: lat || 28.6139, longitude: lng || 77.2090 }}>
                <View style={styles.customerMarkerPin}>
                  <Ionicons name="location-sharp" size={36} color="#E8192C" />
                </View>
              </Marker>
              <Circle
                center={{ latitude: lat || 28.6139, longitude: lng || 77.2090 }}
                radius={searchRadius * 1000}
                strokeWidth={2}
                strokeColor="#E8192C"
                fillColor="rgba(232, 25, 44, 0.08)"
                lineDashPattern={[6, 6]}
              />
            </MapView>

            {/* Top Status Panel */}
            <View style={styles.topStatusPanel}>
              <Text style={styles.topStatusTitle}>Searching nearby mechanics...</Text>
              <Text style={styles.topStatusSubtitle}>Radius: {searchRadius} km</Text>
              <ActivityIndicator size="small" color="#E8192C" style={{ marginTop: 8 }} />
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomOverlayContainer}>
              <TouchableOpacity style={styles.cancelOverlayBtn} onPress={handleCancelSOS}>
                <Text style={styles.cancelOverlayBtnText}>Cancel Emergency SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.successSubtitle}>
              Emergency Accepted! A mechanic has been dispatched and is heading your way.
            </Text>

            <View style={styles.acceptedCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{mechanic?.name?.charAt(0) || 'M'}</Text>
              </View>
              <Text style={styles.mechanicName}>{mechanic?.name}</Text>
              <Text style={styles.badgeText}>🔧 Assigned Responder</Text>
              
              <View style={styles.divider} />
              
              {mechanic?.phone ? (
                <Text style={styles.phoneText}>{mechanic.phone}</Text>
              ) : null}

              <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                <Text style={styles.callBtnText}>📞 Contact Mechanic</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>What to do now:</Text>
              <Text style={styles.waitText}>
                Please stay near your coordinates. Keep your phone line active as the mechanic might call you for details.
              </Text>
            </View>

            <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.homeBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#1F2937' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#E8192C', textAlign: 'center', flex: 1 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, backgroundColor: '#FFFFFF' },
  successSubtitle: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  tipsCard: {
    width: '100%', backgroundColor: '#F5F5F5',
    borderRadius: 16, padding: 20, marginBottom: 25,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 15 },
  waitText: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
  acceptedCard: {
    width: '100%', backgroundColor: '#F5F5F5', borderRadius: 20,
    padding: 24, alignItems: 'center', marginBottom: 25,
    borderWidth: 1, borderColor: '#E5E7EB', elevation: 4,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#E8192C', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  mechanicName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  badgeText: { fontSize: 12, color: '#00BFA5', fontWeight: 'bold', marginBottom: 15 },
  divider: { width: '100%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 15 },
  phoneText: { fontSize: 16, color: '#4B5563', marginBottom: 15 },
  callBtn: {
    width: '100%', backgroundColor: '#00BFA5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  homeBtn: {
    width: '100%', backgroundColor: '#E5E7EB', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  homeBtnText: { color: '#1F2937', fontWeight: '700', fontSize: 15 },

  // Map elements
  customerMarkerPin: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topStatusPanel: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  topStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  topStatusSubtitle: {
    fontSize: 14,
    color: '#E8192C',
    fontWeight: '700',
    marginTop: 4,
  },
  bottomOverlayContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cancelOverlayBtn: {
    backgroundColor: '#E8192C',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#E8192C',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cancelOverlayBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
