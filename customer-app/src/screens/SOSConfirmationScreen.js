import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, Animated, Vibration
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from '../config/socket';

export default function SOSConfirmationScreen({ route, navigation }) {
  const { sosId, lat, lng } = route.params || {};
  const [status, setStatus] = useState('pending'); // pending, accepted
  const [mechanic, setMechanic] = useState(null);
  
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
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        socket = getSocket(token);
        if (socket) {
          // Join socket room
          socket.emit('join:job:room', { jobId: sosId });
          console.log(`[Socket] Customer joined SOS room job:${sosId}`);

          // Listen for mechanic acceptance
          socket.on('job:accepted:notify', (details) => {
            console.log('[Socket] SOS request accepted:', details);
            Vibration.vibrate([0, 500, 200, 500]);
            setMechanic({
              name: details.mechanicName || 'Professional Mechanic',
              phone: details.mechanicPhone || ''
            });
            setStatus('accepted');
          });
        }
      } catch (err) {
        console.log('Error initializing socket in SOSConfirmationScreen:', err);
      }
    })();

    return () => {
      if (socket) {
        socket.off('job:accepted:notify');
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
          <>
            <Text style={styles.subtitle}>
              Your emergency signal has been broadcasted to all nearby mechanics. Please stand by.
            </Text>

            <View style={styles.sosWrapper}>
              <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: pulseAnim }] }]} />
              <Animated.View style={[styles.ring, styles.ring2]} />
              <View style={styles.sosBtn}>
                <ActivityIndicator size="large" color="#ffffff" style={{ marginBottom: 10 }} />
                <Text style={styles.sosBtnText}>BROADCASTING</Text>
                <Text style={styles.gpsCoords}>{lat?.toFixed(5)}, {lng?.toFixed(5)}</Text>
              </View>
            </View>

            {/* Safety tips */}
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>⚠️ Emergency Safety Tips</Text>
              <View style={styles.tipItem}>
                <Text style={styles.tipEmoji}>🔆</Text>
                <Text style={styles.tipText}>{"Turn on your vehicle's hazard/warning lights"}</Text>
              </View>
              <View style={styles.tipItem}>
                <Text style={styles.tipEmoji}>🚧</Text>
                <Text style={styles.tipText}>If possible, pull over safely to the shoulder of the road</Text>
              </View>
              <View style={styles.tipItem}>
                <Text style={styles.tipEmoji}>🛑</Text>
                <Text style={styles.tipText}>Stay inside the vehicle or move to a safe barrier away from traffic</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelSOS}>
              <Text style={styles.cancelBtnText}>Cancel Emergency SOS</Text>
            </TouchableOpacity>
          </>
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
  root: { flex: 1, backgroundColor: '#0E0E0E' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FF3B30', textAlign: 'center', flex: 1 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
  subtitle: { fontSize: 15, color: '#aaa', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  successSubtitle: { fontSize: 16, color: '#4CAF50', fontWeight: 'bold', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  sosWrapper: { justifyContent: 'center', alignItems: 'center', marginBottom: 40, width: 220, height: 220 },
  ring: {
    position: 'absolute', borderRadius: 110, borderWidth: 2,
  },
  ring3: { width: 210, height: 210, borderColor: 'rgba(255,59,48,0.15)', backgroundColor: 'rgba(255,59,48,0.05)' },
  ring2: { width: 170, height: 170, borderColor: 'rgba(255,59,48,0.25)', backgroundColor: 'rgba(255,59,48,0.08)' },
  sosBtn: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#D32F2F',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#D32F2F', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  sosBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  gpsCoords: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 6, fontFamily: 'monospace' },
  tipsCard: {
    width: '100%', backgroundColor: '#1A1A1A',
    borderRadius: 16, padding: 20, marginBottom: 25,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 15 },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tipEmoji: { fontSize: 20, marginRight: 12 },
  tipText: { fontSize: 13, color: '#ccc', flex: 1, lineHeight: 18 },
  waitText: { fontSize: 13, color: '#ccc', lineHeight: 20 },
  cancelBtn: {
    width: '100%', backgroundColor: 'transparent',
    borderWidth: 1, borderColor: '#FF3B30', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  cancelBtnText: { color: '#FF3B30', fontWeight: '700', fontSize: 15 },
  acceptedCard: {
    width: '100%', backgroundColor: '#1E1E1E', borderRadius: 20,
    padding: 24, alignItems: 'center', marginBottom: 25,
    borderWidth: 1, borderColor: '#2E2E2E', elevation: 4,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  mechanicName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  badgeText: { fontSize: 12, color: '#00BFA5', fontWeight: 'bold', marginBottom: 15 },
  divider: { width: '100%', height: 1, backgroundColor: '#2E2E2E', marginVertical: 15 },
  phoneText: { fontSize: 16, color: '#aaa', marginBottom: 15 },
  callBtn: {
    width: '100%', backgroundColor: '#00BFA5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  homeBtn: {
    width: '100%', backgroundColor: '#333', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  homeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
