/* eslint-disable no-console */
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, Alert, Image, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

import Skeleton from '../components/Skeleton';
import { theme } from '../constants/theme';
import GlobalBottomNav from '../components/GlobalBottomNav';
import LocationSelectorBar from '../components/LocationSelectorBar';

const { width } = Dimensions.get('window');

const NAV_BAR_HEIGHT = 60;

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [greeting, setGreeting] = useState('');
  const [currentLocation, setCurrentLocation] = useState('Fetching location...');
  const [coordinates, setCoordinates] = useState(null);

  // Compute greeting based on current hour
  const computeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t('home.goodMorning', 'Good Morning 👋').replace(' 👋', '');
    if (hour >= 12 && hour < 17) return t('home.goodAfternoon', 'Good Afternoon');
    if (hour >= 17 && hour < 21) return t('home.goodEvening', 'Good Evening');
    return t('home.goodNight', 'Good Night');
  };

  // Update greeting whenever the screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      setGreeting(computeGreeting());
    }, [t])
  );

  const scrollRef = useRef(null);

  const reverseGeocodeWithGoogle = async (lat, lng) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
        return null;
      }
      
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=en&region=in`
      );
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        const components = data.results[0].address_components;
        
        const sublocality = components.find(c => 
          c.types.includes('sublocality_level_1') || 
          c.types.includes('sublocality')
        )?.long_name;
        
        const locality = components.find(c => 
          c.types.includes('locality')
        )?.long_name;
        
        const area = sublocality || locality || 'Current Location';
        const city = locality || '';
        
        if (city && area !== city) {
          return `${area}, ${city}`;
        }
        return area;
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentLocation(t('request.locationDenied', 'Location permission denied'));
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      setCoordinates({ lat: latitude, lng: longitude });

      const googleLocation = await reverseGeocodeWithGoogle(latitude, longitude);
      if (googleLocation) {
        setCurrentLocation(googleLocation);
        await AsyncStorage.setItem('lastLocation', JSON.stringify({
          name: googleLocation,
          lat: latitude,
          lng: longitude,
          timestamp: Date.now(),
        }));
        return;
      }

      const geocode = await Location.reverseGeocodeAsync(
        { latitude, longitude },
        { useGoogleMaps: false }
      );

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        
        const parts = [];
        const specificArea = place.subregion || place.street || place.district;
        if (specificArea) parts.push(specificArea);
        
        const cityName = place.city || place.region;
        if (cityName && cityName !== specificArea) parts.push(cityName);
        
        const cleanLocation = parts.length > 0 
          ? parts.join(', ') 
          : place.formattedAddress || t('request.currentLocation', 'Current Location');
        
        setCurrentLocation(cleanLocation);
        
        await AsyncStorage.setItem('lastLocation', JSON.stringify({
          name: cleanLocation,
          lat: latitude,
          lng: longitude,
          timestamp: Date.now(),
        }));
      } else {
        setCurrentLocation(t('request.currentLocation', 'Current Location'));
      }
    } catch (error) {
      console.log('Location error:', error);
      setCurrentLocation(t('request.locationError', 'Unable to fetch location'));
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    loadUser();

    (async () => {
      const cached = await AsyncStorage.getItem('lastLocation');
      if (cached) {
        const { name, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          setCurrentLocation(name);
        }
      }
      fetchCurrentLocation();
    })();
  }, [navigation]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) {
        Alert.alert(t('auth.sessionExpired', 'Session Expired'), t('auth.loginAgain', 'Please login again to continue.'));
        await AsyncStorage.multiRemove(['userToken', 'userData', 'tokenStoredAt', 'token', 'user']);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      const data = await response.json();
      if (!data.success) {
        Alert.alert(t('common.error', 'Error'), data.message || t('common.error', 'Failed to load profile'));
      }
    } catch (error) {
      console.log('Error loading user:', error);
      Alert.alert(t('common.error', 'Error'), t('common.serverError', 'Failed to reach server. Please check your network connection.'));
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 800);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.headerRow}>
          <Skeleton width={180} height={24} borderRadius={6} />
        </View>
        <Skeleton width="100%" height={48} borderRadius={12} style={{ marginVertical: 20 }} />
        <View style={styles.categoriesGrid}>
          <Skeleton width="48%" height={130} borderRadius={16} style={{ marginBottom: 16 }} />
          <Skeleton width="48%" height={130} borderRadius={16} style={{ marginBottom: 16 }} />
        </View>
        <Skeleton width="100%" height={100} borderRadius={16} style={{ marginTop: 4, marginBottom: 20 }} />
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LocationSelectorBar currentLocation={currentLocation} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Header (Greeting and Subtitle) */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText}>{greeting} 👋</Text>
            <Text style={styles.subtitleText}>{t('home.subtitle', 'How can we help with\nyour vehicle today?')}</Text>
          </View>
        </View>

        {/* 2. Search Bar */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('home.searchPlaceholder', 'Search services, repairs, items...')}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterIconBtn}>
            <Ionicons name="options-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </Animated.View>



        {/* 4. Vehicle Categories Grid */}
        <View style={styles.categoriesGrid}>
          {/* Card 1: Car */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('CarServiceRates')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 48, marginRight: 12 }}>🚗</Text>
              <View style={styles.cardTextContainer}>
                <Text style={styles.categoryCardText}>{t('vehicle.car', 'Car')}</Text>
                <Text style={styles.categorySubText}>{t('vehicle.repairServices', 'Repair & Services')}</Text>
              </View>
            </View>
            <View style={styles.chevronWrapper}>
              <Ionicons name="chevron-forward" size={16} color="#E8192C" />
            </View>
          </TouchableOpacity>

          {/* Card 2: Bike */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('BikeServiceRates')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 48, marginRight: 12 }}>🏍️</Text>
              <View style={styles.cardTextContainer}>
                <Text style={styles.categoryCardText}>{t('vehicle.bike', 'Bike')}</Text>
                <Text style={styles.categorySubText}>{t('vehicle.repairServices', 'Repair & Services')}</Text>
              </View>
            </View>
            <View style={styles.chevronWrapper}>
              <Ionicons name="chevron-forward" size={16} color="#E8192C" />
            </View>
          </TouchableOpacity>

          {/* Card 3: Auto */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('CarServiceRates')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 48, marginRight: 12 }}>🛺</Text>
              <View style={styles.cardTextContainer}>
                <Text style={styles.categoryCardText}>{t('vehicle.auto', 'Auto')}</Text>
                <Text style={styles.categorySubText}>{t('vehicle.repairServices', 'Repair & Services')}</Text>
              </View>
            </View>
            <View style={styles.chevronWrapper}>
              <Ionicons name="chevron-forward" size={16} color="#E8192C" />
            </View>
          </TouchableOpacity>

          {/* Card 4: E-Vehicle */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('CarServiceRates')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <Text style={{ fontSize: 48, marginRight: 12 }}>⚡</Text>
              <View style={styles.cardTextContainer}>
                <Text style={styles.categoryCardText}>{t('vehicle.eVehicle', 'E-Vehicle')}</Text>
                <Text style={styles.categorySubText}>{t('vehicle.repairServices', 'Repair & Services')}</Text>
              </View>
            </View>
            <View style={styles.chevronWrapper}>
              <Ionicons name="chevron-forward" size={16} color="#10B981" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. Other Card */}
        <TouchableOpacity
          style={styles.otherCard}
          onPress={() => navigation.navigate('CarServiceRates')}
          activeOpacity={0.8}
        >
          <View style={styles.otherCardContent}>
            <Text style={{ fontSize: 48, marginRight: 12 }}>🔧</Text>
            <View style={styles.otherCardTextContainer}>
              <Text style={styles.otherCardTitle}>{t('vehicle.other', 'Other')}</Text>
              <Text style={styles.otherCardSub}>{t('vehicle.exploreMore', 'Explore more services')}</Text>
            </View>
          </View>
          <View style={[styles.chevronWrapper, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="chevron-forward" size={16} color="#374151" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Global Bottom Navigation Bar */}
      <GlobalBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, padding: 20, backgroundColor: '#FFF', paddingTop: 50 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerLeft: { flex: 1, paddingRight: 10 },
  greetingText: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subtitleText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8, width: '48%', justifyContent: 'flex-end' },
  locationPin: { fontSize: 18, color: '#B34700' },
  locationTextContainer: { flex: 1 },
  locationMain: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.2 },
  locationSub: { fontSize: 12, color: '#888', marginTop: 1 },
  locationChevron: { fontSize: 18, color: '#B34700', fontWeight: '700' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, height: 50, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  filterIconBtn: { padding: 4 },
  bannerContainer: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  bannerTextContent: { flex: 1 },
  bannerTitle: { fontSize: 15, color: '#1F2937', fontWeight: '700' },
  bannerTitleBold: { fontSize: 15, color: '#E8192C', fontWeight: '800', marginBottom: 8 },
  bannerDesc: { fontSize: 11, color: '#4B5563', lineHeight: 16 },
  dotsContainer: { flexDirection: 'row', marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB', marginRight: 4 },
  activeDot: { backgroundColor: '#E8192C', width: 14 },
  bannerImagePlaceholder: { width: 100, height: 70, justifyContent: 'center', alignItems: 'flex-end' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTextContainer: { flex: 1 },
  categoryCardText: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
  categorySubText: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  chevronWrapper: { alignSelf: 'flex-end', backgroundColor: '#FEF2F2', padding: 4, borderRadius: 12 },
  otherCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  otherCardContent: { flexDirection: 'row', alignItems: 'center' },
  otherCardTextContainer: { marginLeft: 12 },
  otherCardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
  otherCardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  whyChooseContainer: { marginBottom: 30 },
  whyChooseTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  featuresRow: { flexDirection: 'row', justifyContent: 'space-between' },
  featureItem: { alignItems: 'center', flex: 1 },
  featureIconContainer: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  featureText: { fontSize: 11, color: '#374151', textAlign: 'center', fontWeight: '500', lineHeight: 14 },
  bottomNavBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 10, paddingTop: 10 },
  navTab: { alignItems: 'center', justifyContent: 'center', width: width * 0.16 },
  activeNavIcon: { marginBottom: -2 },
  navText: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  activeNavText: { color: '#E8192C', fontWeight: 'bold' },
  sosNavButton: { alignItems: 'center', justifyContent: 'center', width: width * 0.16 },
  sosNavCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, borderWidth: 4, borderColor: '#FFF' },
  sosNavText: { fontSize: 12, color: '#1E3A8A', marginTop: 4, fontWeight: '600' },
  skeletonBottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', position: 'absolute', bottom: 0, height: 80, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: 8 }
});
