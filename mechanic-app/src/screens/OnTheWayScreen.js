// src/screens/OnTheWayScreen.js
import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, Alert, Linking, Modal, TextInput, Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';
import API_URL from '../config/api';

// ---------- Helpers ----------
const toRad = deg => (deg * Math.PI) / 180;
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km
};

// Approximate ETA assuming average speed of 30 km/h in city traffic
const calculateEta = (distanceKm) => Math.max(1, Math.round((distanceKm / 30) * 60));

// Check if coordinate is a valid latitude/longitude number pair
const isValidCoordinate = (coord) => {
  return coord && 
         typeof coord.latitude === 'number' && !isNaN(coord.latitude) &&
         typeof coord.longitude === 'number' && !isNaN(coord.longitude);
};

// ---------- Progress Tracker Steps ----------
const trackerSteps = [
  { label: 'Accepted', icon: 'check-bold', library: 'MaterialCommunityIcons' },
  { label: 'On the Way', icon: 'scooter', library: 'MaterialCommunityIcons' },
  { label: 'Arrived', icon: 'account', library: 'MaterialCommunityIcons' },
  { label: 'Completed', icon: 'wrench', library: 'MaterialCommunityIcons' },
];

const ProgressTracker = ({ currentStep }) => {
  return (
    <View style={styles.progressContainer}>
      {/* Background connecting lines */}
      <View style={styles.progressLineBg}>
        {trackerSteps.map((_, idx) => {
          if (idx === trackerSteps.length - 1) return null;
          const completedOrCurrent = idx < currentStep;
          return (
            <View
              key={idx}
              style={[
                styles.progressLineSegment,
                completedOrCurrent ? styles.progressLineCompleted : styles.progressLinePending
              ]}
            />
          );
        })}
      </View>

      {/* Steps */}
      <View style={styles.stepsRow}>
        {trackerSteps.map((step, idx) => {
          const completed = idx < currentStep;
          const isCurrent = idx === currentStep;
          const completedOrCurrent = completed || isCurrent;
          const bgColor = completedOrCurrent ? '#27AE60' : '#B3B3B3';
          const IconComponent = step.library === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;

          return (
            <View key={step.label} style={styles.stepWrapper}>
              <View style={[styles.circle, { backgroundColor: bgColor }]}>
                <IconComponent name={step.icon} size={14} color="#fff" />
              </View>
              <Text style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const OnTheWayScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { requestId } = route.params || {};
  const { mechanicToken, mechanic } = useContext(AuthContext);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [mechanicLoc, setMechanicLoc] = useState(null);
  const [lastLoggedLoc, setLastLoggedLoc] = useState(null);
  const [eta, setEta] = useState('--');
  const [distance, setDistance] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpVal, setOtpVal] = useState(['', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [otpError, setOtpError] = useState('');

  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  // Fetch request details on mount
  useEffect(() => {
    if (!requestId || !mechanicToken) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/requests/${requestId}`, {
          headers: { Authorization: `Bearer ${mechanicToken}` },
        });
        const data = await res.json();
        if (data.success && data.request) {
          if (isMounted.current) {
            setRequest(data.request);
          }
        } else {
          Alert.alert('Error', data.message || 'Unable to load request');
          if (isMounted.current && navigation) {
            navigation.navigate('Home');
          }
        }
      } catch (e) {
        console.error('[ON_THE_WAY_FETCH_ERROR] Error fetching request details:', e);
        Alert.alert('Error', 'Network error while fetching request');
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [requestId, mechanicToken]);

  // Request location permission and start watching GPS
  useEffect(() => {
    let subscriber;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to en-route.');
          return;
        }

        // Get initial location
        const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const initialCoords = { latitude: initialLoc.coords.latitude, longitude: initialLoc.coords.longitude };
        if (isMounted.current) {
          setMechanicLoc(initialCoords);
          setLastLoggedLoc(initialCoords);
        }

        // Watch live position updates
        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Check GPS every 10 meters, but only redraw on 50m
            timeInterval: 5000,
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            const currentCoords = { latitude, longitude };
            if (isMounted.current) {
              setMechanicLoc(currentCoords);
            }

            // Emit location to customer via Socket
            try {
              const socket = getSocket(mechanicToken);
              if (socket) {
                socket.emit('mechanic:location', {
                  jobId: requestId,
                  lat: latitude,
                  lng: longitude
                });
              }
            } catch (socketErr) {
              console.error('[ON_THE_WAY_SOCKET_ERROR] Error emitting location update:', socketErr);
            }
          }
        );
      } catch (err) {
        console.log('Location tracking error:', err);
      }
    };

    if (mechanicToken && requestId) {
      startWatching();
    }

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, [mechanicToken, requestId]);

  // Calculate distance/ETA throttle (updates whenever mechanic moves >= 50m)
  useEffect(() => {
    if (!mechanicLoc || !request?.customerLocation?.coordinates) return;

    try {
      const [custLng, custLat] = request.customerLocation.coordinates;
      const dist = haversine(custLat, custLng, mechanicLoc.latitude, mechanicLoc.longitude);

      if (!lastLoggedLoc) {
        if (isMounted.current) {
          setDistance(dist.toFixed(1));
          setEta(`${calculateEta(dist)} mins`);
          setLastLoggedLoc(mechanicLoc);
        }
      } else {
        const movedDist = haversine(lastLoggedLoc.latitude, lastLoggedLoc.longitude, mechanicLoc.latitude, mechanicLoc.longitude) * 1000;
        if (movedDist >= 50) {
          if (isMounted.current) {
            setDistance(dist.toFixed(1));
            setEta(`${calculateEta(dist)} mins`);
            setLastLoggedLoc(mechanicLoc);
          }
        }
      }
    } catch (err) {
      console.error('[ON_THE_WAY_DISTANCE_EFFECT_ERROR] Error in distance calculation:', err);
    }
  }, [mechanicLoc, request, lastLoggedLoc]);

  // Socket listeners for cancellation from customer side
  useEffect(() => {
    if (!mechanicToken || !requestId) return undefined;
    const socket = getSocket(mechanicToken);
    if (!socket) return undefined;

    socket.emit('join:job:room', { jobId: requestId });

    const cancelHandler = () => {
      try {
        Alert.alert('Job Cancelled', 'The customer has cancelled this service request.', [
          { text: 'Okay', onPress: () => {
            if (isMounted.current && navigation) {
              navigation.navigate('Home');
            }
          } }
        ]);
      } catch (err) {
        console.error('[ON_THE_WAY_CANCEL_ALERT_ERROR] Error showing cancel alert:', err);
      }
    };

    socket.on('request:cancelled', cancelHandler);
    return () => {
      socket.off('request:cancelled', cancelHandler);
    };
  }, [mechanicToken, requestId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27AE60" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Unable to load job details.</Text>
      </View>
    );
  }

  const customerObj = request.customer || {};

  const handleCall = () => {
    if (customerObj.phone) {
      Linking.openURL(`tel:${customerObj.phone}`);
    } else {
      Alert.alert('Error', 'Customer phone number is not available');
    }
  };

  const handleChat = () => {
    navigation.navigate('Chat', {
      jobId: requestId,
      receiverName: customerObj.name || 'Customer'
    });
  };

  const handleStartNavigation = () => {
    if (!request.customerLocation?.coordinates) return;
    const [lng, lat] = request.customerLocation.coordinates;
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${lat},${lng}`
      : `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open maps app'));
  };

  const handleArrived = async () => {
    if (!mechanicLoc || !request?.customerLocation?.coordinates) {
      Alert.alert('Error', 'Location data missing. Unable to verify your position.');
      return;
    }
    const [custLng, custLat] = request.customerLocation.coordinates;
    const distMetres = haversine(custLat, custLng, mechanicLoc.latitude, mechanicLoc.longitude) * 1000;

    // Check if within 200m
    if (distMetres > 200) {
      Alert.alert('Too Far Away', `You are currently ${(distMetres / 1000).toFixed(1)} km away. You must be within 200 meters of the customer to mark arrival.`);
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError('');
      const res = await fetch(`${API_URL}/api/requests/${requestId}/mark-arrived`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mechanicToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success) {
        if (isMounted.current) {
          setOtpVal(['', '', '', '']);
          setShowOtpModal(true);
        }
      } else {
        Alert.alert('Error', data.message || 'Unable to update status to Arrived');
      }
    } catch (e) {
      console.error('[ON_THE_WAY_ARRIVED_ERROR] Error in handleArrived:', e);
      Alert.alert('Error', 'Network error while updating status');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setOtpLoading(true);
      setOtpError('');
      const res = await fetch(`${API_URL}/api/requests/${requestId}/mark-arrived`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mechanicToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success) {
        setOtpVal(['', '', '', '']);
        Alert.alert('OTP Sent', 'A new verification code has been sent to the customer.');
      } else {
        setOtpError(data.message || 'Failed to resend OTP.');
      }
    } catch (e) {
      console.error('[ON_THE_WAY_RESEND_ERROR] Error in handleResendOtp:', e);
      setOtpError('Network error while resending OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async () => {
    const code = otpVal.join('');
    if (code.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter the full 4-digit code.');
      return;
    }

    if (isMounted.current) {
      setOtpLoading(true);
      setOtpError('');
    }
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}/verify-otp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mechanicToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp: code })
      });
      const data = await res.json();
      if (data.success) {
        if (isMounted.current) {
          setShowOtpModal(false);
        }
        Alert.alert('Success', 'OTP verified! Starting service job.', [
          {
            text: 'Go to Job Screen',
            onPress: () => {
              if (isMounted.current && navigation) {
                navigation.navigate('ActiveJob', {
                  jobId: requestId,
                  status: 'in_progress',
                  customerLocation: request.customerLocation,
                  customerName: customerObj.name || 'Customer',
                  customerPhone: customerObj.phone || '',
                  customerAddress: request.customerAddress || 'Customer Address',
                  issue: request.issueDescription || request.serviceType || 'Roadside Assistance'
                });
              }
            }
          }
        ]);
      } else {
        setOtpError(data.message || 'Incorrect verification OTP.');
      }
    } catch (err) {
      console.error('[ON_THE_WAY_VERIFY_OTP_ERROR] Error in handleVerifyOtpSubmit:', err);
      setOtpError('Failed to connect to verification service.');
    } finally {
      if (isMounted.current) {
        setOtpLoading(false);
      }
    }
  };

  const handleCancelJob = async () => {
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({ reason: cancellationReason || 'Cancelled by mechanic' })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Job Cancelled', 'The job has been cancelled successfully.');
        if (isMounted.current && navigation) {
          navigation.navigate('Home');
        }
      } else {
        Alert.alert('Error', data.message || 'Cancellation failed.');
      }
    } catch (e) {
      console.error('[ON_THE_WAY_CANCEL_JOB_ERROR] Error cancelling job:', e);
      Alert.alert('Error', 'Network error during cancellation.');
    }
    if (isMounted.current) {
      setShowCancelModal(false);
    }
  };

  const formatServiceType = type => {
    if (!type) return 'Service';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const updateOtpDigit = (text, index) => {
    setOtpError('');
    const cleaned = text.replace(/[^0-9]/g, '');
    const newOtp = [...otpVal];
    newOtp[index] = cleaned;
    setOtpVal(newOtp);

    if (cleaned && index < 3) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpVal[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const customerCoords = (() => {
    try {
      const coords = request?.customerLocation?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2 && typeof coords[1] === 'number' && typeof coords[0] === 'number') {
        return { latitude: coords[1], longitude: coords[0] };
      }
    } catch (err) {
      console.error('[ON_THE_WAY_MAP_ERROR] Error parsing customer coords:', err);
    }
    return null;
  })();

  const currentStep = 1; // Index 1 for "On the Way" step

  console.log('[OnTheWayScreen DEBUG] Full request object:', request);

  return (
    <View style={styles.container}>
      {/* 1. DEEP INDIGO HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job In Progress</Text>
        <TouchableOpacity style={styles.shieldBtn} onPress={() => navigation.navigate('SOSAlerts')}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TOP JOB SUMMARY CARD */}
        <View style={styles.jobSummaryCard}>
          <View style={styles.jobSummaryHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobSummaryTitle}>{formatServiceType(request.serviceType || 'Flat/Puncture Repair')}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {request.customerAddress || 'DLF Cyber City, Phase 2 Gurugram, Haryana'}
                </Text>
              </View>
            </View>
            <View style={styles.inProgressBadge}>
              <Text style={styles.inProgressBadgeText}>In Progress</Text>
            </View>
          </View>
        </View>

        {/* MAP VIEW CONTAINER */}
        <View style={styles.mapCard}>
          {isValidCoordinate(customerCoords) ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: customerCoords.latitude,
                longitude: customerCoords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              showsUserLocation={false}
            >
              <Marker coordinate={customerCoords} title="Customer Location">
                <View style={styles.customerMarkerPin}>
                  <Text style={{ fontSize: 16 }}>📍</Text>
                </View>
              </Marker>
              {isValidCoordinate(mechanicLoc) && (
                <Marker coordinate={mechanicLoc} title="Your Location">
                  <View style={styles.mechanicMarkerDot} />
                </Marker>
              )}
              {isValidCoordinate(mechanicLoc) && (
                <Polyline coordinates={[mechanicLoc, customerCoords]} strokeColor="#4F46E5" strokeWidth={4} />
              )}
            </MapView>
          ) : (
            <View style={styles.mapFallback}>
              <Ionicons name="map-outline" size={40} color="#94A3B8" />
              <Text style={styles.mapFallbackText}>Live Map Navigation</Text>
            </View>
          )}

          {/* Map Overlay Pill */}
          <View style={styles.mapDistanceOverlay}>
            <Ionicons name="car-outline" size={16} color="#362A84" style={{ marginRight: 6 }} />
            <Text style={styles.mapDistanceText}>{distance ? `${distance} km` : '2.4 km'} • {eta || '8 min'}</Text>
          </View>

          {/* Recenter Button */}
          <TouchableOpacity style={styles.recenterBtn} onPress={handleStartNavigation}>
            <Ionicons name="locate" size={20} color="#362A84" />
          </TouchableOpacity>
        </View>

        {/* CUSTOMER CARD */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardSectionLabel}>Customer</Text>
          <View style={styles.customerRow}>
            <Text style={styles.customerName}>{customerObj.name || 'Ankit Verma'}</Text>

            <View style={styles.actionIconRow}>
              <TouchableOpacity style={styles.contactIconBtn} onPress={handleCall}>
                <Ionicons name="call-outline" size={18} color="#362A84" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.contactIconBtn, { marginLeft: 8 }]} onPress={handleChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#362A84" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* VEHICLE INFO CARD */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardSectionLabel}>Vehicle</Text>
          <Text style={styles.vehicleText}>
            {request.vehicleModel || 'Honda City'} • {request.vehicleNumber || 'HR26DK1234'} • {request.vehicleColor || 'White'}
          </Text>
        </View>

        {/* JOB AMOUNT CARD */}
        <View style={styles.sectionCard}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.cardSectionLabel}>Job Amount</Text>
              <Text style={styles.basePriceSub}>Base Price ₹{request.price || 150}</Text>
            </View>
            <Text style={styles.jobAmountText}>₹{request.price || 150}</Text>
          </View>
        </View>

        {/* BOTTOM ACTION BUTTONS */}
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity style={styles.markCompletedBtn} onPress={handleArrived}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.markCompletedText}>Mark as Completed</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.needHelpBtn} onPress={() => Alert.alert('Support', 'Connecting to Roadside Assistance Support line...')}>
            <Ionicons name="call-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.needHelpText}>Need Help?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Job</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel this job? Frequent cancellations may affect your rating and eligibility.
            </Text>
            <TextInput
              style={styles.cancelInput}
              placeholder="Reason for cancellation (optional)"
              value={cancellationReason}
              onChangeText={setCancellationReason}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalBtnKeep} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalBtnKeepText}>Keep Job</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleCancelJob}>
                <Text style={styles.modalBtnConfirmText}>Cancel Job</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContent}>
            <View style={styles.otpModalHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#362A84" />
              <Text style={styles.otpModalTitle}>Verify Arrival OTP</Text>
            </View>
            <Text style={styles.otpModalMessage}>
              Ask the customer for the 4-digit verification code shown on their screen.
            </Text>
            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
            <View style={styles.otpInputRow}>
              {otpVal.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={otpRefs[index]}
                  style={styles.otpBox}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => updateOtpDigit(text, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  selectTextOnFocus
                />
              ))}
            </View>
            <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp} disabled={otpLoading}>
              <Text style={styles.resendBtnText}>Resend OTP</Text>
            </TouchableOpacity>
            <View style={styles.otpActionRow}>
              <TouchableOpacity style={styles.otpCancelBtn} onPress={() => setShowOtpModal(false)}>
                <Text style={styles.otpCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.otpVerifyBtn,
                  (otpLoading || otpVal.some(d => !d)) && { backgroundColor: '#A0D8B4' }
                ]}
                onPress={handleVerifyOtpSubmit}
                disabled={otpLoading || otpVal.some(d => !d)}
              >
                {otpLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.otpVerifyBtnText}>Verify & Start Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },
  header: {
    backgroundColor: '#362A84',
    paddingTop: 46,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  jobSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#362A84',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  jobSummaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
  },
  inProgressBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  inProgressBadgeText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mapCard: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapFallback: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapFallbackText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 6,
  },
  customerMarkerPin: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
  },
  mechanicMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4F46E5',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  mapDistanceOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapDistanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#362A84',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSectionLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  actionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  basePriceSub: {
    fontSize: 12,
    color: '#64748B',
  },
  jobAmountText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#059669',
  },
  bottomButtonsContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  markCompletedBtn: {
    backgroundColor: '#362A84',
    borderRadius: 14,
    width: '100%',
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  markCompletedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  needHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  needHelpText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '85%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  modalMessage: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  cancelInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, marginBottom: 16 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtnKeep: { paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 },
  modalBtnKeepText: { color: '#64748B', fontWeight: 'bold' },
  modalBtnConfirm: { backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  modalBtnConfirmText: { color: '#FFF', fontWeight: 'bold' },
  otpModalContent: { backgroundColor: '#FFF', width: '85%', borderRadius: 16, padding: 20 },
  otpModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  otpModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginLeft: 8 },
  otpModalMessage: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  otpErrorText: { color: '#EF4444', fontSize: 12, marginBottom: 8 },
  otpInputRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  otpBox: { width: 44, height: 48, borderWidth: 1, borderColor: '#362A84', borderRadius: 8, textAlign: 'center', fontSize: 20, fontWeight: 'bold' },
  resendBtn: { alignSelf: 'center', marginBottom: 16 },
  resendBtnText: { color: '#4F46E5', fontSize: 12, fontWeight: '600' },
  otpActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpCancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  otpCancelBtnText: { color: '#64748B', fontWeight: 'bold' },
  otpVerifyBtn: { flex: 1.5, backgroundColor: '#362A84', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  otpVerifyBtnText: { color: '#FFF', fontWeight: 'bold' },
});

export default OnTheWayScreen;
