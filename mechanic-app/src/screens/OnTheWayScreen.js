// src/screens/OnTheWayScreen.js
import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking, Modal, TextInput, Platform, SafeAreaView, StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';
import API_URL from '../config/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toRad = deg => (deg * Math.PI) / 180;
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const calcEta = km => Math.max(1, Math.round((km / 30) * 60));
const isValidCoord = c =>
  c &&
  typeof c.latitude === 'number' && !isNaN(c.latitude) &&
  typeof c.longitude === 'number' && !isNaN(c.longitude) &&
  (c.latitude !== 0 || c.longitude !== 0);

const formatService = type => {
  if (!type) return null;
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// ─── Step Tracker ─────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Accepted', icon: 'checkmark', lib: 'Ionicons' },
  { label: 'On the Way', icon: 'bicycle', lib: 'Ionicons' },
  { label: 'Arrived', icon: 'person', lib: 'Ionicons' },
  { label: 'Completed', icon: 'construct', lib: 'Ionicons' },
];

const ProgressTracker = ({ currentStep = 1 }) => (
  <View style={styles.trackerWrapper}>
    <View style={styles.trackerInner}>
      {STEPS.map((step, idx) => {
        const done = idx < currentStep;
        const active = idx === currentStep;
        const circleBg = done || active ? '#27AE60' : '#D1D5DB';
        const lineDone = idx < currentStep;

        return (
          <React.Fragment key={step.label}>
            <View style={styles.trackerStep}>
              <View style={[styles.trackerCircle, { backgroundColor: circleBg }]}>
                <Ionicons name={step.icon} size={14} color="#fff" />
              </View>
              <Text style={[
                styles.trackerLabel,
                active && styles.trackerLabelActive,
              ]}>
                {step.label}
              </Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[styles.trackerLine, lineDone ? styles.trackerLineDone : styles.trackerLinePending]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const OnTheWayScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { requestId } = route.params || {};
  const { mechanicToken } = useContext(AuthContext);

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  const [loading, setLoading]               = useState(true);
  const [request, setRequest]               = useState(null);
  const [mechanicLoc, setMechanicLoc]       = useState(null);
  const [lastLoggedLoc, setLastLoggedLoc]   = useState(null);
  const [eta, setEta]                       = useState(null);
  const [distance, setDistance]             = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showOtpModal, setShowOtpModal]     = useState(false);
  const [otpVal, setOtpVal]                 = useState(['', '', '', '']);
  const [otpLoading, setOtpLoading]         = useState(false);
  const [otpError, setOtpError]             = useState('');
  const [cancelReason, setCancelReason]     = useState('');

  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  // ── Fetch request data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!requestId || !mechanicToken) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/requests/${requestId}`, {
          headers: { Authorization: `Bearer ${mechanicToken}` },
        });
        const data = await res.json();
        if (data.success && data.request) {
          if (isMounted.current) setRequest(data.request);
        } else {
          Alert.alert('Error', data.message || 'Unable to load request');
          if (isMounted.current) navigation.navigate('Home');
        }
      } catch (e) {
        console.error('[OnTheWay] fetch error:', e);
        Alert.alert('Error', 'Network error loading request');
      } finally {
        if (isMounted.current) setLoading(false);
      }
    })();
  }, [requestId, mechanicToken]);

  // ── GPS tracking ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mechanicToken || !requestId) return;
    let sub;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const init = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: init.coords.latitude, longitude: init.coords.longitude };
        if (isMounted.current) { setMechanicLoc(coords); setLastLoggedLoc(coords); }

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
          loc => {
            const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            if (isMounted.current) setMechanicLoc(c);
            try {
              const socket = getSocket(mechanicToken);
              if (socket) socket.emit('mechanic:location', { jobId: requestId, lat: c.latitude, lng: c.longitude });
            } catch (_) {}
          }
        );
      } catch (err) { console.log('[OnTheWay] GPS error:', err); }
    })();
    return () => sub?.remove();
  }, [mechanicToken, requestId]);

  // ── Distance / ETA ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mechanicLoc || !request?.customerLocation?.coordinates) return;
    const [custLng, custLat] = request.customerLocation.coordinates;
    const dist = haversine(custLat, custLng, mechanicLoc.latitude, mechanicLoc.longitude);

    if (!lastLoggedLoc) {
      if (isMounted.current) { setDistance(dist.toFixed(1)); setEta(calcEta(dist)); setLastLoggedLoc(mechanicLoc); }
    } else {
      const moved = haversine(lastLoggedLoc.latitude, lastLoggedLoc.longitude, mechanicLoc.latitude, mechanicLoc.longitude) * 1000;
      if (moved >= 50) {
        if (isMounted.current) { setDistance(dist.toFixed(1)); setEta(calcEta(dist)); setLastLoggedLoc(mechanicLoc); }
      }
    }
  }, [mechanicLoc, request, lastLoggedLoc]);

  // ── Socket — customer cancels ──────────────────────────────────────────────
  useEffect(() => {
    if (!mechanicToken || !requestId) return;
    const socket = getSocket(mechanicToken);
    if (!socket) return;
    socket.emit('join:job:room', { jobId: requestId });
    const handler = () =>
      Alert.alert('Job Cancelled', 'The customer has cancelled this job.', [
        { text: 'OK', onPress: () => { if (isMounted.current) navigation.navigate('Home'); } },
      ]);
    socket.on('request:cancelled', handler);
    return () => socket.off('request:cancelled', handler);
  }, [mechanicToken, requestId]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const customerCoords = (() => {
    try {
      const loc = request?.customerLocation;
      if (!loc) return null;
      if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
        const [lng, lat] = loc.coordinates;
        if (typeof lat === 'number' && !isNaN(lat) && (lat !== 0 || lng !== 0))
          return { latitude: lat, longitude: lng };
      }
      const lat = loc.latitude ?? loc.lat;
      const lng = loc.longitude ?? loc.lng;
      if (typeof lat === 'number' && !isNaN(lat) && (lat !== 0 || lng !== 0))
        return { latitude: lat, longitude: lng };
    } catch (_) {}
    return null;
  })();

  const customerObj = request?.customer || {};
  const customerName =
    (typeof customerObj === 'object' && customerObj?.name) ||
    request?.customerName ||
    null;
  const customerPhone =
    (typeof customerObj === 'object' && customerObj?.phone) ||
    request?.customerPhone ||
    null;
  const jobPrice =
    request?.accepted_price ||
    request?.current_price ||
    request?.totalPrice ||
    request?.amount ||
    request?.pricing?.totalAmount ||
    request?.price ||
    null;
  const serviceLabel = formatService(request?.serviceType);
  const vehicleName =
    request?.vehicleModel ||
    (request?.vehicleType ? formatService(request.vehicleType) : null);

  const handleCall = () => {
    if (customerPhone) {
      Linking.openURL(`tel:${customerPhone}`);
    } else {
      Alert.alert('Unavailable', 'Customer phone number is not available for this job.');
    }
  };

  const handleChat = () =>
    navigation.navigate('Chat', { jobId: requestId, receiverName: customerName || 'Customer' });

  const handleNavigate = () => {
    if (!customerCoords) return;
    const { latitude: lat, longitude: lng } = customerCoords;
    const url =
      Platform.OS === 'ios'
        ? `maps://app?daddr=${lat},${lng}`
        : `google.navigation:q=${lat},${lng}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open maps'));
  };

  const handleArrived = async () => {
    if (!mechanicLoc || !customerCoords) {
      Alert.alert('Error', 'Location data missing. Please wait for GPS to initialise.');
      return;
    }
    const distMetres =
      haversine(customerCoords.latitude, customerCoords.longitude, mechanicLoc.latitude, mechanicLoc.longitude) * 1000;
    if (distMetres > 200) {
      Alert.alert(
        'Too Far Away',
        `You are ${(distMetres / 1000).toFixed(1)} km from the customer. Move within 200 m to confirm arrival.`
      );
      return;
    }
    try {
      setOtpLoading(true);
      const res = await fetch(`${API_URL}/api/requests/${requestId}/mark-arrived`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mechanicToken}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        if (isMounted.current) { setOtpVal(['', '', '', '']); setShowOtpModal(true); }
      } else {
        Alert.alert('Error', data.message || 'Unable to update arrival status');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      if (isMounted.current) setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpVal.join('');
    if (code.length < 4) { Alert.alert('Invalid OTP', 'Enter the full 4-digit code from the customer.'); return; }
    setOtpLoading(true); setOtpError('');
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}/verify-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mechanicToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      });
      const data = await res.json();
      if (data.success) {
        if (isMounted.current) setShowOtpModal(false);
        Alert.alert('Verified!', 'Starting service job.', [
          {
            text: 'Go to Job Screen',
            onPress: () => {
              if (isMounted.current)
                navigation.navigate('ActiveJob', {
                  jobId: requestId,
                  status: 'in_progress',
                  customerLocation: request.customerLocation,
                  customerName,
                  customerPhone,
                  customerAddress: request.customerAddress || '',
                  issue: request.issueDescription || request.serviceType || '',
                });
            },
          },
        ]);
      } else {
        if (isMounted.current) setOtpError(data.message || 'Incorrect OTP. Please try again.');
      }
    } catch (e) {
      if (isMounted.current) setOtpError('Connection error. Please try again.');
    } finally {
      if (isMounted.current) setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpLoading(true); setOtpError('');
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}/mark-arrived`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mechanicToken}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        if (isMounted.current) setOtpVal(['', '', '', '']);
        Alert.alert('OTP Sent', 'A new code has been sent to the customer.');
      } else {
        if (isMounted.current) setOtpError(data.message || 'Failed to resend OTP.');
      }
    } catch (_) {
      if (isMounted.current) setOtpError('Network error.');
    } finally {
      if (isMounted.current) setOtpLoading(false);
    }
  };

  const handleCancelJob = async () => {
    try {
      const res = await fetch(`${API_URL}/api/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mechanicToken}` },
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by mechanic' }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Cancelled', 'Job cancelled successfully.');
        if (isMounted.current) navigation.navigate('Home');
      } else {
        Alert.alert('Error', data.message || 'Cancellation failed.');
      }
    } catch (_) {
      Alert.alert('Error', 'Network error during cancellation.');
    }
    if (isMounted.current) setShowCancelModal(false);
  };

  const updateOtp = (text, idx) => {
    setOtpError('');
    const cleaned = text.replace(/[^0-9]/g, '');
    const next = [...otpVal];
    next[idx] = cleaned;
    setOtpVal(next);
    if (cleaned && idx < 3) otpRefs[idx + 1].current?.focus();
  };

  const handleOtpKey = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otpVal[idx] && idx > 0)
      otpRefs[idx - 1].current?.focus();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#27AE60" />
      </View>
    );
  }
  if (!request) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Unable to load job details.</Text>
      </View>
    );
  }

  const etaLabel = eta != null ? `${eta} mins` : '—';
  const distLabel = distance != null ? `${distance} km` : '—';

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B6B3A" />

      {/* ── STATUS BAR HEADER ── */}
      <View style={styles.statusHeader}>
        <View style={styles.statusHeaderLeft}>
          <View style={styles.scooterBadge}>
            <MaterialCommunityIcons name="scooter" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.statusHeaderTitle}>On the Way</Text>
            <Text style={styles.statusHeaderSub}>Head to the customer location</Text>
          </View>
        </View>
        <View style={styles.etaBox}>
          <Text style={styles.etaBoxLabel}>ETA</Text>
          <Text style={styles.etaBoxVal}>{etaLabel}</Text>
        </View>
      </View>

      {/* ── PROGRESS TRACKER ── */}
      <View style={styles.trackerCard}>
        <ProgressTracker currentStep={1} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── CUSTOMER CARD ── */}
        <View style={styles.card}>
          <View style={styles.customerRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={28} color="#fff" />
            </View>
            <View style={styles.customerMeta}>
              {customerName ? (
                <Text style={styles.customerName}>{customerName}</Text>
              ) : (
                <Text style={styles.noDataText}>Customer name unavailable</Text>
              )}
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <Ionicons name="call" size={18} color="#27AE60" />
              <Text style={styles.actionBtnLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { marginLeft: 8 }]} onPress={handleChat}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#27AE60" />
              <Text style={styles.actionBtnLabel}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SERVICE DETAILS CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="wrench" size={16} color="#27AE60" />
            <Text style={styles.cardTitle}>Service Details</Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>{serviceLabel || <Text style={styles.noDataText}>—</Text>}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>{vehicleName || <Text style={styles.noDataText}>—</Text>}</Text>
            </View>
            {request?.vehicleNumber ? (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Ionicons name="id-card-outline" size={12} color="#27AE60" style={{ marginRight: 4 }} />
                    <Text style={styles.detailLabel}>Vehicle No.</Text>
                  </View>
                  <Text style={[styles.detailValue, { fontWeight: '700' }]}>{request.vehicleNumber}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* ── CUSTOMER LOCATION CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location" size={16} color="#27AE60" />
            <Text style={styles.cardTitle}>Customer Location</Text>
          </View>

          {request?.customerAddress ? (
            <Text style={styles.addressText}>{request.customerAddress}</Text>
          ) : customerCoords ? (
            <Text style={styles.addressText}>
              {customerCoords.latitude.toFixed(5)}, {customerCoords.longitude.toFixed(5)}
            </Text>
          ) : (
            <Text style={styles.noDataText}>Address not available</Text>
          )}

          <View style={styles.distEtaRow}>
            <View style={styles.distEtaItem}>
              <MaterialCommunityIcons name="wrench" size={14} color="#64748B" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.distEtaLabel}>Distance</Text>
                <Text style={styles.distEtaVal}>{distLabel}</Text>
              </View>
            </View>
            <View style={styles.distEtaDivider} />
            <View style={styles.distEtaItem}>
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.distEtaLabel}>ETA</Text>
                <Text style={styles.distEtaVal}>{etaLabel}</Text>
              </View>
            </View>
          </View>

          {/* MAP */}
          <View style={styles.mapWrapper}>
            {isValidCoord(customerCoords) ? (
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: customerCoords.latitude,
                  longitude: customerCoords.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
              >
                {isValidCoord(mechanicLoc) && (
                  <Marker coordinate={mechanicLoc} title="Your Location">
                    <View style={styles.myMarker} />
                  </Marker>
                )}
                <Marker coordinate={customerCoords} title="Customer Location">
                  <View style={styles.custMarker}>
                    <Ionicons name="location" size={22} color="#EF4444" />
                  </View>
                </Marker>
                {isValidCoord(mechanicLoc) && (
                  <Polyline
                    coordinates={[mechanicLoc, customerCoords]}
                    strokeColor="#2563EB"
                    strokeWidth={3}
                    lineDashPattern={[6, 3]}
                  />
                )}
              </MapView>
            ) : (
              <View style={styles.mapFallback}>
                <Ionicons name="map-outline" size={36} color="#94A3B8" />
                <Text style={styles.mapFallbackText}>Map unavailable — location not set</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── ACTION ROW ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.navBtn} onPress={handleNavigate} activeOpacity={0.85}>
            <Ionicons name="navigate" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.navBtnText}>Start Navigation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.85}>
            <Ionicons name="call" size={16} color="#27AE60" style={{ marginRight: 4 }} />
            <Text style={styles.callBtnText}>Call Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatBtn} onPress={handleChat} activeOpacity={0.85}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#27AE60" style={{ marginRight: 4 }} />
            <Text style={styles.chatBtnText}>Chat</Text>
          </TouchableOpacity>
        </View>

        {/* ── SAFETY NOTE ── */}
        <View style={styles.safetyCard}>
          <Ionicons name="shield-checkmark" size={18} color="#D97706" style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.safetyTitle}>Safety First</Text>
            <Text style={styles.safetyText}>Please follow traffic rules and reach the customer safely.</Text>
          </View>
        </View>

        {/* ── ARRIVED BUTTON ── */}
        <TouchableOpacity
          style={styles.arrivedBtn}
          onPress={handleArrived}
          disabled={otpLoading}
          activeOpacity={0.88}
        >
          {otpLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.arrivedBtnText}>I've Arrived at Location</Text>
          )}
        </TouchableOpacity>

        {/* ── CANCEL JOB ── */}
        <TouchableOpacity style={styles.cancelJobBtn} onPress={() => setShowCancelModal(true)} activeOpacity={0.85}>
          <Ionicons name="close-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={styles.cancelJobBtnText}>Cancel Job</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── CANCEL MODAL ── */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Job</Text>
            <Text style={styles.modalMsg}>Are you sure? Frequent cancellations may affect your rating.</Text>
            <TextInput
              style={styles.cancelInput}
              placeholder="Reason for cancellation (optional)"
              placeholderTextColor="#94A3B8"
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.keepBtn} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.keepBtnText}>Keep Job</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={handleCancelJob}>
                <Text style={styles.confirmCancelText}>Cancel Job</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── OTP MODAL ── */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => setShowOtpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.otpHeader}>
              <Ionicons name="shield-checkmark" size={22} color="#27AE60" />
              <Text style={styles.otpTitle}>Verify Arrival OTP</Text>
            </View>
            <Text style={styles.otpMsg}>Ask the customer for the 4-digit code shown on their screen.</Text>
            {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}
            <View style={styles.otpRow}>
              {otpVal.map((d, i) => (
                <TextInput
                  key={i}
                  ref={otpRefs[i]}
                  style={styles.otpBox}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={d}
                  onChangeText={t => updateOtp(t, i)}
                  onKeyPress={e => handleOtpKey(e, i)}
                  selectTextOnFocus
                />
              ))}
            </View>
            <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp} disabled={otpLoading}>
              <Text style={styles.resendBtnText}>Resend OTP</Text>
            </TouchableOpacity>
            <View style={styles.otpActions}>
              <TouchableOpacity style={styles.otpCancelBtn} onPress={() => setShowOtpModal(false)}>
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.otpVerifyBtn, (otpLoading || otpVal.some(d => !d)) && { opacity: 0.5 }]}
                onPress={handleVerifyOtp}
                disabled={otpLoading || otpVal.some(d => !d)}
              >
                {otpLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.otpVerifyText}>Verify & Start Job</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const GREEN = '#27AE60';
