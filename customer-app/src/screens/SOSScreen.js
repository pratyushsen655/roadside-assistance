import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Vibration, Dimensions, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

export default function SOSScreen({ navigation }) {
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.2090);
  const [address, setAddress] = useState('Fetching your location...');
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  // Fetch current address/location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLatitude(loc.coords.latitude);
          setLongitude(loc.coords.longitude);
          
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
          if (geo) {
            const displayAddress = `${geo.name || geo.street || ''}, ${geo.city || geo.district || ''}`;
            setAddress(displayAddress || 'HSR Layout, Bengaluru');
          } else {
            setAddress('HSR Layout, Bengaluru');
          }

          // Center map on user location
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 1000);
          }
        } else {
          setAddress('Location permission denied');
        }
      } catch (err) {
        console.log('Error fetching current address:', err);
        setAddress('HSR Layout, Bengaluru');
      }
    })();
  }, []);

  const handleLocateMe = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
          }, 800);
      }
    } catch (err) {
      console.log('Locate me failed:', err);
    }
  };

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';

  const services = [
    { label: 'Tyre\nPuncture', value: 'tire_repair', icon: 'car-tire-alert', library: 'MaterialCommunityIcons', bg: '#FFF0F0', iconColor: '#E8192C' },
    { label: 'Fuel\nAssistance', value: 'fuel_delivery', icon: 'gas-station', library: 'MaterialCommunityIcons', bg: '#FFF7ED', iconColor: '#F97316' },
    { label: 'Battery\nJumpstart', value: 'battery', icon: 'flash', library: 'Ionicons', bg: '#FEF08A', iconColor: '#CA8A04' },
    { label: 'Car Fluid\nLeakage', value: 'other', icon: 'water', library: 'Ionicons', bg: '#ECFDF5', iconColor: '#059669' },
    { label: 'Car Engine\nScanning', value: 'engine_repair', icon: 'engine-outline', library: 'MaterialCommunityIcons', bg: '#EEF2F6', iconColor: '#4B5563' },
    { label: 'Wheel-Lift\nTow (20 Kms)', value: 'towing', icon: 'truck', library: 'FontAwesome5', bg: '#EEF2FF', iconColor: '#4F46E5' },
  ];

  const renderServiceIcon = (service) => {
    const size = 26;
    if (service.library === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={service.icon} size={size} color={service.iconColor} />;
    } else if (service.library === 'FontAwesome5') {
      return <FontAwesome5 name={service.icon} size={22} color={service.iconColor} />;
    } else {
      return <Ionicons name={service.icon} size={size} color={service.iconColor} />;
    }
  };

  const handleServiceSelect = async (service) => {
    Vibration.vibrate([0, 200, 100, 200]);
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in to use SOS');
        navigation.replace('Login');
        return;
      }

      const response = await fetch(`${API_URL}/api/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lat: latitude,
          lng: longitude,
          serviceType: service.value,
          description: `SOS: ${service.label.replace('\n', ' ')}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('SOS Broadcasting 🚨', `Emergency request for ${service.label.replace('\n', ' ')} has been sent!`);
        navigation.navigate('SOSConfirmation', { sosId: data._id, lat: latitude, lng: longitude });
      } else {
        const data = await response.json();
        Alert.alert('SOS Failed', data.message || 'Something went wrong.');
      }
    } catch (err) {
      console.log('Error triggering SOS:', err);
      Alert.alert('SOS Failed', 'Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 1. Top Location Bar */}
      <View style={styles.locationBar}>
        <Ionicons name="location-sharp" size={18} color="#1F2937" style={{ marginRight: 6 }} />
        <Text style={styles.locationText} numberOfLines={1}>
          {address}
        </Text>
      </View>

      {/* 2. Map Section with Floating Buttons */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: latitude,
            longitude: longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Marker coordinate={{ latitude, longitude }}>
            <View style={styles.markerContainer}>
              <View style={styles.markerPin} />
            </View>
          </Marker>
        </MapView>

        {/* Floating Back Button */}
        <TouchableOpacity
          style={styles.mapFloatBtnLeft}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>

        {/* Floating Locate Me Button */}
        <TouchableOpacity
          style={styles.mapFloatBtnRight}
          onPress={handleLocateMe}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={22} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* 3. Emergency Services List */}
      <View style={styles.servicesContainer}>
        <Text style={styles.servicesTitle}>Choose your Emergency Service</Text>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#E8192C" />
            <Text style={styles.loaderText}>Broadcasting Emergency Signal...</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {services.map((service, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                onPress={() => handleServiceSelect(service)}
                activeOpacity={0.85}
              >
                <View style={[styles.iconContainer, { backgroundColor: service.bg }]}>
                  {renderServiceIcon(service)}
                </View>
                <Text style={styles.cardLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={[styles.dot, styles.inactiveDot]} />
          <View style={[styles.dot, styles.inactiveDot]} />
        </View>

        {/* Assisted Label */}
        <View style={styles.assistedContainer}>
          <View style={styles.assistedLine} />
          <Text style={styles.assistedText}>465 Customers Assisted Today</Text>
          <View style={styles.assistedLine} />
        </View>
      </View>

      {/* 4. Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        {/* Home */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        {/* Help */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Help')}
        >
          <Ionicons name="help-circle-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>Help</Text>
        </TouchableOpacity>

        {/* SOS - Active Siren */}
        <TouchableOpacity
          style={styles.sosNavButton}
          activeOpacity={1}
        >
          <View style={styles.sosNavCircle}>
            <Ionicons name="notifications" size={28} color="#FFF" />
          </View>
          <Text style={[styles.navText, styles.activeNavText]}>SOS</Text>
        </TouchableOpacity>



        {/* Account / Settings */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Account')}
        >
          <Ionicons name="person-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: 40,
  },
  locationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  mapContainer: {
    height: height * 0.35,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(31, 41, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1F2937',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  mapFloatBtnLeft: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  mapFloatBtnRight: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  servicesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  servicesTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 24,
  },
  card: {
    width: '30%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 25,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: '#E8192C',
    width: 14,
  },
  inactiveDot: {
    backgroundColor: '#D1D5DB',
  },
  assistedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    gap: 10,
  },
  assistedLine: {
    height: 1,
    backgroundColor: '#86EFAC',
    width: 30,
  },
  assistedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loaderText: {
    fontSize: 14,
    color: '#E8192C',
    fontWeight: '700',
    marginTop: 15,
  },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  activeNavText: {
    color: '#E8192C',
  },
  sosNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    flex: 1,
  },
  sosNavCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8192C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E8192C',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
