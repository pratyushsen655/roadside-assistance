import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, Platform, NativeModules, ScrollView, Linking, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';
import API_URL from '../config/api';
import { Ionicons } from '@expo/vector-icons';

console.log('[BUILD CHECK] IncomingRequestScreen fix v2 loaded | Timestamp:', new Date().toISOString());

const { RingingModule } = NativeModules;

const IncomingRequestScreen = ({ route, navigation }) => {
  const { mechanicToken, mechanic, pendingRequests, removePendingRequest } = useContext(AuthContext);
  const requestData = route.params?.requestData || (pendingRequests && pendingRequests.length > 0 ? pendingRequests[0] : null);

  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef(null);
  const actionTakenRef = useRef(false);

  const effectiveRequestId = requestData?.requestId || requestData?._id || route.params?.requestId;
  const effectiveCustomerName = requestData?.customerName || requestData?.customer?.name || 'Customer';
  const effectiveCustomerPhone = requestData?.customerPhone || requestData?.customer?.phone || '';
  const effectiveAddress = requestData?.customerAddress || requestData?.location || 'Customer Location';
  const effectiveDistance = requestData?.distanceKm !== undefined ? requestData.distanceKm : null;
  const effectiveService = requestData?.serviceType || requestData?.issueType || requestData?.issueDescription || 'Breakdown Assistance';
  const effectiveVehicle = requestData?.vehicleModel || requestData?.vehicleType || 'Vehicle';
  const effectiveNotes = requestData?.specialInstructions || requestData?.issueDescription || requestData?.description || 'Roadside breakdown assistance needed.';
  const effectivePrice = requestData?.price || requestData?.estimatedFare || requestData?.pricing?.totalAmount || requestData?.current_price || 350;

  const formattedService = effectiveService ? String(effectiveService).replace(/_/g, ' ') : 'Flat/Puncture Repair';
  const formattedCustomer = effectiveCustomerName;
  const formattedPhone = effectiveCustomerPhone || '+91 98765 43210';
  const formattedVehicle = effectiveVehicle;
  const formattedNotes = effectiveNotes;
  const formattedPrice = effectivePrice;
  const formattedAddress = effectiveAddress;
  const formattedDistance = effectiveDistance !== null ? `${parseFloat(effectiveDistance).toFixed(1)} km away` : 'Nearby';

  console.log(`[TRACE IncomingRequestScreen Mount] effectiveRequestId: "${effectiveRequestId}" | pendingRequests count: ${pendingRequests?.length || 0} | route params:`, route.params);

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
            if (Platform.OS === 'android' && RingingModule) {
              RingingModule.stopRinging();
            } else {
              Vibration.cancel();
            }
            navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
          }
        };

        const handleRequestCancelled = (data) => {
          const eventReqId = (data?.requestId || data?._id)?.toString();
          const localReqId = effectiveRequestId?.toString();
          console.log(`[TRACE Socket Event: cancelled] eventReqId: "${eventReqId}", localReqId: "${localReqId}"`);
          if (eventReqId && localReqId && eventReqId === localReqId) {
            console.log('[TRACE Socket Event: cancelled] Match found! Resetting to Tabs...');
            if (Platform.OS === 'android' && RingingModule) {
              RingingModule.stopRinging();
            } else {
              Vibration.cancel();
            }
            navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
          }
        };

        socket.on('incoming_request_timeout', handleRequestTimeout);
        socket.on('request_cancelled', handleRequestCancelled);

        return () => {
          socket.off('incoming_request_timeout', handleRequestTimeout);
          socket.off('request_cancelled', handleRequestCancelled);
        };
      }
    } catch (err) {
      console.warn('[Socket Listener Error]', err.message);
    }
  }, [mechanicToken, effectiveRequestId]);

  useEffect(() => {
    if (Platform.OS === 'android' && RingingModule) {
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
      if (Platform.OS === 'android' && RingingModule) {
        RingingModule.stopRinging();
      } else {
        Vibration.cancel();
      }
    };
  }, [effectiveRequestId]);

  const handleTimeout = () => {
    console.log(`[TRACE IncomingRequestScreen handleTimeout] 20s Countdown expired for effectiveRequestId: "${effectiveRequestId}"`);
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    declineRequest('20s_timeout');
  };

  const handleDecline = () => {
    console.log(`[TRACE IncomingRequestScreen handleDecline] User pressed Decline for effectiveRequestId: "${effectiveRequestId}"`);
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    declineRequest('user_decline');
  };

  const declineRequest = async (reason = 'unknown') => {
    console.log(`[TRACE IncomingRequestScreen declineRequest] Triggered! Reason: "${reason}" | effectiveRequestId: "${effectiveRequestId}" | pendingRequests count: ${pendingRequests?.length || 0}`);
    if (Platform.OS === 'android' && RingingModule) {
      RingingModule.stopRinging();
    } else {
      Vibration.cancel();
    }

    try {
      if (effectiveRequestId) {
        removePendingRequest(effectiveRequestId);
        await fetch(`${API_URL}/api/mechanic/requests/${effectiveRequestId}/reject`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mechanicToken}`
          }
        });
      }
    } catch (err) {}

    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  const handleAccept = async () => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;

    if (Platform.OS === 'android' && RingingModule) {
      RingingModule.stopRinging();
    } else {
      Vibration.cancel();
    }

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
    } catch (error) {}

    navigation.reset({
      index: 0,
      routes: [
        { name: 'Tabs' },
        { name: 'OnTheWay', params: { requestId: effectiveRequestId || 'demo_active_id' } }
      ],
    });
  };

  try {
    return (
      <View style={styles.container}>
        {/* 1. DEEP INDIGO HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleDecline}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{ width: 36 }} />
        </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BADGE & TIME */}
        <View style={styles.badgeRow}>
          <View style={styles.newRequestBadge}>
            <Text style={styles.newRequestText}>New Request</Text>
          </View>
          <Text style={styles.timeAgoText}>2 min ago</Text>
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
      <View style={styles.bottomBar}>
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
