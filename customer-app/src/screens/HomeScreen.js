import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import * as Location from 'expo-location';
import Skeleton from '../components/Skeleton';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUnreadCount();
    });
    fetchUnreadCount();

    // Request location permission on mount
    (async () => {
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch (err) {
        console.log('Error requesting location permission on mount:', err);
      }
    })();

    return unsubscribe;
  }, [navigation]);

  const handleSOSPress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to send SOS');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in to use SOS');
        navigation.replace('Login');
        return;
      }

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';
      const response = await fetch(`${API_URL}/api/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lat, lng })
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('SOS Sent!', 'A mechanic will be with you shortly.');
        navigation.navigate('SOSConfirmation', { sosId: data._id, lat, lng });
      } else {
        const data = await response.json();
        Alert.alert('Failed to send SOS', data.message || 'Something went wrong.');
      }
    } catch (error) {
      console.log('Error triggering SOS:', error);
      Alert.alert('Failed to send SOS', 'Cannot connect to server.');
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken') || await AsyncStorage.getItem('token');
      if (!token) return;
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        const notifs = data.notifications || data || [];
        const count = Array.isArray(notifs) ? notifs.filter(n => !n.read).length : 0;
        setUnreadCount(count);
      }
    } catch (e) {
      console.log('Error fetching unread count:', e);
    }
  };

  const loadUser = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        Alert.alert('Error', data.message || 'Failed to load profile');
      }
    } catch (error) {
      console.log('Error loading user:', error);
      Alert.alert('Error', 'Failed to reach server. Please check your network connection.');
    } finally {
      // Artificially delay a tiny bit so users can enjoy the skeleton loading transition
      setTimeout(() => {
        setLoading(false);
      }, 800);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.topLeftIcons}>
          <Skeleton width={36} height={36} borderRadius={18} />
        </View>
        <View style={styles.topRightIcons}>
          <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 15 }} />
          <Skeleton width={60} height={20} borderRadius={6} />
        </View>
        
        <View style={{ marginTop: 80, alignItems: 'center', marginBottom: 40 }}>
          <Skeleton width={220} height={30} borderRadius={8} style={{ marginBottom: 12 }} />
          <Skeleton width={160} height={18} borderRadius={6} />
        </View>

        <View style={styles.skeletonCard}>
          <Skeleton width={120} height={22} borderRadius={6} style={{ marginBottom: 10 }} />
          <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={48} borderRadius={8} />
        </View>

        <View style={styles.skeletonCard}>
          <Skeleton width={100} height={22} borderRadius={6} style={{ marginBottom: 10 }} />
          <Skeleton width="80%" height={14} borderRadius={4} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={48} borderRadius={8} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.topLeftIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.bellIconContainer}>
          <Text style={{ fontSize: 24 }}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.topRightIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={{ marginRight: 15 }}>
          <Text style={{ fontSize: 24 }}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.title}>
        🚗 Roadside Assistance
      </Animated.Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {user && (
          <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.welcome}>
            Welcome, {user.name}!
          </Animated.Text>
        )}

        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.card}>
          <Text style={styles.cardTitle}>Need Help?</Text>
          <Text style={styles.cardText}>Request a mechanic near you</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Request')}>
            <Text style={styles.buttonText}>🔧 Request Mechanic</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450).duration(600)} style={styles.card}>
          <Text style={styles.cardTitle}>Service History</Text>
          <Text style={styles.cardText}>View your past requests and invoices</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#00BFA5' }]} onPress={() => navigation.navigate('ServiceHistory')}>
            <Text style={styles.buttonText}>📋 View History</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.card}>
          <Text style={styles.cardTitle}>Refer & Earn</Text>
          <Text style={styles.cardText}>Invite friends and earn rewards</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#FFB300' }]} onPress={() => navigation.navigate('Referral')}>
            <Text style={styles.buttonText}>🎁 Refer a Friend</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(550).duration(600)} style={styles.sosContainer}>
        <TouchableOpacity style={styles.sosButton} onPress={handleSOSPress} activeOpacity={0.8}>
          <Text style={styles.sosButtonText}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  topLeftIcons: { position: 'absolute', top: 50, left: 20, zIndex: 1 },
  bellIconContainer: { position: 'relative' },
  badge: {
    position: 'absolute', top: -5, right: -10, backgroundColor: 'red',
    borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center'
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FF6B00', marginTop: 50, marginBottom: 10, textAlign: 'center' },
  welcome: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 3 },
  skeletonCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#666', marginBottom: 15 },
  button: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  topRightIcons: { position: 'absolute', top: 50, right: 20, flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  logoutText: { color: '#FF6B00', fontSize: 14 },
  sosContainer: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    zIndex: 100,
  },
  sosButton: {
    backgroundColor: '#D32F2F',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
