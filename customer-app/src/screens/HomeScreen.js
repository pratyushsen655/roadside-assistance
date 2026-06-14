/* eslint-disable no-console */
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Skeleton from '../components/Skeleton';
import { theme } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [address, setAddress] = useState('Fetching location...');

  const scrollRef = useRef(null);

  useEffect(() => {
    loadUser();

    // Fetch address using GPS
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
          if (geo) {
            const displayAddress = `${geo.name || geo.street || ''}, ${geo.city || geo.district || ''}`;
            setAddress(displayAddress || 'HSR Layout, Bengaluru');
          } else {
            setAddress('Connaught Place, New Delhi');
          }
        } else {
          setAddress('Enable location permissions');
        }
      } catch (err) {
        console.log('Error requesting location on mount:', err);
        setAddress('Connaught Place, New Delhi');
      }
    })();
  }, [navigation]);

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
      if (!data.success) {
        Alert.alert('Error', data.message || 'Failed to load profile');
      }
    } catch (error) {
      console.log('Error loading user:', error);
      Alert.alert('Error', 'Failed to reach server. Please check your network connection.');
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 800);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Header Skeleton */}
        <View style={styles.headerRow}>
          <Skeleton width={180} height={24} borderRadius={6} />
        </View>

        {/* Search Bar Skeleton */}
        <Skeleton width="100%" height={48} borderRadius={12} style={{ marginVertical: 20 }} />

        {/* Grid Skeleton */}
        <View style={styles.categoriesGrid}>
          <Skeleton width="48%" height={130} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton width="48%" height={130} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton width="48%" height={130} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton width="48%" height={130} borderRadius={16} style={{ marginBottom: 16 }} />
        </View>

        {/* Other Card Skeleton */}
        <Skeleton width="100%" height={100} borderRadius={16} style={{ marginTop: 4, marginBottom: 20 }} />

        {/* Bottom Bar Skeleton */}
        <View style={styles.skeletonBottomNav}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={50} height={50} borderRadius={25} />
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Scrollable Dashboard */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Header (Location selector) */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.locationContainer}
            onPress={() => navigation.navigate('AddressBook')}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={24} color="#E8192C" style={styles.locationIcon} />
            <Text style={styles.locationLabel} numberOfLines={1}>{address}</Text>
            <Ionicons name="chevron-down" size={16} color="#111827" style={styles.chevronIcon} />
          </TouchableOpacity>
        </View>

        {/* 2. Search Bar */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services, repairs, items..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>

        {/* 3. Vehicle Categories Grid */}
        <View style={styles.categoriesGrid}>
          {/* Card 1: Car */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('Request', { vehicleType: 'car', serviceType: 'other' })}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="car" size={64} color="#E8192C" style={styles.categoryIcon} />
            <Text style={styles.categoryCardText}>Car</Text>
          </TouchableOpacity>

          {/* Card 2: Bike */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('Request', { vehicleType: 'bike', serviceType: 'other' })}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="motorcycle" size={64} color="#E8192C" style={styles.categoryIcon} />
            <Text style={styles.categoryCardText}>Bike</Text>
          </TouchableOpacity>

          {/* Card 3: Auto */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('Request', { vehicleType: 'auto', serviceType: 'other' })}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="rickshaw" size={64} color="#E8192C" style={styles.categoryIcon} />
            <Text style={styles.categoryCardText}>Auto</Text>
          </TouchableOpacity>

          {/* Card 4: E-Vehicle */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('Request', { vehicleType: 'e-vehicle', serviceType: 'other' })}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="scooter-electric" size={64} color="#10B981" style={styles.categoryIcon} />
            <Text style={styles.categoryCardText}>E-Vehicle</Text>
          </TouchableOpacity>
        </View>

        {/* Card 5: Other */}
        <TouchableOpacity
          style={styles.otherCard}
          onPress={() => navigation.navigate('Request', { vehicleType: 'other', serviceType: 'other' })}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="view-grid" size={48} color="#E8192C" style={styles.categoryIcon} />
          <Text style={styles.categoryCardText}>Other</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* 8. Bottom Navigation Bar */}
      <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.bottomNavBar}>
        {/* Home */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        >
          <Ionicons name="home" size={24} color="#E8192C" />
          <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
        </TouchableOpacity>

        {/* Help */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Help')}
        >
          <Ionicons name="help-circle-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>Help</Text>
        </TouchableOpacity>

        {/* SOS - Center active trigger */}
        <TouchableOpacity
          style={styles.sosNavButton}
          onPress={() => navigation.navigate('SOS')}
          activeOpacity={0.85}
        >
          <View style={styles.sosNavCircle}>
            <Ionicons name="notifications" size={28} color="#FFF" />
          </View>
          <Text style={styles.sosNavText}>SOS</Text>
        </TouchableOpacity>



        {/* Account / Settings */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Account')}
        >
          <Ionicons name="person-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>Account</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    padding: theme.spacing.horizontalPadding,
    backgroundColor: theme.colors.white,
    paddingTop: 50,
  },
  scrollContent: {
    padding: theme.spacing.horizontalPadding,
    paddingTop: 50,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    maxWidth: '85%',
  },
  chevronIcon: {
    marginLeft: 6,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  categoryIcon: {
    marginBottom: 4,
  },
  categoryCardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 6,
  },
  otherCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    height: 75,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    paddingBottom: 10,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.18,
  },
  navText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavText: {
    color: '#E8192C',
    fontWeight: 'bold',
  },
  sosNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -15,
    width: width * 0.18,
  },
  sosNavCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8192C',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#E8192C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sosNavText: {
    fontSize: 10,
    color: '#E8192C',
    marginTop: 4,
    fontWeight: 'bold',
  },
  skeletonBottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    height: 75,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 10,
  }
});
