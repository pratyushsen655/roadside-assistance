import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getSocket } from '../config/socket';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';

export default function RequestScreen({ navigation, route }) {
  const [serviceType, setServiceType] = useState('tire_repair');
  const [description, setDescription] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Current Location');
  const [vehicleType, setVehicleType] = useState('car');
  const [vehicleModelInput, setVehicleModelInput] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [waitingForMechanic, setWaitingForMechanic] = useState(false);
  const [jobId, setJobId] = useState(null);
  const { token } = useContext(AuthContext);

  // Bidding System State
  const [initialPrice, setInitialPrice] = useState('350');
  const [currentBiddingPrice, setCurrentBiddingPrice] = useState(350);
  const [countdown, setCountdown] = useState(120);
  const [showBidModal, setShowBidModal] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [autoPromptDelay, setAutoPromptDelay] = useState(120);
  const [maxPriceIncrease, setMaxPriceIncrease] = useState(1000);
  const countdownIntervalRef = useRef(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.2090);

  // Fetch current address/location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setCustomerAddress('Fetching address...');
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLatitude(loc.coords.latitude);
          setLongitude(loc.coords.longitude);
          
          if (!route.params?.selectedAddress) {
            const [geo] = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
            if (geo) {
              const displayAddress = `${geo.name || geo.street || ''}, ${geo.city || geo.district || ''}`;
              setCustomerAddress(displayAddress || 'HSR Layout, Bengaluru');
            } else {
              setCustomerAddress('HSR Layout, Bengaluru');
            }
          }
        } else {
          Alert.alert('Permission Denied', 'Please enable location permissions to locate you automatically.');
        }
      } catch (err) {
        console.log('Error fetching current address:', err);
        setCustomerAddress('HSR Layout, Bengaluru');
      }
    })();
  }, []);

  // Update address & geocode if a saved address is selected
  useEffect(() => {
    if (route.params?.selectedAddress) {
      setCustomerAddress(route.params.selectedAddress);
      
      (async () => {
        try {
          const geocoded = await Location.geocodeAsync(route.params.selectedAddress);
          if (geocoded && geocoded.length > 0) {
            setLatitude(geocoded[0].latitude);
            setLongitude(geocoded[0].longitude);
          }
        } catch (err) {
          console.log('Error geocoding selected address:', err);
        }
      })();
    }
    if (route.params?.serviceType) {
      setServiceType(route.params.serviceType);
    }
    if (route.params?.description) {
      setDescription(route.params.description);
    }
    if (route.params?.vehicleType) {
      setVehicleType(route.params.vehicleType);
    }
  }, [route.params?.selectedAddress, route.params?.serviceType, route.params?.description, route.params?.vehicleType]);

  useEffect(() => {
    if (waitingForMechanic) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [waitingForMechanic]);

  // Handle countdown timer for bidding prompt
  useEffect(() => {
    if (waitingForMechanic && jobId) {
      // Fetch current configuration delay
      fetch(`${API_URL}/api/requests/bidding-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          const delay = Number(data.settings.autoPromptDelay) || 120;
          setAutoPromptDelay(delay);
          setMaxPriceIncrease(Number(data.settings.maxPriceIncrease) || 1000);
          setCountdown(delay);
        }
      })
      .catch(err => console.log('Error fetching bidding settings:', err));

      setCountdown(autoPromptDelay);
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            setShowBidModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(countdownIntervalRef.current);
      setShowBidModal(false);
    }

    return () => clearInterval(countdownIntervalRef.current);
  }, [waitingForMechanic, jobId]);

  useEffect(() => {
    return () => {
      if (token) {
        const socket = getSocket(token);
        if (socket) {
          socket.off('job:accepted:notify');
          socket.off('request:price_updated');
        }
      }
    };
  }, [token]);

  const services = [
    { label: 'Flat/Puncture Repair', value: 'tire_repair', icon: 'car-tire-alert', library: 'MaterialCommunityIcons' },
    { label: 'Towing', value: 'towing', icon: 'truck', library: 'FontAwesome5' },
    { label: 'Fuel Delivery', value: 'fuel_delivery', icon: 'gas-station', library: 'MaterialCommunityIcons' },
    { label: 'Engine Repair', value: 'engine_repair', icon: 'wrench', library: 'FontAwesome5' },
    { label: 'Battery Jump', value: 'battery', icon: 'flash', library: 'Ionicons' },
    { label: 'Lock Out', value: 'lock_out', icon: 'key', library: 'Ionicons' },
    { label: 'Other', value: 'other', icon: 'help-circle', library: 'Ionicons' },
  ];

  const renderServiceIcon = (service, isSelected) => {
    const color = isSelected ? '#E8192C' : '#4B5563';
    const size = 22;
    if (service.library === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={service.icon} size={size} color={color} />;
    } else if (service.library === 'FontAwesome5') {
      return <FontAwesome5 name={service.icon} size={18} color={color} />;
    } else {
      return <Ionicons name={service.icon} size={size} color={color} />;
    }
  };

  const renderVehicleRateList = () => {
    if (vehicleType === 'car') {
      return (
        <View style={styles.rateCard}>
          <View style={styles.rateHeaderRow}>
            <Text style={styles.rateHeaderTitle}>Recommended Car Rates</Text>
            <MaterialCommunityIcons name="information-outline" size={16} color="#E8192C" />
          </View>

          {/* Table Header */}
          <View style={[styles.rateRow, styles.rateTableHeader]}>
            <Text style={[styles.rateCol, styles.rateColHeader, { flex: 2 }]}>Service</Text>
            <Text style={[styles.rateCol, styles.rateColHeader, styles.textRight, { flex: 1 }]}>Base Price (₹)</Text>
          </View>

          {/* Table Rows */}
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Flat / Puncture Repair</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 - ₹499</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Towing (Up to 10 km)</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹999 - ₹1,499</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Fuel Delivery</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹499 + Fuel Cost</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Engine Repair / Inspection</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹699 - ₹1,499</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Battery Jump Start</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹399 - ₹699</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Lockout Assistance</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹499 - ₹999</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Other Emergency Assistance</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹499 - ₹1,999</Text>
          </View>

          {/* Footnotes */}
          <View style={styles.rateFooter}>
            <Text style={styles.rateFooterText}>• Additional Towing Distance: ₹25 - ₹50 per km</Text>
            <Text style={styles.rateFooterText}>• Emergency Night Charges (10 PM - 6 AM): +20% to +30%</Text>
          </View>
        </View>
      );
    }

    if (vehicleType === 'bike') {
      return (
        <View style={styles.rateCard}>
          <View style={styles.rateHeaderRow}>
            <Text style={styles.rateHeaderTitle}>Recommended Bike Rates</Text>
            <MaterialCommunityIcons name="information-outline" size={16} color="#E8192C" />
          </View>

          {/* Table Header */}
          <View style={[styles.rateRow, styles.rateTableHeader]}>
            <Text style={[styles.rateCol, styles.rateColHeader, { flex: 2 }]}>Service</Text>
            <Text style={[styles.rateCol, styles.rateColHeader, styles.textRight, { flex: 1 }]}>Price (₹)</Text>
          </View>

          {/* Table Rows */}
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Flat / Puncture Repair</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹149 - ₹299</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Bike Towing (Up to 10 km)</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹499 - ₹999</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Fuel Delivery</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹199 - ₹399 + Fuel</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Engine Inspection / Minor Repair</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 - ₹799</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Battery Jump Start</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹199 - ₹399</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Key Lockout Assistance</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 - ₹599</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Chain Repair / Adjustment</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹199 - ₹399</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Clutch / Brake Cable Repair</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 - ₹599</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Other Emergency Assistance</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 - ₹999</Text>
          </View>

          {/* Footnotes */}
          <View style={styles.rateFooter}>
            <Text style={styles.rateFooterText}>• Additional Towing Distance: ₹15 - ₹30 per km</Text>
            <Text style={styles.rateFooterText}>• Night Charges (10 PM - 6 AM): +20% to +30%</Text>
          </View>
        </View>
      );
    }

    if (vehicleType === 'e-vehicle') {
      return (
        <View style={styles.rateCard}>
          <View style={styles.rateHeaderRow}>
            <Text style={styles.rateHeaderTitle}>Recommended EV Rates</Text>
            <MaterialCommunityIcons name="information-outline" size={16} color="#E8192C" />
          </View>

          {/* Subsection 1: Electric Car */}
          <Text style={styles.rateSubtitle}>Electric Car</Text>
          <View style={[styles.rateRow, styles.rateTableHeader]}>
            <Text style={[styles.rateCol, styles.rateColHeader, { flex: 2 }]}>Service</Text>
            <Text style={[styles.rateCol, styles.rateColHeader, styles.textRight, { flex: 1 }]}>Price (₹)</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Flat / Puncture Repair</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹399 - ₹699</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Emergency Charging</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹799 - ₹1,999</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Portable Charging Service</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹999 - ₹2,499</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>EV Towing (Up to 10 km)</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹1,499 - ₹2,999</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Battery Diagnostics</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹799 - ₹1,999</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Motor/Controller Inspection</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹999 - ₹2,499</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Lockout Assistance</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹699 - ₹1,199</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Other Assistance</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹799 - ₹2,999</Text>
          </View>

          {/* Subsection 2: EV Bike/Scooter */}
          <Text style={styles.rateSubtitle}>EV Bike / Scooter</Text>
          <View style={[styles.rateRow, styles.rateTableHeader]}>
            <Text style={[styles.rateCol, styles.rateColHeader, { flex: 2 }]}>Service</Text>
            <Text style={[styles.rateCol, styles.rateColHeader, styles.textRight, { flex: 1 }]}>Price (₹)</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Puncture Repair</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹249</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Towing (10 km)</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹899</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Battery Diagnostics</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 - ₹499</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Motor/Controller Inspection</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹499 - ₹999</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Lockout / Key Assistance</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 - ₹499</Text>
          </View>

          {/* Footnotes */}
          <View style={styles.rateFooter}>
            <Text style={styles.rateFooterText}>• Night Charges (10 PM - 6 AM): +20% to +30%</Text>
          </View>
        </View>
      );
    }

    if (vehicleType === 'auto') {
      return (
        <View style={styles.rateCard}>
          <View style={styles.rateHeaderRow}>
            <Text style={styles.rateHeaderTitle}>Recommended Auto-Rickshaw Rates</Text>
            <MaterialCommunityIcons name="information-outline" size={16} color="#E8192C" />
          </View>

          {/* Table Header */}
          <View style={[styles.rateRow, styles.rateTableHeader]}>
            <Text style={[styles.rateCol, styles.rateColHeader, { flex: 2 }]}>Service</Text>
            <Text style={[styles.rateCol, styles.rateColHeader, styles.textRight, { flex: 1 }]}>Price (₹)</Text>
          </View>

          {/* Table Rows */}
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Flat / Puncture Repair</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹199 - ₹399</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Fuel Delivery</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 + Fuel Cost</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Battery Jump Start</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 - ₹599</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Auto Towing (Up to 10 km)</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹999 - ₹1,799</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Engine Inspection</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹499 - ₹999</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Clutch / Brake Repair</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹399 - ₹899</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Electrical Wiring Check</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹399 - ₹899</Text>
          </View>
          <View style={[styles.rateRow, styles.alternateRow]}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Lockout Assistance</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹299 - ₹599</Text>
          </View>
          <View style={styles.rateRow}>
            <Text style={[styles.rateCol, { flex: 2 }]}>Other Emergency Assistance</Text>
            <Text style={[styles.rateCol, styles.textRight, { flex: 1 }]}>₹399 - ₹1,199</Text>
          </View>

          {/* Footnotes */}
          <View style={styles.rateFooter}>
            <Text style={styles.rateFooterText}>• Night Charges (10 PM - 6 AM): +20% to +30%</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const handleRequest = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Error', 'Please enter your vehicle number');
      return;
    }
    if (!description) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }
    if (!initialPrice || isNaN(Number(initialPrice)) || Number(initialPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid initial price');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceType,
          description,
          vehicleType,
          vehicleModel: vehicleModelInput,
          vehicleNumber,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          customerAddress,
          initialPrice: Number(initialPrice)
        })
      });
      const data = await response.json();
      if (data.success && data.request) {
        const createdJobId = data.request._id;
        setJobId(createdJobId);
        setCurrentBiddingPrice(Number(initialPrice));
        setWaitingForMechanic(true);

        const socket = getSocket(token);
        socket.emit('join:job:room', { jobId: createdJobId });

        socket.on('job:accepted:notify', (mechanicDetails) => {
          console.log('[Socket] Job accepted by mechanic:', mechanicDetails);
          setWaitingForMechanic(false);
          socket.off('job:accepted:notify');
          socket.off('request:price_updated');

          navigation.replace('Tracking', {
            jobId: createdJobId,
            mechanicId: mechanicDetails.mechanicId,
            mechanicName: mechanicDetails.mechanicName,
            mechanicPhone: mechanicDetails.mechanicPhone,
            customerLat: data.request.customerLocation?.coordinates[1] || 28.6139,
            customerLng: data.request.customerLocation?.coordinates[0] || 77.2090
          });
        });

        // Listen for real-time price updates
        socket.on('request:price_updated', (updateData) => {
          if (updateData && updateData.current_price) {
            setCurrentBiddingPrice(updateData.current_price);
            // Reset countdown for next bid prompt
            setCountdown(autoPromptDelay);
            setShowBidModal(false);
            
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownIntervalRef.current);
                  setShowBidModal(true);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to server');
    }
    setLoading(false);
  };

  const handleIncreasePrice = async (amountToAdd) => {
    setBidError('');
    const totalIncrease = (currentBiddingPrice - Number(initialPrice)) + Number(amountToAdd);
    if (totalIncrease > maxPriceIncrease) {
      setBidError(`Maximum total increase limit of ₹${maxPriceIncrease} reached.`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/requests/${jobId}/increase-price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ incrementAmount: Number(amountToAdd) })
      });
      const data = await response.json();
      if (data.success) {
        setCustomBidAmount('');
        setShowBidModal(false);
        // Socket listener will sync this, but set locally for immediate response
        setCurrentBiddingPrice(data.request.current_price);
      } else {
        setBidError(data.message || 'Failed to update offer');
      }
    } catch (err) {
      setBidError('Server is unreachable. Check connection.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Mechanic</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Location Section */}
        <Text style={styles.label}>Location</Text>
        <TouchableOpacity
          style={styles.addressBtn}
          onPress={() => navigation.navigate('AddressBook')}
          activeOpacity={0.7}
        >
          <Ionicons name="location-sharp" size={20} color="#E8192C" style={{ marginRight: 8 }} />
          <Text style={styles.addressBtnText} numberOfLines={1}>{customerAddress}</Text>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>

        {/* Services Grid Section */}
        <Text style={styles.label}>Select Service Type</Text>
        <View style={styles.servicesGrid}>
          {services.map(service => {
            const isSelected = serviceType === service.value;
            const isOther = service.value === 'other';
            return (
              <TouchableOpacity
                key={service.value}
                style={[
                  styles.serviceCard,
                  isSelected && styles.selectedServiceCard,
                  isOther && styles.fullWidthServiceCard
                ]}
                onPress={() => setServiceType(service.value)}
                activeOpacity={0.8}
              >
                <View style={[styles.serviceIconContainer, isSelected && styles.selectedServiceIconContainer]}>
                  {renderServiceIcon(service, isSelected)}
                </View>
                <Text style={[styles.serviceCardText, isSelected && styles.selectedServiceCardText]}>
                  {service.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vehicle Details Section */}
        <Text style={styles.label}>Vehicle Model</Text>
        <TextInput
          style={styles.singleLineInput}
          placeholder="e.g. Maruti Swift, Honda Activa"
          placeholderTextColor="#9CA3AF"
          value={vehicleModelInput}
          onChangeText={setVehicleModelInput}
        />

        <Text style={styles.label}>Vehicle Number</Text>
        <TextInput
          style={styles.singleLineInput}
          placeholder="e.g. KA 01 AB 1234"
          placeholderTextColor="#9CA3AF"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          autoCapitalize="characters"
        />

        {/* Issue Description Section */}
        <Text style={styles.label}>Describe Your Issue</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Car won't start, flat tyre on highway..."
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {renderVehicleRateList()}

        {/* Price / Offer Section */}
        <Text style={styles.label}>Initial Service Offer</Text>
        <View style={styles.priceInputContainer}>
          <Text style={styles.priceCurrency}>₹</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="e.g. 350"
            placeholderTextColor="#9CA3AF"
            value={initialPrice}
            onChangeText={setInitialPrice}
            keyboardType="numeric"
          />
        </View>

        {/* Send Request Button */}
        <TouchableOpacity style={styles.button} onPress={handleRequest} activeOpacity={0.9}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="flash" size={18} color="#fff" />
              <Text style={styles.buttonText}>Send Request</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Waiting Overlay with Bidding Integration */}
      {waitingForMechanic && (
        <View style={styles.waitingOverlay}>
          <Animated.View style={[styles.pulseCircle, {
            transform: [{
              scale: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 2.8]
              })
            }],
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 0]
            })
          }]} />
          <View style={styles.pulseCore}>
            <Text style={{ fontSize: 36 }}>🚗</Text>
          </View>
          <Text style={styles.waitingText}>Finding a nearby mechanic...</Text>
          <Text style={styles.waitingSubtext}>We are locating the best technician for you.</Text>
          
          <View style={styles.currentOfferContainer}>
            <Text style={styles.currentOfferLabel}>Current Offer Price</Text>
            <Text style={styles.currentOfferValue}>₹{currentBiddingPrice}</Text>
          </View>

          {countdown > 0 ? (
            <Text style={styles.timerText}>Next offer increase available in {countdown}s</Text>
          ) : (
            <TouchableOpacity style={styles.increaseOfferOverlayBtn} onPress={() => setShowBidModal(true)}>
              <Text style={styles.increaseOfferOverlayBtnText}>⚡ Increase Offer Now</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.waitingCancelBtn}
            onPress={() => {
              setWaitingForMechanic(false);
              navigation.goBack();
            }}
          >
            <Text style={styles.waitingCancelText}>Cancel</Text>
          </TouchableOpacity>

          {/* Rapido-style Bidding bottom sheet dialog */}
          {showBidModal && (
            <View style={styles.modalBackdrop}>
              <View style={styles.bidModalContent}>
                <Text style={styles.bidModalTitle}>Increase Your Offer ⚡</Text>
                <Text style={styles.bidModalSub}>Higher price = Faster mechanic response.</Text>
                
                {bidError ? <Text style={styles.bidErrorText}>{bidError}</Text> : null}

                <View style={styles.quickBidRow}>
                  {[50, 100, 200].map(amt => (
                    <TouchableOpacity
                      key={amt}
                      style={styles.quickBidBtn}
                      onPress={() => handleIncreasePrice(amt)}
                    >
                      <Text style={styles.quickBidBtnText}>+₹{amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.customBidContainer}>
                  <TextInput
                    style={styles.customBidInput}
                    placeholder="Enter custom increase"
                    placeholderTextColor="#999"
                    value={customBidAmount}
                    onChangeText={setCustomBidAmount}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.customBidSubmitBtn}
                    onPress={() => {
                      if (!customBidAmount) return;
                      handleIncreasePrice(customBidAmount);
                    }}
                  >
                    <Text style={styles.customBidSubmitText}>Add</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeBidModalBtn} onPress={() => setShowBidModal(false)}>
                  <Text style={styles.closeBidModalText}>Keep Waiting (₹{currentBiddingPrice})</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    marginTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 18,
    marginBottom: 8,
  },
  addressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  addressBtnText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  changeText: {
    color: '#E8192C',
    fontWeight: 'bold',
    fontSize: 14,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 4,
    gap: 10,
  },
  serviceCard: {
    width: '48.5%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  selectedServiceCard: {
    borderColor: '#E8192C',
    backgroundColor: '#FFF5F5',
  },
  fullWidthServiceCard: {
    width: '100%',
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedServiceIconContainer: {
    backgroundColor: '#FFF0F0',
  },
  serviceCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  selectedServiceCardText: {
    color: '#E8192C',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 10,
    color: '#1F2937',
  },
  singleLineInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    height: 50,
    marginBottom: 10,
    color: '#1F2937',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    height: 52,
    marginBottom: 10,
  },
  priceCurrency: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    height: '100%',
    padding: 0,
  },
  button: {
    backgroundColor: '#E8192C',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 25,
    shadowColor: '#E8192C',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },

  // Waiting Overlay styles
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pulseCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8192C',
  },
  pulseCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8192C',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#E8192C',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 30,
  },
  waitingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  waitingSubtext: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  waitingCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 1.5,
    borderColor: '#E8192C',
    borderRadius: 25,
  },
  waitingCancelText: {
    color: '#E8192C',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Bidding details wait styles
  currentOfferContainer: {
    backgroundColor: 'rgba(232, 25, 44, 0.15)',
    borderWidth: 1.5,
    borderColor: '#E8192C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  currentOfferLabel: {
    color: '#E8192C',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentOfferValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },
  timerText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 25,
  },
  increaseOfferOverlayBtn: {
    backgroundColor: '#E8192C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginBottom: 25,
    shadowColor: '#E8192C',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  increaseOfferOverlayBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 2000,
  },
  bidModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  bidModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  bidModalSub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  bidErrorText: {
    color: 'red',
    fontSize: 13,
    marginBottom: 10,
  },
  quickBidRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  quickBidBtn: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1.5,
    borderColor: '#E8192C',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  quickBidBtnText: {
    color: '#E8192C',
    fontWeight: 'bold',
    fontSize: 16,
  },
  customBidContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  customBidInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
    height: 48,
    color: '#333',
  },
  customBidSubmitBtn: {
    backgroundColor: '#E8192C',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    height: 48,
  },
  customBidSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  closeBidModalBtn: {
    paddingVertical: 10,
  },
  closeBidModalText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  rateCard: {
    backgroundColor: '#FFF8F8',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 16,
    marginVertical: 15,
  },
  rateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rateHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E8192C',
  },
  rateRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAEA',
    alignItems: 'center',
  },
  alternateRow: {
    backgroundColor: '#FFF0F0',
  },
  rateTableHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#FCA5A5',
    paddingBottom: 6,
  },
  rateCol: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  rateColHeader: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  textRight: {
    textAlign: 'right',
  },
  rateFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFEAEA',
    paddingTop: 10,
    gap: 4,
  },
  rateFooterText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  rateSubtitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 14,
    marginBottom: 6,
  },
});
