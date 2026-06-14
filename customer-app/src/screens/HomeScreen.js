/* eslint-disable no-console */
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Dimensions, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Skeleton from '../components/Skeleton';
import { theme } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('Fetching current location...');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState({
    name: 'Tata Nexon',
    image: require('../../assets/icon.png')
  });

  const scrollRef = useRef(null);

  useEffect(() => {
    loadUser();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUnreadCount();
    });
    fetchUnreadCount();

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
        console.log('Error requesting location/address on mount:', err);
        setAddress('Connaught Place, New Delhi');
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
      setTimeout(() => {
        setLoading(false);
      }, 800);
    }
  };

  const changeVehicle = () => {
    Alert.alert(
      'Select Active Vehicle',
      'Choose which car you are driving today:',
      [
        {
          text: 'Tata Nexon (SUV)',
          onPress: () => setSelectedVehicle({ name: 'Tata Nexon', image: require('../../assets/icon.png') })
        },
        {
          text: 'Maruti Swift (Hatch)',
          onPress: () => setSelectedVehicle({ name: 'Maruti Swift', image: require('../../assets/icon.png') })
        },
        {
          text: 'Honda City (Sedan)',
          onPress: () => setSelectedVehicle({ name: 'Honda City', image: require('../../assets/icon.png') })
        }
      ],
      { cancelable: true }
    );
  };

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
    setActiveSlide(slide);
  };

  const carouselItems = [
    {
      title: 'Car Service Starting at ₹1799/-',
      subtitle: 'Premium car servicing at authorized quality centers',
      badge: 'PROMO OFFER',
      bg: '#E8192C'
    },
    {
      title: 'Flat Tyre & Puncture Assist',
      subtitle: 'Quick support at home or on highway starting ₹349/-',
      badge: 'EMERGENCY',
      bg: '#333'
    },
    {
      title: 'Save up to ₹30,000 Annually',
      subtitle: 'Get roadside assistance + maintenance service packs',
      badge: 'SMART WARRANTY',
      bg: '#0B1B3D'
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Header Skeleton */}
        <View style={styles.headerRow}>
          <View>
            <Skeleton width={180} height={20} borderRadius={6} style={{ marginBottom: 8 }} />
            <Skeleton width={120} height={14} borderRadius={4} />
          </View>
          <Skeleton width={70} height={36} borderRadius={18} />
        </View>

        {/* Search Bar Skeleton */}
        <Skeleton width="100%" height={48} borderRadius={12} style={{ marginVertical: 20 }} />

        {/* Carousel Skeleton */}
        <Skeleton width="100%" height={160} borderRadius={16} style={{ marginBottom: 20 }} />

        {/* Badges Skeleton */}
        <View style={styles.rowBetween}>
          <Skeleton width={100} height={30} borderRadius={15} />
          <Skeleton width={100} height={30} borderRadius={15} />
          <Skeleton width={100} height={30} borderRadius={15} />
        </View>

        {/* Services Grid Skeleton */}
        <View style={[styles.rowBetween, { marginTop: 30 }]}>
          <Skeleton width="48%" height={120} borderRadius={16} />
          <Skeleton width="48%" height={120} borderRadius={16} />
        </View>
        <View style={[styles.rowBetween, { marginTop: 15 }]}>
          <Skeleton width="48%" height={120} borderRadius={16} />
          <Skeleton width="48%" height={120} borderRadius={16} />
        </View>

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
        {/* 1. Header (Location & Selected Vehicle Display) */}
        <View style={styles.headerRow}>
          {/* Location selector */}
          <TouchableOpacity
            style={styles.locationContainer}
            onPress={() => navigation.navigate('AddressBook')}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={22} color="#E8192C" style={styles.locationIcon} />
            <View>
              <Text style={styles.locationLabel}>Your Location</Text>
              <View style={styles.addressRow}>
                <Text style={styles.addressText} numberOfLines={1}>
                  {address}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#6B7280" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Right side with Bell badge & Vehicle display */}
          <View style={styles.headerRightSide}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.bellIconContainer}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.vehicleSelector}
              onPress={changeVehicle}
              activeOpacity={0.7}
            >
              <Image source={selectedVehicle.image} style={styles.vehicleImage} />
              <View style={styles.vehicleBadge}>
                <Text style={styles.vehicleBadgeText} numberOfLines={1}>{selectedVehicle.name}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Search Bar */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>

        {/* Welcome Message */}
        {user && (
          <Text style={styles.welcomeText}>
            Hello, <Text style={styles.boldText}>{user.name}</Text>!
          </Text>
        )}

        {/* 3. Hero Banner Carousel */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.carouselScroll}
          >
            {carouselItems.map((item, index) => (
              <View key={index} style={[styles.carouselCard, { backgroundColor: item.bg }]}>
                <View style={styles.carouselBadgeContainer}>
                  <Text style={styles.carouselBadgeText}>{item.badge}</Text>
                </View>
                <Text style={styles.carouselTitle}>{item.title}</Text>
                <Text style={styles.carouselSub}>{item.subtitle}</Text>
                <TouchableOpacity
                  style={styles.carouselButton}
                  onPress={() => navigation.navigate('Request', { serviceType: 'other', description: item.title })}
                >
                  <Text style={styles.carouselButtonText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          {/* Slide Indicator Dots */}
          <View style={styles.dotsRow}>
            {carouselItems.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  activeSlide === index ? styles.activeDot : styles.inactiveDot
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* 3 Trust Badges */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.trustBadgesRow}>
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#E8192C" />
            <Text style={styles.trustBadgeText}>Warranty</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="construct" size={16} color="#E8192C" />
            <Text style={styles.trustBadgeText}>Genuine Parts</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="car" size={18} color="#E8192C" />
            <Text style={styles.trustBadgeText}>Free Pick & Drop</Text>
          </View>
        </Animated.View>

        {/* 4. 2-Column Grid Service Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Main Services</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.grid2Column}>
          {/* Category 1: Car Services */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('Request', { serviceType: 'engine_repair', description: 'Standard Car Service' })}
            activeOpacity={0.8}
          >
            <View style={styles.categoryBadgeRed}>
              <Text style={styles.categoryBadgeText}>Heavy Discount</Text>
            </View>
            <View style={styles.categoryIconCircle}>
              <Ionicons name="car-sport" size={26} color="#E8192C" />
            </View>
            <Text style={styles.categoryCardTitle}>Car Services</Text>
          </TouchableOpacity>

          {/* Category 2: Denting & Painting */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('Request', { serviceType: 'other', description: 'Denting & Painting Services' })}
            activeOpacity={0.8}
          >
            <View style={styles.categoryBadgeGreen}>
              <Text style={styles.categoryBadgeText}>2 Years Warranty</Text>
            </View>
            <View style={styles.categoryIconCircle}>
              <Ionicons name="brush" size={26} color="#4F46E5" />
            </View>
            <Text style={styles.categoryCardTitle}>Denting & Painting</Text>
          </TouchableOpacity>

          {/* Category 3: AC Service & Repair */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('Request', { serviceType: 'other', description: 'Car AC Service & Repair' })}
            activeOpacity={0.8}
          >
            <View style={styles.categoryBadgeBlue}>
              <Text style={styles.categoryBadgeText}>Lowest Prices</Text>
            </View>
            <View style={styles.categoryIconCircle}>
              <Ionicons name="snow" size={26} color="#0EA5E9" />
            </View>
            <Text style={styles.categoryCardTitle}>AC Service & Repair</Text>
          </TouchableOpacity>

          {/* Category 4: Car Spa & Cleaning */}
          <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => navigation.navigate('Request', { serviceType: 'other', description: 'Car Spa & Deep Cleaning' })}
            activeOpacity={0.8}
          >
            <View style={styles.categoryBadgeOrange}>
              <Text style={styles.categoryBadgeText}>Starting from 99/-</Text>
            </View>
            <View style={styles.categoryIconCircle}>
              <Ionicons name="sparkles" size={26} color="#F59E0B" />
            </View>
            <Text style={styles.categoryCardTitle}>Car Spa & Cleaning</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* 5. First 4-Column Icon Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Car Care & Repairs</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.grid4Column}>
          {/* Detailing */}
          <TouchableOpacity
            style={styles.gridItem4}
            onPress={() => navigation.navigate('Request', { serviceType: 'other', description: 'Premium Car Detailing' })}
          >
            <View style={styles.gridItemCircle}>
              <MaterialCommunityIcons name="car-wash" size={24} color="#374151" />
            </View>
            <Text style={styles.gridItemLabel}>Detailing</Text>
          </TouchableOpacity>

          {/* Batteries */}
          <TouchableOpacity
            style={styles.gridItem4}
            onPress={() => navigation.navigate('Request', { serviceType: 'battery', description: 'Battery Jumpstart / Replacement' })}
          >
            <View style={styles.gridItemCircle}>
              <Ionicons name="flash" size={24} color="#374151" />
            </View>
            <Text style={styles.gridItemLabel}>Batteries</Text>
          </TouchableOpacity>

          {/* Tyres & Wheel Care */}
          <TouchableOpacity
            style={styles.gridItem4}
            onPress={() => navigation.navigate('Request', { serviceType: 'tire_repair', description: 'Tyre Repair or Wheel Alignment' })}
          >
            <View style={styles.gridItemCircle}>
              <MaterialCommunityIcons name="car-tire-alert" size={24} color="#374151" />
            </View>
            <Text style={styles.gridItemLabel}>Tyres & Wheel</Text>
          </TouchableOpacity>

          {/* Car Inspections with 'At Your Home' badge */}
          <TouchableOpacity
            style={styles.gridItem4}
            onPress={() => navigation.navigate('Request', { serviceType: 'other', description: 'Car Diagnostics & Inspection' })}
          >
            <View style={styles.gridMiniBadge}>
              <Text style={styles.gridMiniBadgeText}>At Your Home</Text>
            </View>
            <View style={styles.gridItemCircle}>
              <Ionicons name="clipboard" size={24} color="#374151" />
            </View>
            <Text style={styles.gridItemLabel}>Inspections</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* 6. Second 4-Column Icon Grid */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={[styles.grid4Column, { marginTop: 10 }]}>
          {/* Clutch & Body Parts */}
          <TouchableOpacity
            style={styles.gridItem4}
            onPress={() => navigation.navigate('Request', { serviceType: 'other', description: 'Clutch or Body Parts replacement' })}
          >
            <View style={styles.gridItemCircle}>
              <Ionicons name="cog" size={24} color="#374151" />
            </View>
            <Text style={styles.gridItemLabel}>Clutch & Body</Text>
          </TouchableOpacity>

          {/* Windshield & Lights */}
          <TouchableOpacity
            style={styles.gridItem4}
            onPress={() => navigation.navigate('Request', { serviceType: 'other', description: 'Windshield glass or Light bulb replacement' })}
          >
            <View style={styles.gridItemCircle}>
              <Ionicons name="bulb" size={24} color="#374151" />
            </View>
            <Text style={styles.gridItemLabel}>Windshield</Text>
          </TouchableOpacity>

          {/* Suspension & Fitments with Free Inspection badge */}
          <TouchableOpacity
            style={styles.gridItem4}
            onPress={() => navigation.navigate('Request', { serviceType: 'other', description: 'Suspension diagnostics and Fitments check' })}
          >
            <View style={styles.gridMiniBadgeGreen}>
              <Text style={styles.gridMiniBadgeText}>Free Inspect</Text>
            </View>
            <View style={styles.gridItemCircle}>
              <Ionicons name="build" size={24} color="#374151" />
            </View>
            <Text style={styles.gridItemLabel}>Suspension</Text>
          </TouchableOpacity>

          {/* Insurance Claims with Cashless Claims badge */}
          <TouchableOpacity
            style={styles.gridItem4}
            onPress={() => navigation.navigate('Request', { serviceType: 'other', description: 'Insurance claim assessment request' })}
          >
            <View style={styles.gridMiniBadgeBlue}>
              <Text style={styles.gridMiniBadgeText}>Cashless</Text>
            </View>
            <View style={styles.gridItemCircle}>
              <Ionicons name="document-text" size={24} color="#374151" />
            </View>
            <Text style={styles.gridItemLabel}>Insurance</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* 7. Bottom Banner Cards */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)} style={styles.bottomBannersContainer}>
          {/* Miles Card (Free Road Side Assistance, red background) */}
          <TouchableOpacity
            style={[styles.bottomCard, { backgroundColor: '#E8192C' }]}
            onPress={handleSOSPress}
            activeOpacity={0.9}
          >
            <View style={styles.bottomCardTextContainer}>
              <Text style={styles.bottomCardTitle}>MILES</Text>
              <Text style={styles.bottomCardSubtitle}>Free Road Side Assistance</Text>
              <View style={styles.bottomCardBtn}>
                <Text style={[styles.bottomCardBtnText, { color: '#E8192C' }]}>Activate Now</Text>
              </View>
            </View>
            <FontAwesome5 name="road" size={45} color="rgba(255,255,255,0.25)" style={styles.bottomCardBgIcon} />
          </TouchableOpacity>

          {/* Warranty Card (Save ₹30000 Annually, dark blue background with robot icon) */}
          <TouchableOpacity
            style={[styles.bottomCard, { backgroundColor: '#0B1B3D' }]}
            onPress={() => {
              Alert.alert(
                'Annual Smart Care Warranty',
                'Save over ₹30,000 annually. Enjoy unlimited free towing, engine diagnostics, and priority scheduling. Subscribe for just ₹99/month!',
                [{ text: 'Learn More' }, { text: 'Cancel', style: 'cancel' }]
              );
            }}
            activeOpacity={0.9}
          >
            <View style={styles.bottomCardTextContainer}>
              <Text style={styles.bottomCardTitle}>WARRANTY</Text>
              <Text style={styles.bottomCardSubtitle}>Save ₹30000 Annually</Text>
              <View style={[styles.bottomCardBtn, { backgroundColor: '#4F46E5' }]}>
                <Text style={styles.bottomCardBtnText}>View Packages</Text>
              </View>
            </View>
            <View style={styles.robotContainer}>
              <Text style={styles.robotEmoji}>🤖</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
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
          onPress={handleSOSPress}
          activeOpacity={0.85}
        >
          <View style={styles.sosNavCircle}>
            <Ionicons name="notifications" size={28} color="#FFF" />
          </View>
          <Text style={styles.sosNavText}>SOS</Text>
        </TouchableOpacity>

        {/* GoStore */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {
            Alert.alert(
              'GoStore Marketplace',
              'Buy genuine spare parts, premium engine oils, high-quality car mats, and detailing accessories. Coming soon in next update!',
              [{ text: 'Notify Me' }, { text: 'Cancel', style: 'cancel' }]
            );
          }}
        >
          <Ionicons name="basket-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>GoStore</Text>
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
  bellIconContainer: {
    position: 'relative',
    padding: 4,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E8192C',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
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
    paddingBottom: 110, // clear bottom navigation bar
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginRight: 10,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    maxWidth: width * 0.45,
    marginRight: 4,
  },
  vehicleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: width * 0.38,
  },
  vehicleImage: {
    width: 32,
    height: 24,
    resizeMode: 'contain',
    marginRight: 6,
  },
  vehicleBadge: {
    flex: 1,
  },
  vehicleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
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
  welcomeText: {
    fontSize: 18,
    color: '#374151',
    marginVertical: 10,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#111827',
  },
  carouselContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  carouselScroll: {
    gap: 12,
  },
  carouselCard: {
    width: width - 40,
    borderRadius: 16,
    padding: 20,
    height: 160,
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  carouselBadgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  carouselBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  carouselTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  carouselSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
  },
  carouselButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  carouselButtonText: {
    color: '#E8192C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#E8192C',
    width: 12,
  },
  inactiveDot: {
    backgroundColor: '#D1D5DB',
  },
  trustBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  grid2Column: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    paddingTop: 24,
    alignItems: 'center',
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  categoryBadgeRed: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#E8192C',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryBadgeGreen: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryBadgeBlue: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryBadgeOrange: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  grid4Column: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  gridItem4: {
    width: '23.5%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  gridMiniBadge: {
    position: 'absolute',
    top: -6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 1,
  },
  gridMiniBadgeGreen: {
    position: 'absolute',
    top: -6,
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 1,
  },
  gridMiniBadgeBlue: {
    position: 'absolute',
    top: -6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 1,
  },
  gridMiniBadgeText: {
    color: '#FFF',
    fontSize: 6.5,
    fontWeight: 'bold',
  },
  gridItemCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridItemLabel: {
    fontSize: 9,
    color: '#4B5563',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomBannersContainer: {
    marginTop: 24,
    gap: 15,
  },
  bottomCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    height: 110,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomCardTextContainer: {
    flex: 1,
    zIndex: 1,
  },
  bottomCardTitle: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  bottomCardSubtitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    marginVertical: 4,
  },
  bottomCardBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  bottomCardBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomCardBgIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    transform: [{ rotate: '-15deg' }],
  },
  robotContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  robotEmoji: {
    fontSize: 32,
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
    top: -15, // float effect
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