const DARK_GREEN = '#1B6B3A';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7F5' },
  errorText: { color: '#EF4444', fontSize: 15, marginTop: 12 },

  // Status Header
  statusHeader: {
    backgroundColor: DARK_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  statusHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  scooterBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  statusHeaderTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  statusHeaderSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 1 },
  etaBox: { alignItems: 'flex-end' },
  etaBoxLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  etaBoxVal: { color: GREEN, fontSize: 22, fontWeight: '800' },

  // Tracker
  trackerCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  trackerWrapper: { width: '100%' },
  trackerInner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  trackerStep: { alignItems: 'center', width: 60 },
  trackerCircle: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  trackerLabel: { fontSize: 11, color: '#94A3B8', textAlign: 'center', fontWeight: '500' },
  trackerLabelActive: { color: GREEN, fontWeight: '700' },
  trackerLine: { flex: 1, height: 2, marginTop: 15, borderStyle: 'dashed', borderWidth: 1 },
  trackerLineDone: { borderColor: GREEN },
  trackerLinePending: { borderColor: '#D1D5DB' },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 40 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginLeft: 6 },

  // Customer
  customerRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#64748B', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  customerMeta: { flex: 1 },
  customerName: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  noDataText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: GREEN, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  actionBtnLabel: { color: GREEN, fontSize: 13, fontWeight: '600', marginLeft: 5 },

  // Service Details
  detailsGrid: { flexDirection: 'row', alignItems: 'flex-start' },
  detailCol: { flex: 1 },
  detailDivider: { width: 1, height: 40, backgroundColor: '#E2E8F0', marginHorizontal: 12, alignSelf: 'center' },
  detailLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },

  // Address & Distance
  addressText: { fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 19 },
  distEtaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 12 },
  distEtaItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  distEtaDivider: { width: 1, height: 28, backgroundColor: '#E2E8F0', marginHorizontal: 12 },
  distEtaLabel: { fontSize: 11, color: '#94A3B8' },
  distEtaVal: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  // Map
  mapWrapper: { height: 180, borderRadius: 12, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  mapFallback: { flex: 1, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  mapFallbackText: { color: '#94A3B8', fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  myMarker: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#fff' },
  custMarker: { backgroundColor: '#fff', borderRadius: 12, padding: 2 },

  // Action Row
  actionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  navBtn: {
    flex: 2, backgroundColor: GREEN, borderRadius: 10,
    paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  callBtn: {
    flex: 1.2, borderWidth: 1.5, borderColor: GREEN, borderRadius: 10,
    paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff',
  },
  callBtnText: { color: GREEN, fontWeight: '700', fontSize: 12 },
  chatBtn: {
    flex: 1, borderWidth: 1.5, borderColor: GREEN, borderRadius: 10,
    paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff',
  },
  chatBtnText: { color: GREEN, fontWeight: '700', fontSize: 12 },

  // Safety
  safetyCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  safetyTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 2 },
  safetyText: { fontSize: 12, color: '#92400E', lineHeight: 17 },

  // Arrived / Cancel
  arrivedBtn: {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10,
  },
  arrivedBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  cancelJobBtn: {
    borderWidth: 1.5, borderColor: '#FECACA', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', backgroundColor: '#fff', marginBottom: 4,
  },
  cancelJobBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', width: '88%', borderRadius: 16, padding: 22 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  modalMsg: { fontSize: 13, color: '#64748B', marginBottom: 14 },
  cancelInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 13, color: '#1E293B' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  keepBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  keepBtnText: { color: '#64748B', fontWeight: '600' },
  confirmCancelBtn: { backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16 },
  confirmCancelText: { color: '#fff', fontWeight: '700' },

  // OTP
  otpHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  otpTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  otpMsg: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  otpError: { color: '#EF4444', fontSize: 12, marginBottom: 10 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  otpBox: {
    width: 52, height: 56, borderWidth: 1.5, borderColor: GREEN,
    borderRadius: 10, textAlign: 'center', fontSize: 22, fontWeight: '700', color: '#0F172A',
  },
  resendBtn: { alignSelf: 'center', marginBottom: 16 },
  resendBtnText: { color: GREEN, fontSize: 13, fontWeight: '600' },
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  otpCancelBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  otpCancelText: { color: '#64748B', fontWeight: '600' },
  otpVerifyBtn: { flex: 2, backgroundColor: GREEN, borderRadius: 8, paddingVertical: 11, alignItems: 'center' },
  otpVerifyText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default OnTheWayScreen;
