// src/screens/RequestAcceptedScreen.js
import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Linking, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';
import RazorpayCheckout from 'react-native-razorpay';

// Inline API URL fallback
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';

// Helper to calculate distance between two lat/lng points (km)
const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if coordinate is a valid latitude/longitude number pair
const isValidCoordinate = (coord) => {
  return coord && 
         typeof coord.latitude === 'number' && !isNaN(coord.latitude) &&
         typeof coord.longitude === 'number' && !isNaN(coord.longitude);
};

const steps = ['Request Sent', 'Accepted', 'Arrived', 'Completed'];

const ProgressTracker = ({ currentStep }) => {
  return (
    <View style={styles.progressContainer}>
      {/* Background connecting lines */}
      <View style={styles.progressLineBg}>
        {steps.map((_, idx) => {
          if (idx === steps.length - 1) return null;
          const completed = idx < currentStep;
          return (
            <View
              key={idx}
              style={[
                styles.progressLineSegment,
                completed ? styles.progressLineCompleted : styles.progressLinePending
              ]}
            />
          );
        })}
      </View>

      {/* Steps */}
      <View style={styles.stepsRow}>
        {steps.map((label, idx) => {
          const completed = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <View key={label} style={styles.stepWrapper}>
              <View
                style={[
                  styles.circle,
                  completed && styles.circleCompleted,
                  isCurrent && styles.circleCurrent
                ]}
              >
                {completed ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : isCurrent ? (
                  <View style={styles.circleCurrentInner} />
                ) : null}
              </View>
              <Text style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const OTPDisplay = ({ otp }) => {
  const otpStr = String(otp || '');
  const digits = [
    otpStr[0] || '-',
    otpStr[1] || '-',
    otpStr[2] || '-',
    otpStr[3] || '-',
  ];

  return (
    <View style={styles.otpContainer}>
      <View style={styles.otpHeaderRow}>
        <Ionicons name="shield-checkmark" size={20} color="#27AE60" style={{ marginRight: 8 }} />
        <Text style={styles.otpLabel}>OTP Verification</Text>
      </View>
      <Text style={styles.enterOtpLabel}>Enter 4-digit OTP</Text>
      <View style={styles.otpBoxes}>
        {digits.map((digit, i) => (
          <View key={i} style={styles.otpBox}>
            <Text style={styles.otpDigit}>{digit}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.otpHelper}>(OTP will be verified when the mechanic arrives.)</Text>
    </View>
  );
};

export default function RequestAcceptedScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { requestId } = route.params || {};
  const { token } = useContext(AuthContext);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [mechanic, setMechanic] = useState(null);
  const [status, setStatus] = useState('accepted'); // status of the request
  const [eta, setEta] = useState(null); // minutes string
  const [mechanicLoc, setMechanicLoc] = useState(null);
  const [distance, setDistance] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [arrivalOtp, setArrivalOtp] = useState('');
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  const fetchRequestDetails = async () => {
    if (!requestId || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('[API] Request Accepted Screen - Full Payload Received:', data);
      if (data.success && data.request) {
        if (isMounted.current) {
          setRequest(data.request);
          setStatus(data.request.status || 'accepted');
          setMechanic(data.request.mechanic || null);
          setArrivalOtp(data.request.arrivalOtp || '');
          if (data.request.etaMinutes) setEta(`${data.request.etaMinutes} mins`);
          if (data.request.mechanicLocation) {
            setMechanicLoc(data.request.mechanicLocation);
          }
        }
      } else {
        Alert.alert('Error', data.message || 'Unable to load request');
      }
    } catch (e) {
      console.error('[REQUEST_ACCEPTED_FETCH_ERROR] Error fetching request:', e);
      Alert.alert('Error', 'Network error while fetching request');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Fetch request details on mount
  useEffect(() => {
    fetchRequestDetails();
  }, [requestId, token]);

  const handlePayment = async () => {
    if (paymentInProgress || !request) return;
    setPaymentInProgress(true);
    try {
      const finalPrice = request.accepted_price || request.pricing?.totalAmount || request.amount || 350;
      
      const response = await fetch(`${API_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: request._id,
          amount: finalPrice
        })
      });
      const data = await response.json();
      
      if (!data.success) {
        Alert.alert('Payment Error', data.message || 'Failed to create payment order');
        setPaymentInProgress(false);
        return;
      }

      // Open Razorpay Checkout
      const options = {
        description: 'Roadside Assistance Service',
        image: 'https://i.imgur.com/3g7A62K.png',
        key: data.keyId || 'rzp_test_YourKeyId',
        amount: Math.round(Number(finalPrice) * 100), // in paise
        currency: 'INR',
        order_id: data.orderId,
        name: 'RoadMitra RescueMe',
        prefill: {
          email: 'customer@roadmitra.com',
          contact: '9999999999',
          name: 'Customer App User'
        },
        theme: { color: '#27AE60' }
      };

      RazorpayCheckout.open(options)
        .then(async (paymentData) => {
          console.log('[Razorpay] Payment Success:', paymentData);
          // Verify signature on backend
          const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpay_order_id: paymentData.razorpay_order_id,
              razorpay_payment_id: paymentData.razorpay_payment_id,
              razorpay_signature: paymentData.razorpay_signature,
              requestId: request._id
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            Alert.alert('Success', 'Payment completed successfully!', [
              {
                text: 'Okay',
                onPress: () => {
                  navigation.navigate('Home');
                }
              }
            ]);
          } else {
            Alert.alert('Verification Failed', verifyData.message || 'Could not verify payment signature.');
          }
        })
        .catch((err) => {
          console.log('[Razorpay] Payment Cancelled/Failed:', err);
          Alert.alert('Payment Cancelled', 'Razorpay checkout was closed or payment failed.');
        })
        .finally(() => {
          setPaymentInProgress(false);
        });
    } catch (err) {
      console.error('[Payment Flow Error]', err);
      Alert.alert('Error', 'An unexpected error occurred during checkout.');
      setPaymentInProgress(false);
    }
  };

  // Socket listeners for live location, status, & ETA updates
  useEffect(() => {
    if (!token || !requestId) return undefined;
    const socket = getSocket(token);
    if (!socket) return undefined;

    // Join room for the specific request
    socket.emit('join:job:room', { jobId: requestId });

    const reconnectHandler = () => {
      console.log('[Socket] Reconnected - rejoining job room:', requestId);
      socket.emit('join:job:room', { jobId: requestId });
    };
    socket.on('connect', reconnectHandler);

    const locationHandler = coords => {
      try {
        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
          if (isMounted.current) {
            setMechanicLoc({ latitude: coords.lat, longitude: coords.lng });
          }
        }
      } catch (err) {
        console.error('[REQUEST_ACCEPTED_LISTENER_ERROR] Error handling mechanic location update:', err);
      }
    };
    const etaHandler = etaMinutes => {
      try {
        if (typeof etaMinutes === 'number') {
          if (isMounted.current) {
            setEta(`${etaMinutes} mins`);
          }
        }
      } catch (err) {
        console.error('[REQUEST_ACCEPTED_LISTENER_ERROR] Error handling ETA update:', err);
      }
    };
    const statusHandler = data => {
      console.log('[Socket Listener] job:status:changed fired with data:', data);
      try {
        if (data && data.status) {
          if (isMounted.current) {
            setStatus(data.status);
          }
          if (data.status === 'completed') {
            fetchRequestDetails();
          }
        }
      } catch (err) {
        console.error('[REQUEST_ACCEPTED_LISTENER_ERROR] Error handling job status change:', err);
      }
    };

    const paymentCompletedHandler = data => {
      try {
        console.log('[Socket] Payment Completed event received:', data);
        if (isMounted.current) {
          setRequest(prev => prev ? { ...prev, paymentStatus: 'paid' } : null);
          Alert.alert('Payment Successful', 'Thank you for your payment!', [
            {
              text: 'View Invoice',
              onPress: () => {
                Linking.openURL(`${API_URL}/api/requests/${requestId}/invoice`);
                if (isMounted.current && navigation) {
                  navigation.navigate('Home');
                }
              }
            },
            {
              text: 'Okay',
              onPress: () => {
                if (isMounted.current && navigation) {
                  navigation.navigate('Home');
                }
              }
            }
          ]);
        }
      } catch (err) {
        console.error('[REQUEST_ACCEPTED_LISTENER_ERROR] Error handling payment:completed:', err);
      }
    };

    const arrivalOtpHandler = data => {
      try {
        console.log('[Socket] RequestAcceptedScreen - Arrival OTP received:', data);
        if (data && data.otp) {
          if (isMounted.current) {
            setArrivalOtp(data.otp);
          }
        }
      } catch (err) {
        console.error('[Socket] Error handling arrival_otp in RequestAcceptedScreen:', err);
      }
    };

    socket.on('mechanic:location:update', locationHandler);
    socket.on('mechanic:eta:update', etaHandler);
    socket.on('job:status:changed', statusHandler);
    socket.on('payment:completed', paymentCompletedHandler);
    socket.on('arrival_otp', arrivalOtpHandler);

    return () => {
      socket.off('mechanic:location:update', locationHandler);
      socket.off('mechanic:eta:update', etaHandler);
      socket.off('job:status:changed', statusHandler);
      socket.off('payment:completed', paymentCompletedHandler);
      socket.off('arrival_otp', arrivalOtpHandler);
      socket.off('connect', reconnectHandler);
    };
  }, [token, requestId]);

  // Auto trigger payment checkout when status turns completed and paymentStatus is pending (and paymentMethod isn't cash)
  useEffect(() => {
    if (
      status === 'completed' &&
      request &&
      request.paymentStatus === 'pending' &&
      request.paymentMethod !== 'cash' &&
      !paymentInProgress
    ) {
      handlePayment();
    }
  }, [status, request]);

  // Calculate distance whenever locations change
  useEffect(() => {
    try {
      if (mechanicLoc && request?.customerLocation?.coordinates) {
        const [custLng, custLat] = request.customerLocation.coordinates;
        const dist = haversine(custLat, custLng, mechanicLoc.latitude, mechanicLoc.longitude);
        if (isMounted.current) {
          setDistance(dist.toFixed(1));
        }
      }
    } catch (err) {
      console.error('[REQUEST_ACCEPTED_MAP_ERROR] Error calculating distance:', err);
    }
  }, [mechanicLoc, request]);

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
        <Text style={styles.errorText}>Unable to load request details.</Text>
      </View>
    );
  }

  const handleCall = () => {
    if (mechanic?.phone) {
      Linking.openURL(`tel:${mechanic.phone}`);
    } else {
      Alert.alert('Error', 'Mechanic phone number is not available');
    }
  };

  const handleChat = () => {
    if (mechanic) {
      navigation.navigate('Chat', {
        jobId: requestId,
        receiverName: mechanic.name || 'Mechanic'
      });
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Cancelled', 'Your request has been cancelled');
        if (isMounted.current && navigation) {
          navigation.navigate('Home');
        }
      } else {
        Alert.alert('Error', data.message || 'Cancellation failed');
      }
    } catch (e) {
      console.error('[REQUEST_ACCEPTED_CANCEL_ERROR] Error cancelling request:', e);
      Alert.alert('Error', 'Network error while cancelling');
    }
    if (isMounted.current) {
      setShowCancelModal(false);
    }
  };

  // Determine current step index based on status
  const statusMap = {
    pending: 0,
    accepted: 1,
    on_the_way: 1,
    arrived: 2,
    work_in_progress: 2,
    completed: 3,
  };
  const currentStep = statusMap[status] ?? 1;

  const customerCoords = (() => {
    try {
      const coords = request.customerLocation?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2 && typeof coords[1] === 'number' && typeof coords[0] === 'number') {
        return { latitude: coords[1], longitude: coords[0] };
      }
    } catch (err) {
      console.error('[REQUEST_ACCEPTED_MAP_ERROR] Error parsing customer coords:', err);
    }
    return null;
  })();

  const formatServiceType = type => {
    if (!type) return 'Service';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatVehicleType = req => {
    if (req.vehicleModel) return req.vehicleModel;
    if (!req.vehicleType) return 'Car';
    return req.vehicleType.charAt(0).toUpperCase() + req.vehicleType.slice(1);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Accepted</Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={24} color="#1F2937" />
          <View style={styles.badgeDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusLeft}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </View>
            <View style={styles.statusTexts}>
              <Text style={styles.statusMain}>Mechanic is on the way</Text>
              <Text style={styles.statusSub}>Estimated Arrival</Text>
            </View>
          </View>
          <View style={styles.statusRight}>
            <Text style={styles.bannerEtaText}>{eta || '--'}</Text>
          </View>
        </View>

        {/* Progress Tracker */}
        <ProgressTracker currentStep={currentStep} />

        {/* Mechanic Info Card */}
        <View style={styles.mechanicCard}>
          <Image
            source={mechanic?.photo ? { uri: mechanic.photo } : require('../assets/mechanic-placeholder.png')}
            style={styles.mechanicAvatar}
          />
          <View style={styles.mechanicInfo}>
            <Text style={styles.mechanicName}>{mechanic?.name || 'Mechanic'}</Text>
            <View style={styles.mechanicMetaRow}>
              <MaterialCommunityIcons name="star" size={14} color="#F1C40F" />
              <Text style={styles.mechanicMetaText}> {mechanic?.rating?.toFixed(1) || '5.0'} (45)</Text>
              <FontAwesome5 name="wrench" size={12} color="#374151" style={styles.metaIcon} />
              <Text style={styles.mechanicMetaText}> {mechanic?.specialty || 'Generalist'} </Text>
              <MaterialCommunityIcons name="shield-check-outline" size={14} color="#374151" style={styles.metaIcon} />
              <Text style={styles.mechanicMetaText}> {mechanic?.experienceYears || 3} yrs</Text>
            </View>
          </View>
          <View style={styles.mechanicActions}>
            <TouchableOpacity style={styles.outlinedBtn} onPress={handleCall}>
              <Ionicons name="call" size={14} color="#27AE60" />
              <Text style={styles.outlinedBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlinedBtn} onPress={handleChat}>
              <MaterialCommunityIcons name="chat" size={14} color="#27AE60" />
              <Text style={styles.outlinedBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map View */}
        {customerCoords && (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: customerCoords.latitude,
              longitude: customerCoords.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            {isValidCoordinate(customerCoords) && (
              <Marker coordinate={customerCoords} pinColor="red" title="Your Location" />
            )}
            {isValidCoordinate(mechanicLoc) && (
              <Marker coordinate={mechanicLoc} title="Mechanic">
                <View style={styles.mechanicMarkerPin}>
                  {mechanic?.photo ? (
                    <Image source={{ uri: mechanic.photo }} style={styles.mechanicMarkerImage} />
                  ) : (
                    <Ionicons name="car-sport" size={20} color="#27AE60" />
                  )}
                </View>
              </Marker>
            )}
            {isValidCoordinate(mechanicLoc) && isValidCoordinate(customerCoords) && (
              <Polyline
                coordinates={[mechanicLoc, customerCoords]}
                strokeColor="#3498DB"
                strokeWidth={4}
              />
            )}
          </MapView>
        )}

        {/* Distance row */}
        {distance && (
          <View style={styles.distanceRow}>
            <Ionicons name="location-outline" size={16} color="#374151" />
            <Text style={styles.distanceText}>Distance: {distance} km</Text>
          </View>
        )}

        {/* Service Details Row */}
        <View style={styles.serviceDetailsCard}>
          <View style={styles.serviceColumn}>
            <MaterialCommunityIcons name="wrench" size={20} color="#27AE60" />
            <Text style={styles.serviceLabel}>Service</Text>
            <Text style={styles.serviceValue}>{formatServiceType(request.serviceType)}</Text>
          </View>
          <View style={styles.serviceColumn}>
            <Ionicons name="car" size={20} color="#27AE60" />
            <Text style={styles.serviceLabel}>Vehicle</Text>
            <Text style={styles.serviceValue}>{formatVehicleType(request)}</Text>
          </View>
          <View style={styles.serviceColumn}>
            <Ionicons name="pin" size={20} color="#27AE60" />
            <Text style={styles.serviceLabel}>Location</Text>
            <Text style={styles.serviceValue} numberOfLines={1}>{request.customerAddress || '--'}</Text>
          </View>
        </View>

        {/* Payment Row */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentHalf}>
            <FontAwesome5 name="wallet" size={18} color="#27AE60" />
            <Text style={styles.paymentLabel}>Service Charge</Text>
            <Text style={styles.paymentValue}>₹{request.accepted_price || request.pricing?.totalAmount || request.amount || 350}</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.paymentHalf}>
            <MaterialCommunityIcons name="credit-card" size={18} color="#27AE60" />
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentValue}>{request.paymentMethod ? request.paymentMethod.toUpperCase() : 'CASH'}</Text>
          </View>
        </View>

        {/* OTP Verification Card */}
        {status === 'arrived' && arrivalOtp ? <OTPDisplay otp={arrivalOtp} /> : null}

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {status === 'completed' ? (
            request.paymentStatus === 'paid' || request.paymentMethod === 'cash' ? (
              <View style={{ width: '100%', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.trackBtn, { backgroundColor: '#27AE60' }]}
                  onPress={() => Linking.openURL(`${API_URL}/api/requests/${requestId}/invoice`)}
                >
                  <Ionicons name="document-text" size={20} color="#fff" />
                  <Text style={styles.trackBtnText}>View Invoice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trackBtn}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Ionicons name="home" size={20} color="#fff" />
                  <Text style={styles.trackBtnText}>Return Home</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.trackBtn, paymentInProgress && { opacity: 0.7 }]}
                onPress={handlePayment}
                disabled={paymentInProgress}
              >
                {paymentInProgress ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="card" size={20} color="#fff" />
                    <Text style={styles.trackBtnText}>
                      Pay ₹{request.accepted_price || request.pricing?.totalAmount || request.amount || 350} Now
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )
          ) : (
            <>
              <TouchableOpacity style={styles.trackBtn} onPress={() => navigation.navigate('Tracking', { jobId: requestId })}>
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.trackBtnText}>Track Mechanic</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelModal(true)}>
                <Ionicons name="close" size={20} color="#E74C3C" />
                <Text style={styles.cancelBtnText}>Cancel Request</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Request</Text>
            <Text style={styles.modalMessage}>Are you sure you want to cancel this request? A cancellation fee may apply.</Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalBtnKeep} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalBtnKeepText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleCancel}>
                <Text style={styles.modalBtnConfirmText}>Cancel</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#E74C3C', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 50 },
  headerIconBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  badgeDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
  statusBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E8F8F5', borderRadius: 12, padding: 16, marginTop: 12 },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  checkCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#27AE60', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statusTexts: {},
  statusMain: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  statusSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusRight: {},
  bannerEtaText: { fontSize: 24, fontWeight: 'bold', color: '#27AE60' },
  progressContainer: {
    marginVertical: 16,
    paddingHorizontal: 10,
    position: 'relative',
  },
  progressLineBg: {
    position: 'absolute',
    top: 13,
    left: 40,
    right: 40,
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
    width: 80,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#B3B3B3',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCompleted: {
    backgroundColor: '#27AE60',
    borderColor: '#27AE60',
  },
  circleCurrent: {
    borderColor: '#27AE60',
    borderWidth: 2,
  },
  circleCurrentInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#27AE60',
  },
  circleLabel: { color: '#6B7280', fontSize: 12 },
  stepLabel: { fontSize: 10, color: '#374151', marginTop: 4, textAlign: 'center' },
  stepLabelCurrent: { color: '#27AE60', fontWeight: 'bold' },
  mechanicCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginVertical: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  mechanicAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
  mechanicInfo: { flex: 1 },
  mechanicName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  mechanicMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  mechanicMetaText: { fontSize: 11, color: '#4B5563', marginRight: 4 },
  metaIcon: { marginHorizontal: 2 },
  mechanicActions: { justifyContent: 'space-between', gap: 6 },
  outlinedBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#27AE60', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, minWidth: 70, justifyContent: 'center' },
  outlinedBtnText: { fontSize: 12, color: '#27AE60', marginLeft: 4, fontWeight: 'bold' },
  map: { height: 250, borderRadius: 12, marginTop: 12 },
  distanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  distanceText: { marginLeft: 4, fontSize: 12, color: '#4B5563', fontWeight: '600' },
  serviceDetailsCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  serviceColumn: { alignItems: 'center', flex: 1 },
  serviceLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  serviceValue: { fontSize: 13, fontWeight: 'bold', color: '#1F2937', marginTop: 2, textAlign: 'center' },
  paymentCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginTop: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  paymentHalf: { flex: 1, alignItems: 'center', padding: 16 },
  paymentLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  paymentValue: { fontSize: 14, fontWeight: 'bold', color: '#1F2937', marginTop: 2 },
  verticalDivider: { width: 1, backgroundColor: '#E5E7EB' },
  otpContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 12, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#27AE60' },
  otpHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  otpLabel: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  enterOtpLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  otpBoxes: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12, marginBottom: 12 },
  otpBox: { width: 48, height: 54, borderWidth: 1.5, borderColor: '#27AE60', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4FBF7' },
  otpDigit: { fontSize: 22, fontWeight: 'bold', color: '#27AE60' },
  otpHelper: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  bottomActions: { marginTop: 20, gap: 10 },
  trackBtn: { backgroundColor: '#27AE60', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, elevation: 2 },
  trackBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 6 },
  cancelBtn: { borderColor: '#E74C3C', borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  cancelBtnText: { color: '#E74C3C', fontSize: 16, fontWeight: 'bold', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 24 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtnKeep: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  modalBtnKeepText: { color: '#4B5563', fontWeight: 'bold', fontSize: 14 },
  modalBtnConfirm: { backgroundColor: '#E74C3C', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  modalBtnConfirmText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  mechanicMarkerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mechanicMarkerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

