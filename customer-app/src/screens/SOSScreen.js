import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, Vibration, Dimensions, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import GlobalBottomNav from '../components/GlobalBottomNav';

const { height, width } = Dimensions.get('window');

export default function SOSScreen({ navigation }) {
  const { t } = useTranslation();
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.2090);
  const [address, setAddress] = useState('Fetching your location...');
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  // Fetch current address/location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync().catch(err => {
          console.log('[SOSScreen] requestForegroundPermissionsAsync error:', err);
          return { status: 'denied' };
        });
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(err => {
            console.log('[SOSScreen] getCurrentPositionAsync error:', err);
            return null;
          });
          
          if (loc && loc.coords) {
            setLatitude(loc.coords.latitude || 28.6139);
            setLongitude(loc.coords.longitude || 77.2090);
            
            const geo = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            }).catch(err => {
              console.log('[SOSScreen] reverseGeocodeAsync error:', err);
              return [];
            });
            
            if (geo && geo.length > 0) {
              const place = geo[0];
              const displayAddress = `${place.name || place.street || ''}, ${place.city || place.district || ''}`;
              setAddress(displayAddress.trim() || 'HSR Layout, Bengaluru');
            } else {
              setAddress('HSR Layout, Bengaluru');
            }

            // Center map on user location
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: loc.coords.latitude || 28.6139,
                longitude: loc.coords.longitude || 77.2090,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 1000);
            }
          } else {
            setAddress(t('request.locationDenied', 'Unable to fetch location. Please share manually.'));
          }
        } else {
          setAddress(t('request.locationDenied', 'Unable to fetch location. Please share manually.'));
        }
      } catch (err) {
        console.log('Error fetching current address:', err);
        setAddress('HSR Layout, Bengaluru');
      }
    })();
  }, []);

  const handleLocateMe = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(err => {
        console.log('[SOSScreen] getCurrentPositionAsync locateMe error:', err);
        return null;
      });
      if (loc && loc.coords) {
        setLatitude(loc.coords.latitude || 28.6139);
        setLongitude(loc.coords.longitude || 77.2090);
        
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: loc.coords.latitude || 28.6139,
            longitude: loc.coords.longitude || 77.2090,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 800);
        }
      }
    } catch (err) {
      console.log('Locate me failed:', err);
    }
  };

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';

  const services = [
    { label: t('services.tyrePuncture', 'Tyre\nPuncture'), value: 'tire_repair', icon: 'car-tire-alert', library: 'MaterialCommunityIcons', bg: '#FFF0F0', iconColor: '#E8192C' },
    { label: t('services.fuelAssistance', 'Fuel\nAssistance'), value: 'fuel_delivery', icon: 'gas-station', library: 'MaterialCommunityIcons', bg: '#FFF7ED', iconColor: '#F97316' },
    { label: t('services.batteryJumpstart', 'Battery\nJumpstart'), value: 'battery', icon: 'flash', library: 'Ionicons', bg: '#FEF08A', iconColor: '#CA8A04' },
    { label: t('services.carFluidLeakage', 'Car Fluid\nLeakage'), value: 'other', icon: 'water', library: 'Ionicons', bg: '#ECFDF5', iconColor: '#059669' },
    { label: t('services.carEngineScanning', 'Car Engine\nScanning'), value: 'engine_repair', icon: 'engine-outline', library: 'MaterialCommunityIcons', bg: '#EEF2F6', iconColor: '#4B5563' },
    { label: t('services.wheelLiftTow', 'Wheel-Lift\nTow (20 Kms)'), value: 'towing', icon: 'truck', library: 'FontAwesome5', bg: '#EEF2FF', iconColor: '#4F46E5' },
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
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert(t('common.error', 'Error'), t('request.loginToUseSos', 'Please log in to use SOS'));
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
          lat: latitude || 28.6139,
          lng: longitude || 77.2090,
          serviceType: service.value,
          description: `SOS: ${service.label.replace('\n', ' ')}`
        })
      });

      if (response.status === 401) {
        Alert.alert(t('auth.sessionExpired', 'Session Expired'), t('auth.loginAgain', 'Your session has expired. Please login again.'));
        await AsyncStorage.multiRemove(['token', 'user', 'tokenStoredAt']);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      if (response.ok) {
        const data = await response.json();
        Alert.alert(t('request.sosBroadcasting', 'SOS Broadcasting 🚨'), t('request.sosSentMsg', 'Emergency request for {{service}} has been sent!', { service: service.label.replace('\n', ' ') }));
        navigation.navigate('SOSConfirmation', { sosId: data._id, lat: latitude || 28.6139, lng: longitude || 77.2090 });
      } else {
        const data = await response.json();
        Alert.alert(t('request.sosFailed', 'SOS Failed'), data.message || t('common.error', 'Something went wrong.'));
      }
    } catch (err) {
      console.log('Error triggering SOS:', err);
      Alert.alert(t('request.sosFailed', 'SOS Failed'), t('common.serverError', 'Cannot connect to server.'));
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
          {address === 'Fetching your location...' ? t('request.fetchingLocation', 'Fetching your location...') : address}
        </Text>
      </View>

      {/* 2. Map Section with Floating Buttons */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: latitude || 28.6139,
            longitude: longitude || 77.2090,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Marker coordinate={{ latitude: latitude || 28.6139, longitude: longitude || 77.2090 }}>
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
        <Text style={styles.servicesTitle}>{t('request.chooseEmergencyService', 'Choose your Emergency Service')}</Text>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#E8192C" />
            <Text style={styles.loaderText}>{t('request.broadcastingEmergencySignal', 'Broadcasting Emergency Signal...')}</Text>
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
          <Text style={styles.assistedText}>{t('request.customersAssisted', '465 Customers Assisted Today')}</Text>
          <View style={styles.assistedLine} />
        </View>
      </View>

      {/* 4. Bottom Navigation Bar */}
      <GlobalBottomNav />
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    height: 85,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    paddingBottom: 20,
    paddingTop: 10,
    borderRadius: 20,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.16,
  },
  activeNavIcon: {
    marginBottom: -2,
  },
  navText: {
    fontSize: 11,
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
    width: width * 0.16,
  },
  sosNavCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  sosNavText: {
    fontSize: 12,
    color: '#1E3A8A',
    marginTop: 4,
    fontWeight: '600',
  }
});
