import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, Platform, NativeModules } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';
import API_URL from '../config/api';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

const { RingingModule } = NativeModules;

const IncomingRequestScreen = ({ route, navigation }) => {
  const { mechanicToken, mechanic } = useContext(AuthContext);
  const requestData = route.params?.requestData;

  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null);
  const actionTakenRef = useRef(false);

  const {
    requestId,
    customerName,
    customerAddress,
    distanceKm,
    serviceType,
    vehicleType
  } = requestData || {};

  // Clean up formatting
  const formattedService = serviceType ? serviceType.replace(/_/g, ' ').toUpperCase() : 'ROADSIDE ASSISTANCE';
  const formattedVehicle = vehicleType ? vehicleType.toUpperCase() : 'VEHICLE';

  useEffect(() => {
    if (!mechanicToken || !requestId) return;

    let socket;
    try {
      socket = getSocket(mechanicToken);
      if (socket) {
        const handleRequestTimeout = (data) => {
          if (data && data.requestId?.toString() === requestId.toString()) {
            console.log('[Socket Listener] Received incoming_request_timeout event — dismissing alert');
            if (Platform.OS === 'android' && RingingModule) {
              RingingModule.stopRinging();
            } else {
              Vibration.cancel();
            }
            navigation.reset({
              index: 0,
              routes: [{ name: 'Tabs' }],
            });
          }
        };

        const handleRequestCancelled = (data) => {
          if (data && data.requestId?.toString() === requestId.toString()) {
            console.log('[Socket Listener] Received request_cancelled event — dismissing alert');
            if (Platform.OS === 'android' && RingingModule) {
              RingingModule.stopRinging();
            } else {
              Vibration.cancel();
            }
            navigation.reset({
              index: 0,
              routes: [{ name: 'Tabs' }],
            });
          }
        };

        socket.on('incoming_request_timeout', handleRequestTimeout);
        socket.on('request_cancelled', handleRequestCancelled);

        return () => {
          socket.off('incoming_request_timeout', handleRequestTimeout);
          socket.off('request_cancelled', handleRequestCancelled);
        };
      }
    } catch (err) {
      console.warn('[Socket Listener Error] Failed to attach incoming call listeners:', err.message);
    }
  }, [mechanicToken, requestId]);

  useEffect(() => {
    console.log('[Ringing UI] Mounted for request:', requestId);

    // 1. Play System Ringtone & Vibrate
    if (Platform.OS === 'android' && RingingModule) {
      RingingModule.startRinging();
    } else {
      // Fallback for iOS or if RingingModule isn't linked
      Vibration.vibrate([1000, 1000], true);
    }

    // 2. Start 30s Countdown Timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      // Stop ringing and clean up timer on unmount
      console.log('[Ringing UI] Unmounting...');
      clearInterval(timerRef.current);
      if (Platform.OS === 'android' && RingingModule) {
        RingingModule.stopRinging();
      } else {
        Vibration.cancel();
      }
    };
  }, [requestId]);

  const handleTimeout = () => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    console.log('[Ringing UI] Timeout reached (30s) — declining request');
    declineRequest();
  };

  const handleDecline = () => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    console.log('[Ringing UI] Mechanic clicked Decline');
    declineRequest();
  };

  const declineRequest = async () => {
    // 1. Stop Ringing
    if (Platform.OS === 'android' && RingingModule) {
      RingingModule.stopRinging();
    } else {
      Vibration.cancel();
    }

    // 2. Call Decline/Reject API
    try {
      const response = await fetch(`${API_URL}/api/mechanic/requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      console.log('[Ringing UI] Decline API response:', data);
    } catch (err) {
      console.error('[Ringing UI] Error calling decline API:', err.message);
    }

    // 3. Reset navigation back to Main Tabs
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs' }],
    });
  };

  const handleAccept = async () => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    console.log('[Ringing UI] Mechanic clicked Accept');

    // 1. Stop Ringing
    if (Platform.OS === 'android' && RingingModule) {
      RingingModule.stopRinging();
    } else {
      Vibration.cancel();
    }

    // 2. Call Accept API
    try {
      const response = await fetch(`${API_URL}/api/mechanic/requests/${requestId}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        console.log('[Ringing UI] Request accepted successfully. Navigating to OnTheWay...');
        
        // Emit Socket event to notify customer
        try {
          const socket = getSocket(mechanicToken);
          if (socket) {
            socket.emit('job:accepted', {
              jobId: requestId,
              mechanicName: mechanic?.name || 'Mechanic',
              mechanicPhone: mechanic?.phone || '+919999999999'
            });
          }
        } catch (socketErr) {
          console.error('[Ringing UI] Socket emit error:', socketErr.message);
        }

        // Reset navigation to Tabs and OnTheWay screen
        navigation.reset({
          index: 0,
          routes: [
            { name: 'Tabs' },
            { name: 'OnTheWay', params: { requestId } }
          ],
        });
      } else {
        console.warn('[Ringing UI] Accept failed:', data.message);
        alert(data.message || 'Job is no longer available.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Tabs' }],
        });
      }
    } catch (error) {
      console.error('[Ringing UI] Error accepting request:', error.message);
      alert('Network error. Failed to accept job.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Red Accent Header */}
      <View style={styles.header}>
        <Text style={styles.incomingText}>INCOMING REQUEST</Text>
        <Text style={styles.timerText}>{timeLeft}s</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        <View style={styles.avatarCircle}>
          <FontAwesome5 name="car-crash" size={48} color="#E8192C" />
        </View>

        <Text style={styles.customerName}>{customerName || 'Customer'}</Text>
        <Text style={styles.distanceText}>{distanceKm ? `${parseFloat(distanceKm).toFixed(1)} km away` : 'Nearby'}</Text>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="construct" size={24} color="#555" style={styles.infoIcon} />
          <View>
            <Text style={styles.infoLabel}>SERVICE TYPE</Text>
            <Text style={styles.infoValue}>{formattedService}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="car-sport" size={24} color="#555" style={styles.infoIcon} />
          <View>
            <Text style={styles.infoLabel}>VEHICLE TYPE</Text>
            <Text style={styles.infoValue}>{formattedVehicle}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location" size={24} color="#555" style={styles.infoIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>LOCATION</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{customerAddress || 'Nearby Coordinates'}</Text>
          </View>
        </View>
      </View>

      {/* Buttons Area */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={handleDecline}>
          <Ionicons name="close" size={28} color="#fff" />
          <Text style={styles.btnText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAccept}>
          <Ionicons name="checkmark" size={28} color="#fff" />
          <Text style={styles.btnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#E8192C',
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: '#E8192C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  incomingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: 'bold',
    marginTop: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  customerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  distanceText: {
    fontSize: 18,
    color: '#E8192C',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 30,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: 24,
  },
  infoIcon: {
    marginRight: 16,
    width: 30,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#222',
    fontWeight: 'bold',
    marginTop: 2,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 48,
    backgroundColor: '#ffffff',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  declineBtn: {
    backgroundColor: '#888888',
    marginRight: 12,
  },
  acceptBtn: {
    backgroundColor: '#27AE60',
    marginLeft: 12,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default IncomingRequestScreen;
