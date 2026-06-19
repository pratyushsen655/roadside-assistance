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

export default function OnTheWayScreen() {
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
      const res = await fetch(`${API_URL}/api/mechanic/jobs/${requestId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${mechanicToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'arrived' }),
      });
      const data = await res.json();
      if (data.success) {
        // Emit arrived update to customer
        try {
          const socket = getSocket(mechanicToken);
          if (socket) {
            socket.emit('job:status:update', { jobId: requestId, status: 'arrived' });
          }
        } catch (socketErr) {
          console.error('[ON_THE_WAY_ARRIVED_SOCKET_ERROR] Error emitting job status update:', socketErr);
        }
        if (isMounted.current) {
          setShowOtpModal(true);
        }
      } else {
        Alert.alert('Error', data.message || 'Unable to update status to Arrived');
      }
    } catch (e) {
      console.error('[ON_THE_WAY_ARRIVED_ERROR] Error in handleArrived:', e);
      Alert.alert('Error', 'Network error while updating status');
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
    }
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}/verify-start`, {
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
        Alert.alert('Verification Failed', data.message || 'Incorrect verification OTP.');
      }
    } catch (err) {
      console.error('[ON_THE_WAY_VERIFY_OTP_ERROR] Error in handleVerifyOtpSubmit:', err);
      Alert.alert('Error', 'Failed to connect to verification service.');
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

  return (
    <View style={styles.container}>
      {/* Top green accent bar */}
      <View style={styles.topAccent} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STATUS CARD */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.statusIconWrapper}>
              <View style={styles.greenCircleIcon}>
                <MaterialCommunityIcons name="scooter" size={20} color="#fff" />
              </View>
            </View>
            <View style={styles.statusTextWrapper}>
              <Text style={styles.statusTitle}>On the Way</Text>
              <Text style={styles.statusSubtitle}>Head to the customer location</Text>
            </View>
            <View style={styles.etaWrapper}>
              <Text style={styles.etaLabel}>ETA</Text>
              <Text style={styles.etaValue}>{eta}</Text>
            </View>
          </View>
          {/* Progress Tracker */}
          <ProgressTracker currentStep={currentStep} />
        </View>

        {/* CUSTOMER INFO CARD */}
        <View style={styles.card}>
          <View style={styles.customerRow}>
            {customerObj.photo ? (
              <Image source={{ uri: customerObj.photo }} style={styles.customerAvatar} />
            ) : (
              <View style={[styles.customerAvatar, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={24} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customerObj.name || 'Customer'}</Text>
              <View style={styles.ratingRow}>
                <MaterialCommunityIcons name="star" size={14} color="#F1C40F" />
                <Text style={styles.ratingText}>
                  {customerObj.rating?.toFixed(1) || '5.0'} ({customerObj.reviewsCount || 12})
                </Text>
              </View>
            </View>
            <View style={styles.customerActions}>
              <TouchableOpacity style={styles.outlinedGreenBtnCompact} onPress={handleCall}>
                <Ionicons name="call" size={14} color="#27AE60" />
                <Text style={styles.outlinedBtnTextCompact}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlinedGreenBtnCompact} onPress={handleChat}>
                <MaterialCommunityIcons name="chat" size={14} color="#27AE60" />
                <Text style={styles.outlinedBtnTextCompact}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SERVICE DETAILS CARD */}
        <View style={styles.card}>
          <View style={styles.serviceHeader}>
            <MaterialCommunityIcons name="wrench" size={20} color="#27AE60" />
            <Text style={styles.serviceHeaderText}>Service Details</Text>
          </View>
          <View style={styles.serviceDetailsRow}>
            <View style={styles.serviceCol}>
              <Text style={styles.serviceLabel}>Service</Text>
              <Text style={styles.serviceValue}>{formatServiceType(request.serviceType)}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.serviceCol}>
              <Text style={styles.serviceLabel}>Vehicle</Text>
              <Text style={styles.serviceValue}>{request.vehicleModel || request.vehicleType || 'Car'}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.serviceCol}>
              <View style={styles.labelWithIcon}>
                <Ionicons name="card-outline" size={12} color="#6B7280" style={{ marginRight: 2 }} />
                <Text style={styles.serviceLabel}>Vehicle No.</Text>
              </View>
              <Text style={styles.serviceValue}>{request.vehicleNumber || 'UP16 AB 1234'}</Text>
            </View>
          </View>
        </View>

        {/* CUSTOMER LOCATION CARD */}
        <View style={styles.card}>
          <View style={styles.locationHeader}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#27AE60" />
            <Text style={styles.locationHeaderText}>Customer Location</Text>
          </View>
          <Text style={styles.addressText}>{request.customerAddress || 'Address not provided'}</Text>
          <View style={styles.locationStatsRow}>
            <View style={styles.locationStatCol}>
              <View style={styles.statLabelRow}>
                <MaterialCommunityIcons name="wrench-clock" size={14} color="#27AE60" style={{ marginRight: 4 }} />
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <Text style={styles.statValue}>{distance ? `${distance} km` : '--'}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.locationStatCol}>
              <View style={styles.statLabelRow}>
                <Ionicons name="time-outline" size={14} color="#27AE60" style={{ marginRight: 4 }} />
                <Text style={styles.statLabel}>ETA</Text>
              </View>
              <Text style={styles.statValue}>{eta}</Text>
            </View>
          </View>
        </View>

        {/* MAP VIEW */}
        {isValidCoordinate(customerCoords) && (
          <View style={styles.mapCard}>
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
              <Marker coordinate={customerCoords} pinColor="red" title="Customer Location" />
              {isValidCoordinate(mechanicLoc) && (
                <Marker coordinate={mechanicLoc} title="Your Location">
                  <View style={styles.mechanicMarkerDot} />
                </Marker>
              )}
              {isValidCoordinate(mechanicLoc) && (
                <Polyline coordinates={[mechanicLoc, customerCoords]} strokeColor="#3498DB" strokeWidth={4} />
              )}
            </MapView>
          </View>
        )}

        {/* ACTION BUTTON ROW */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.solidGreenBtn} onPress={handleStartNavigation}>
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.solidBtnText}>Start Navigation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlinedGreenBtn} onPress={handleCall}>
            <Ionicons name="call" size={16} color="#27AE60" />
            <Text style={styles.outlinedBtnText}>Call Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlinedGreenBtn} onPress={handleChat}>
            <MaterialCommunityIcons name="chat" size={16} color="#27AE60" />
            <Text style={styles.outlinedBtnText}>Chat</Text>
          </TouchableOpacity>
        </View>

        {/* SAFETY NOTICE */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#F39C12" />
            <Text style={styles.safetyTitle}>Safety First</Text>
          </View>
          <Text style={styles.safetyText}>Please follow traffic rules and reach the customer safely.</Text>
        </View>

        {/* BOTTOM ACTIONS */}
        <View style={styles.bottomActionsContainer}>
          <TouchableOpacity style={styles.arrivedBtn} onPress={handleArrived}>
            <Text style={styles.arrivedBtnText}>I've Arrived at Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelModal(true)}>
            <Ionicons name="close-circle" size={18} color="#E74C3C" style={{ marginRight: 6 }} />
            <Text style={styles.cancelBtnText}>Cancel Job</Text>
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

      {/* OTP verification Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContent}>
            <View style={styles.otpModalHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#27AE60" />
              <Text style={styles.otpModalTitle}>Verify Arrival OTP</Text>
            </View>
            <Text style={styles.otpModalMessage}>
              Ask the customer for the 4-digit verification code shown on their screen.
            </Text>
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
            <View style={styles.otpActionRow}>
              <TouchableOpacity style={styles.otpCancelBtn} onPress={() => setShowOtpModal(false)}>
                <Text style={styles.otpCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.otpVerifyBtn} onPress={handleVerifyOtpSubmit} disabled={otpLoading}>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topAccent: { height: 4, backgroundColor: '#27AE60' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#E74C3C', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginVertical: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  // STATUS CARD
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statusIconWrapper: { marginRight: 12 },
  greenCircleIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#27AE60', justifyContent: 'center', alignItems: 'center' },
  statusTextWrapper: { flex: 1 },
  statusTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  statusSubtitle: { fontSize: 12, color: '#6B7280' },
  etaWrapper: { alignItems: 'flex-end' },
  etaLabel: { fontSize: 11, color: '#6B7280' },
  etaValue: { fontSize: 24, fontWeight: 'bold', color: '#27AE60' },
  // Progress Tracker
  progressContainer: {
    marginVertical: 4,
    position: 'relative',
  },
  progressLineBg: {
    position: 'absolute',
    top: 13,
    left: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 0,
  },
  progressLineSegment: {
    flex: 1,
    height: 2,
  },
  progressLineCompleted: {
    borderColor: '#27AE60',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  progressLinePending: {
    backgroundColor: '#B3B3B3',
    height: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  stepWrapper: {
    alignItems: 'center',
    width: 70,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: { fontSize: 10, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  stepLabelCurrent: { color: '#27AE60', fontWeight: 'bold' },
  // CUSTOMER INFO
  customerRow: { flexDirection: 'row', alignItems: 'center' },
  customerAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 12, color: '#4B5563', marginLeft: 4 },
  customerActions: { flexDirection: 'row', gap: 6 },
  outlinedGreenBtnCompact: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#27AE60', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center' },
  outlinedBtnTextCompact: { fontSize: 11, color: '#27AE60', marginLeft: 3, fontWeight: 'bold' },
  // SERVICE DETAILS
  serviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  serviceHeaderText: { fontSize: 15, fontWeight: 'bold', color: '#1F2937', marginLeft: 6 },
  serviceDetailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceCol: { alignItems: 'center', flex: 1 },
  serviceLabel: { fontSize: 11, color: '#6B7280' },
  labelWithIcon: { flexDirection: 'row', alignItems: 'center' },
  serviceValue: { fontSize: 13, fontWeight: 'bold', color: '#1F2937', marginTop: 3, textAlign: 'center' },
  verticalDivider: { width: 1, backgroundColor: '#E5E7EB', height: 35 },
  // LOCATION CARD
  locationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locationHeaderText: { fontSize: 15, fontWeight: 'bold', color: '#1F2937', marginLeft: 6 },
  addressText: { fontSize: 13, color: '#4B5563', marginBottom: 12, lineHeight: 18 },
  locationStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationStatCol: { alignItems: 'center', flex: 1 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#6B7280' },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#1F2937', marginTop: 3 },
  // MAP
  mapCard: { height: 250, borderRadius: 12, overflow: 'hidden', marginVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  map: { flex: 1 },
  mechanicMarkerDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#27AE60', borderWidth: 2, borderColor: '#fff' },
  // ACTION ROW
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8, gap: 6 },
  solidGreenBtn: { flex: 1.5, backgroundColor: '#27AE60', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8 },
  outlinedGreenBtn: { flex: 1, borderColor: '#27AE60', borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8 },
  solidBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  outlinedBtnText: { color: '#27AE60', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  // SAFETY NOTICE
  safetyCard: { backgroundColor: '#FEF9E7', borderRadius: 12, padding: 16, marginVertical: 8, borderLeftWidth: 4, borderLeftColor: '#F39C12' },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  safetyTitle: { fontSize: 14, fontWeight: 'bold', color: '#1F2937', marginLeft: 6 },
  safetyText: { fontSize: 12, color: '#4B5563' },
  // BOTTOM ACTIONS
  bottomActionsContainer: { marginTop: 12, gap: 8 },
  arrivedBtn: { backgroundColor: '#1E8449', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContents: 'center', elevation: 2 },
  arrivedBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { borderColor: '#E74C3C', borderWidth: 1.5, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  cancelBtnText: { color: '#E74C3C', fontSize: 16, fontWeight: 'bold' },
  // MODALS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 },
  cancelInput: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14, color: '#1F2937', marginBottom: 20 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnKeep: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  modalBtnKeepText: { color: '#4B5563', fontWeight: 'bold', fontSize: 14 },
  modalBtnConfirm: { backgroundColor: '#E74C3C', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  modalBtnConfirmText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  // OTP Modal
  otpModalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 10, alignItems: 'center' },
  otpModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  otpModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  otpModalMessage: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  otpInputRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 24 },
  otpBox: { width: 50, height: 56, borderWidth: 2, borderColor: '#27AE60', borderRadius: 8, textAlign: 'center', fontSize: 24, fontWeight: 'bold', color: '#27AE60', backgroundColor: '#F4FBF7' },
  otpActionRow: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  otpCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#6B7280' },
  otpCancelBtnText: { color: '#6B7280', fontWeight: 'bold' },
  otpVerifyBtn: { flex: 2, backgroundColor: '#27AE60', paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  otpVerifyBtnText: { color: '#fff', fontWeight: 'bold' },
});
