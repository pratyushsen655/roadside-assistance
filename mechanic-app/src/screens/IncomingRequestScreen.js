import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, Platform, NativeModules, ScrollView, Linking, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';
import API_URL from '../config/api';
import { Ionicons } from '@expo/vector-icons';
import { playIncomingRequestSound, stopIncomingRequestSound } from '../services/soundService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

console.log('[BUILD CHECK] IncomingRequestScreen fix v2 loaded | Timestamp:', new Date().toISOString());

const { RingingModule } = NativeModules;

const IncomingRequestScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android' ? Math.max(insets.top, 24) : insets.top;
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 20) : insets.bottom;
  const { theme, isDark } = useTheme();
  const { mechanicToken, mechanic, mechanicLocation, pendingRequests, removePendingRequest } = useContext(AuthContext);
  const requestData = route.params?.requestData || route.params;
  const [fetchedRequest, setFetchedRequest] = useState(null);
  const activeData = fetchedRequest || requestData;

  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef(null);
  const actionTakenRef = useRef(false);

  const effectiveRequestId = activeData?.requestId || activeData?._id || route.params?.requestId;
  const effectiveCustomerName = activeData?.customerName || activeData?.customer?.name || 'Customer';
  const effectiveCustomerPhone = activeData?.customerPhone || activeData?.customer?.phone || '';
  const effectiveAddress = activeData?.customerAddress || activeData?.location || 'Customer Location';
  const effectiveDistance = activeData?.distanceKm !== undefined ? activeData.distanceKm : null;
  const effectiveService = activeData?.serviceType || activeData?.issueType || activeData?.issueDescription || 'Breakdown Assistance';
  const effectiveVehicle = activeData?.vehicleModel || activeData?.vehicleType || 'Vehicle';
  const effectiveNotes = activeData?.specialInstructions || activeData?.issueDescription || activeData?.description || 'Roadside breakdown assistance needed.';
  const effectivePrice = activeData?.current_price || activeData?.totalPrice || activeData?.amount || activeData?.pricing?.totalAmount || activeData?.price || activeData?.estimatedFare || 350;

  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null || isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return null;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getCustomerCoords = (data) => {
    if (!data) return null;
    let rawCoords = data.customerLocation?.coordinates || data.location?.coordinates;
    if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
      let c0 = Number(rawCoords[0]);
      let c1 = Number(rawCoords[1]);
      if (!isNaN(c0) && !isNaN(c1)) {
        if (c1 >= -90 && c1 <= 90 && c0 >= -180 && c0 <= 180) {
          // If c0 looks like India Latitude (8..37) and c1 looks like Longitude (68..97), swap them
          if (c0 >= 5 && c0 <= 40 && c1 >= 60 && c1 <= 100) {
            return { latitude: c0, longitude: c1 };
          }
          return { latitude: c1, longitude: c0 };
        }
      }
    }
    if (data.customerLocation?.latitude && data.customerLocation?.longitude) {
      return { latitude: Number(data.customerLocation.latitude), longitude: Number(data.customerLocation.longitude) };
    }
    if (data.lat !== undefined && data.lng !== undefined) {
      return { latitude: Number(data.lat), longitude: Number(data.lng) };
    }
    if (data.latitude !== undefined && data.longitude !== undefined) {
      return { latitude: Number(data.latitude), longitude: Number(data.longitude) };
    }
    return null;
  };

  const formatRelativeTime = (dateInput) => {
    if (!dateInput) {
      return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) {
      return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const diffSecs = Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / 1000));

    if (diffSecs < 60) {
      return `${timeStr} (${diffSecs}s ago)`;
    }
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) {
      return `${timeStr} (${diffMins}m ago)`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${timeStr} (${diffHours}h ago)`;
    }
    return dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formattedService = effectiveService ? String(effectiveService).replace(/_/g, ' ') : 'Flat/Puncture Repair';
  const formattedCustomer = effectiveCustomerName;
  const formattedPhone = effectiveCustomerPhone || '';
  const formattedVehicle = effectiveVehicle;
  const formattedNotes = effectiveNotes;
  const formattedPrice = effectivePrice;
  const formattedAddress = effectiveAddress;
  const formattedTimeAgo = formatRelativeTime(requestData?.createdAt || requestData?.created_at || requestData?.timestamp || activeData?.createdAt || activeData?.created_at || activeData?.timestamp);

  const custCoords = getCustomerCoords(activeData) || getCustomerCoords(requestData);
  let liveDistanceKm = null;
  if (mechanicLocation?.latitude && mechanicLocation?.longitude && custCoords?.latitude && custCoords?.longitude) {
    const rawHaversine = calculateHaversineDistance(
      mechanicLocation.latitude,
      mechanicLocation.longitude,
      custCoords.latitude,
      custCoords.longitude
    );
    if (rawHaversine !== null && !isNaN(rawHaversine) && rawHaversine <= 100) {
      liveDistanceKm = rawHaversine;
    }
  }

  const parsedEffDist = (effectiveDistance !== null && effectiveDistance !== undefined && !isNaN(effectiveDistance) && Number(effectiveDistance) <= 100)
    ? Number(effectiveDistance)
    : null;
  const finalDistVal = liveDistanceKm !== null ? liveDistanceKm : parsedEffDist;

  const formattedDistance = (finalDistVal !== null && finalDistVal !== undefined && !isNaN(finalDistVal) && finalDistVal <= 100)
    ? (finalDistVal < 1 ? `${Math.round(finalDistVal * 1000)} m away` : `${parseFloat(finalDistVal).toFixed(1)} km away`)
    : 'Location provided';

  console.log('[DIAG Mechanic IncomingRequestScreen]', JSON.stringify({
    jobId: effectiveRequestId,
    customerName: effectiveCustomerName,
    price: effectivePrice,
    customerLocation: requestData?.customerLocation
  }));

  const stopAllRingingAndNotifications = async () => {
    const targetNotifId = route.params?.notificationId || route.params?.requestData?.notificationId || requestData?.notificationId || effectiveRequestId;
    console.log('[IncomingRequestScreen] Stopping sound & cancelling Notifee notification(s). Target ID:', targetNotifId);

    try {
      await stopIncomingRequestSound();
    } catch (e) {
      console.log('[IncomingRequestScreen] soundService stop error:', e.message);
    }

    try {
      Vibration.cancel();
    } catch (e) {}

    try {
      if (Platform.OS === 'android' && RingingModule && typeof RingingModule.stopRinging === 'function') {
        RingingModule.stopRinging();
      }
    } catch (e) {
      console.log('[IncomingRequestScreen] RingingModule stop error:', e.message);
    }

    try {
      const notifee = require('@notifee/react-native').default;
      if (notifee) {
        if (targetNotifId && typeof notifee.cancelNotification === 'function') {
          await notifee.cancelNotification(targetNotifId);
        }
        if (typeof notifee.cancelAllNotifications === 'function') {
          await notifee.cancelAllNotifications();
        }
        if (typeof notifee.stopForegroundService === 'function') {
          await notifee.stopForegroundService();
        }
      }
    } catch (e) {
      console.log('[IncomingRequestScreen] Notifee cancel error:', e.message);
    }
  };

  useEffect(() => {
    if (!effectiveRequestId || !mechanicToken) return;
    const fetchDetails = async () => {
      try {
        const res = await fetch(`${API_URL}/api/requests/${effectiveRequestId}`, {
          headers: { Authorization: `Bearer ${mechanicToken}` }
        });
        const data = await res.json();
        if (data.success && data.request) {
          console.log('[IncomingRequestScreen] Fetched full request details from API:', data.request._id);
          setFetchedRequest(data.request);
        }
      } catch (err) {
        console.log('[IncomingRequestScreen] Error fetching details:', err.message);
      }
    };
    fetchDetails();
  }, [effectiveRequestId, mechanicToken]);

  useEffect(() => {
    if (!mechanicToken || !effectiveRequestId) {
      console.log(`[TRACE IncomingRequestScreen useEffect] Skipping socket listener hook - mechanicToken: ${!!mechanicToken}, effectiveRequestId: "${effectiveRequestId}"`);
      return;
    }

    let socket;
    try {
      socket = getSocket(mechanicToken);
      if (socket) {
        const handleRequestTimeout = (data) => {
          const eventReqId = (data?.requestId || data?._id)?.toString();
          const localReqId = effectiveRequestId?.toString();
          console.log(`[TRACE Socket Event: timeout] eventReqId: "${eventReqId}", localReqId: "${localReqId}"`);
          if (eventReqId && localReqId && eventReqId === localReqId) {
            console.log('[TRACE Socket Event: timeout] Match found! Resetting to Tabs...');
            stopAllRingingAndNotifications();
            navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
          }
        };

        const handleRequestCancelled = (data) => {
          const eventReqId = (data?.requestId || data?._id)?.toString();
          const localReqId = effectiveRequestId?.toString();
          console.log(`[TRACE Socket Event: cancelled] eventReqId: "${eventReqId}", localReqId: "${localReqId}"`);
          if (eventReqId && localReqId && eventReqId === localReqId) {
            console.log('[TRACE Socket Event: cancelled] Match found! Resetting to Tabs...');
            stopAllRingingAndNotifications();
            navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
          }
        };

        socket.on('incoming_request_timeout', handleRequestTimeout);
        socket.on('request_cancelled', handleRequestCancelled);
        socket.on('request:expired', handleRequestTimeout);

        return () => {
          socket.off('incoming_request_timeout', handleRequestTimeout);
          socket.off('request_cancelled', handleRequestCancelled);
          socket.off('request:expired', handleRequestTimeout);
        };
      }
    } catch (err) {
      console.warn('[Socket Listener Error]', err.message);
    }
  }, [mechanicToken, effectiveRequestId]);

  useEffect(() => {
    const isAutoAccept = route.params?.autoAccept === 'true' || route.params?.autoAccept === true || requestData?.autoAccept === 'true' || requestData?.autoAccept === true;
    if (isAutoAccept) {
      console.log('[IncomingRequestScreen] autoAccept flag detected from notification action button! Auto accepting...');
      handleAccept();
      return;
    }

    let initialSecs = 20;
    if (requestData?.expiresAt) {
      const expTime = new Date(requestData.expiresAt).getTime();
      if (!isNaN(expTime)) {
        initialSecs = Math.max(1, Math.min(300, Math.floor((expTime - Date.now()) / 1000)));
      }
    } else if (requestData?.createdAt) {
      const createdTime = new Date(requestData.createdAt).getTime();
      if (!isNaN(createdTime)) {
        const elapsedSecs = Math.floor((Date.now() - createdTime) / 1000);
        initialSecs = Math.max(1, Math.min(300, 300 - elapsedSecs));
      }
    }
    setTimeLeft(initialSecs);

    // Play request alert sound on screen mount
    playIncomingRequestSound();

    if (Platform.OS === 'android' && RingingModule && typeof RingingModule.startRinging === 'function') {
      RingingModule.startRinging();
    } else {
      Vibration.vibrate([1000, 1000], true);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      stopAllRingingAndNotifications();
    };
  }, [effectiveRequestId]);

  const handleTimeout = () => {
    console.log(`[TRACE IncomingRequestScreen handleTimeout] 20s Countdown expired for effectiveRequestId: "${effectiveRequestId}"`);
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    declineRequest('20s_timeout');
  };

  const handleDecline = () => {
    console.log('[DECLINE] Button pressed');
    console.log(`[TRACE IncomingRequestScreen handleDecline] User pressed Decline for effectiveRequestId: "${effectiveRequestId}"`);
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    declineRequest('user_decline');
  };

  const declineRequest = async (reason = 'unknown') => {
    console.log(`[DECLINE] Triggered declineRequest! Reason: "${reason}" | effectiveRequestId: "${effectiveRequestId}" | pendingRequests count: ${pendingRequests?.length || 0}`);
    stopAllRingingAndNotifications();

    try {
      if (effectiveRequestId) {
        removePendingRequest(effectiveRequestId);
        console.log(`[DECLINE] Sending PUT ${API_URL}/api/mechanic/requests/${effectiveRequestId}/reject`);
        const res = await fetch(`${API_URL}/api/mechanic/requests/${effectiveRequestId}/reject`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mechanicToken}`
          }
        });
        const resText = await res.text();
        console.log(`[DECLINE] Response HTTP ${res.status}:`, resText);
      } else {
        console.warn('[DECLINE] effectiveRequestId is missing or undefined!');
      }
    } catch (err) {
      console.error('[DECLINE] Fetch error in declineRequest:', err);
    } finally {
      stopAllRingingAndNotifications();
    }

    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  const handleAccept = async () => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;

    stopAllRingingAndNotifications();

    try {
      if (effectiveRequestId) {
        removePendingRequest(effectiveRequestId);
        const response = await fetch(`${API_URL}/api/mechanic/requests/${effectiveRequestId}/accept`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mechanicToken}`
          }
        });
        const data = await response.json();
        if (data.success) {
          try {
            const socket = getSocket(mechanicToken);
            if (socket) {
              socket.emit('job:accepted', {
                jobId: effectiveRequestId,
                mechanicName: mechanic?.name || 'Mechanic',
                mechanicPhone: mechanic?.phone || '+919999999999'
              });
            }
          } catch (e) {}

          navigation.reset({
            index: 0,
            routes: [
              { name: 'Tabs' },
              { name: 'OnTheWay', params: { requestId: effectiveRequestId } }
            ],
          });
          return;
        }
      }
    } catch (error) {
      console.error('[ACCEPT] Error accepting request:', error);
    } finally {
      stopAllRingingAndNotifications();
    }

    if (!effectiveRequestId) {
      Alert.alert('Error', 'Invalid request ID.');
      navigation.navigate('Tabs');
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        { name: 'Tabs' },
        { name: 'OnTheWay', params: { requestId: effectiveRequestId } }
      ],
    });
  };

  try {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* 1. DEEP INDIGO HEADER */}
        <View style={[styles.header, { backgroundColor: theme.headerBg, paddingTop: topInset + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={handleDecline}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{ width: 36 }} />
        </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 110 }]} showsVerticalScrollIndicator={false}>
        {/* BADGE & TIME */}
        <View style={styles.badgeRow}>
          <View style={styles.newRequestBadge}>
            <Text style={styles.newRequestText}>New Request</Text>
          </View>
          <Text style={styles.timeAgoText}>{formattedTimeAgo}</Text>
        </View>

        {/* SERVICE TITLE & PRICE */}
        <View style={styles.titlePriceRow}>
          <Text style={styles.serviceTitle}>{formattedService}</Text>
          <Text style={styles.priceText}>₹{formattedPrice}</Text>
        </View>

        {/* LOCATION & DISTANCE */}
        <View style={styles.locationContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color="#64748B" style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.addressText}>{formattedAddress}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="navigate-outline" size={16} color="#059669" style={{ marginRight: 8 }} />
            <Text style={styles.distanceText}>{formattedDistance}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* CUSTOMER DETAILS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <Ionicons name="person-outline" size={18} color="#362A84" />
            </View>
            <Text style={styles.sectionTitle}>Customer Details</Text>
          </View>

          <View style={styles.customerContentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{formattedCustomer}</Text>
              <Text style={styles.customerPhone}>{formattedPhone}</Text>
            </View>

            <View style={styles.contactActionButtons}>
              <TouchableOpacity style={styles.contactIconBtn} onPress={() => Linking.openURL(`tel:${formattedPhone}`)}>
                <Ionicons name="call-outline" size={18} color="#362A84" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactIconBtn, { marginLeft: 8 }]} onPress={() => navigation.navigate('Chat', { requestId })}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#362A84" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* VEHICLE DETAILS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <Ionicons name="car-outline" size={18} color="#362A84" />
            </View>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
          </View>
          <Text style={styles.vehicleInfoText}>{formattedVehicle}</Text>
        </View>

        {/* SPECIAL INSTRUCTIONS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconCircle}>
              <Ionicons name="document-text-outline" size={18} color="#362A84" />
            </View>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
          </View>
          <Text style={styles.instructionsText}>{formattedNotes}</Text>
        </View>

        {/* ESTIMATED EARNINGS */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Estimated Earnings</Text>
          <View style={styles.earningsAmountRow}>
            <Text style={styles.earningsAmount}>₹{formattedPrice}</Text>
            <Text style={styles.basePriceSub}>(Base Price)</Text>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset + 8, 16) }]}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.rejectBtn} onPress={handleDecline}>
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
            <Text style={styles.acceptBtnText}>Accept Job</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.timerRow}>
          <Ionicons name="time-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.timerBarText}>Auto accept in {timeLeft} sec</Text>
        </View>
        <View style={styles.timerBarTrack}>
          <View style={[styles.timerBarFill, { width: `${(timeLeft / 20) * 100}%` }]} />
        </View>
      </View>
    </View>
  );
  } catch (renderError) {
    console.error('[CRITICAL IncomingRequestScreen RENDER ERROR]', renderError);
    Alert.alert('RENDER ERROR', renderError.message || String(renderError));
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <Text style={{ fontSize: 16, color: '#EF4444', fontWeight: 'bold' }}>Error rendering request</Text>
        <TouchableOpacity style={{ marginTop: 20, padding: 12, backgroundColor: '#362A84', borderRadius: 8 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#FFF' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
};

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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  newRequestBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newRequestText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeAgoText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
  },
  locationContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    lineHeight: 20,
  },
  distanceText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#362A84',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  customerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  customerPhone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  contactActionButtons: {
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
  vehicleInfoText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  instructionsText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#362A84',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  earningsLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  earningsAmountRow: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  basePriceSub: {
    fontSize: 11,
    color: '#64748B',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  rejectBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#362A84',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  timerBarText: {
    fontSize: 11,
    color: '#64748B',
  },
  timerBarTrack: {
    height: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: '#362A84',
    borderRadius: 2,
  },
});

export default IncomingRequestScreen;
