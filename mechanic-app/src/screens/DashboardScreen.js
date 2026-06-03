import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  TextInput,
  ScrollView
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { AuthContext, API_URL } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';

const { width, height } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { mechanic, toggleAvailability, refreshProfile, logout } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  // Geo states
  const [location, setLocation] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
  });
  const [mapRegion, setMapRegion] = useState(null);

  // Core workflows states
  const [activeRequest, setActiveRequest] = useState(null);
  const [incomingRequestAlert, setIncomingRequestAlert] = useState(null);
  const [countdown, setCountdown] = useState(30);

  // PIN validation
  const [startOTP, setStartOTP] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Status transitions
  const [statusLoading, setStatusLoading] = useState(false);

  // Earnings tab state
  const [walletStats, setWalletStats] = useState(null);

  const mapRef = useRef(null);
  const watchSubscription = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // 1. Initial configuration
    setupGPS();
    fetchActiveRequest();
    fetchEarningsSummary();

    // 2. Poll KYC / status checks
    const interval = setInterval(() => {
      refreshProfile();
    }, 15000);

    return () => {
      clearInterval(interval);
      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Socket bindings
  useEffect(() => {
    if (!socket) return;

    // Join room
    if (mechanic) {
      socket.emit('join_room', { id: mechanic._id, role: 'mechanic' });
    }

    socket.on('new_breakdown_request', (data) => {
      console.log('[Socket Mechanic] Incoming request dispatch:', data);
      // Trigger modal alert
      setIncomingRequestAlert(data);
      setCountdown(30);
      
      // Start accept timer countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIncomingRequestAlert(null); // Dismiss
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('request_claimed', (data) => {
      // If active alert matches, dismiss it (another mechanic accepted first)
      if (incomingRequestAlert && incomingRequestAlert.requestId === data.requestId) {
        setIncomingRequestAlert(null);
        if (timerRef.current) clearInterval(timerRef.current);
        Alert.alert('Missed!', 'Another provider accepted this booking.');
      }
    });

    socket.on('request_cancelled', () => {
      Alert.alert('Request Cancelled', 'The customer has cancelled this service request.');
      setActiveRequest(null);
      fetchEarningsSummary();
    });

    return () => {
      socket.off('new_breakdown_request');
      socket.off('request_claimed');
      socket.off('request_cancelled');
    };
  }, [socket, mechanic, incomingRequestAlert]);

  const setupGPS = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('GPS Denied', 'Please grant location permissions to receive roadside request feeds.');
      return;
    }

    try {
      // Watch coordinates continuously and emit location updates to server
      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 8000,
          distanceInterval: 10
        },
        (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          };
          setLocation(coords);
          setMapRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.0121,
          });

          // Dispatch coordinate updates via socket if connected
          if (socket) {
            socket.emit('update_location', {
              latitude: coords.latitude,
              longitude: coords.longitude,
              heading: loc.coords.heading
            });
          }
        }
      );
    } catch (err) {
      console.warn('GPS watch subscription error:', err.message);
    }
  };

  const fetchActiveRequest = async () => {
    try {
      const res = await axios.get(`${API_URL}/requests/active`);
      if (res.data.success && res.data.data) {
        setActiveRequest(res.data.data);
      } else {
        setActiveRequest(null);
      }
    } catch (err) {
      console.error('Failed fetching active request:', err.message);
    }
  };

  const fetchEarningsSummary = async () => {
    try {
      const res = await axios.get(`${API_URL}/mechanics/earnings`);
      if (res.data.success) {
        setWalletStats(res.data);
      }
    } catch (err) {
      console.error('Failed querying earnings summary:', err.message);
    }
  };

  const handleToggleOnline = async (val) => {
    const status = val ? 'online' : 'offline';
    const res = await toggleAvailability(status);
    if (!res.success) {
      Alert.alert('Status Error', res.message);
    }
  };

  const handleAcceptRequest = async (reqId) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIncomingRequestAlert(null);

    try {
      const res = await axios.put(`${API_URL}/requests/${reqId}/accept`);
      if (res.data.success) {
        setActiveRequest(res.data.data);
        Alert.alert('Accepted!', 'Assigned successfully. Navigate to customer location.');
      }
    } catch (err) {
      Alert.alert('Acceptance Error', err.response?.data?.message || 'Could not accept breakdown request.');
    }
  };

  const handleRejectRequest = async (reqId) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIncomingRequestAlert(null);

    try {
      await axios.put(`${API_URL}/requests/${reqId}/reject`);
    } catch (err) {
      console.error('Rejection failed:', err.message);
    }
  };

  const handleStatusTransition = async (nextStatus) => {
    setStatusLoading(true);
    try {
      const res = await axios.put(`${API_URL}/requests/${activeRequest._id}/status`, {
        status: nextStatus
      });
      if (res.data.success) {
        setActiveRequest(res.data.data);
        if (nextStatus === 'completed') {
          Alert.alert('Completed!', 'Service closed. Earnings logged in your wallet.');
          setActiveRequest(null);
          fetchEarningsSummary();
        }
      }
    } catch (err) {
      Alert.alert('Status Error', err.response?.data?.message || 'Failed to update job status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleVerifyStartOTP = async () => {
    if (!startOTP || startOTP.length < 4) {
      Alert.alert('OTP Input Error', 'Please enter the 4-digit start OTP PIN from the customer.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await axios.post(`${API_URL}/requests/${activeRequest._id}/verify-start`, {
        otp: startOTP
      });

      if (res.data.success) {
        setActiveRequest(res.data.data);
        setStartOTP('');
        Alert.alert('PIN Verified!', 'Repairs unlocked. You can now start the breakdown resolution.');
      }
    } catch (err) {
      Alert.alert('Verification Failed', err.response?.data?.message || 'Invalid customer verification OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const isOnline = mechanic?.status === 'online' || mechanic?.status === 'busy';

  return (
    <View style={styles.container}>
      {/* Map interface */}
      {mapRegion ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation={true}
          theme="dark"
        >
          {/* Mechanic location marker */}
          <Marker coordinate={location} title="Your Location" description="Assistance vehicle" pinColor="#ffcc00" />
          
          {/* Customer marker if assigned */}
          {activeRequest && activeRequest.customerLocation && (
            <Marker
              coordinate={{
                latitude: activeRequest.customerLocation.coordinates[1],
                longitude: activeRequest.customerLocation.coordinates[0]
              }}
              title="Customer Location"
              description={activeRequest.customerAddress}
              pinColor="#ff3b30"
            />
          )}

          {activeRequest && activeRequest.customerLocation && (
            <Polyline
              coordinates={[
                location,
                {
                  latitude: activeRequest.customerLocation.coordinates[1],
                  longitude: activeRequest.customerLocation.coordinates[0]
                }
              ]}
              strokeColor="#ffcc00"
              strokeWidth={4}
            />
          )}
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator size="large" color="#ffcc00" />
          <Text style={styles.loadingText}>Initializing GPS location tracking...</Text>
        </View>
      )}

      {/* Top Banner Status Bar Toggle */}
      <View style={styles.topBanner}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabelText}>
            STATUS: <Text style={isOnline ? styles.textOnline : styles.textOffline}>{mechanic?.status?.toUpperCase() || 'OFFLINE'}</Text>
          </Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#3a3a3c', true: '#ffcc00' }}
            thumbColor={isOnline ? '#000' : '#8e8e93'}
          />
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main interaction panels */}
      {!activeRequest ? (
        // Panel 1: Offline prompt OR Earnings Overview
        <View style={styles.dashboardPanel}>
          {!isOnline ? (
            <View style={styles.offlineBox}>
              <Text style={styles.panelTitle}>You are currently offline</Text>
              <Text style={styles.panelDesc}>Toggle the status switch above online to start receiving incoming car and bike breakdown requests nearby.</Text>
              
              {/* KYC quick link */}
              {mechanic?.kycStatus !== 'approved' && (
                <TouchableOpacity style={styles.kycBtn} onPress={() => navigation.navigate('KYC')}>
                  <Text style={styles.kycBtnText}>Check KYC status ({mechanic?.kycStatus || 'Unsubmitted'})</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.onlineBox}>
              <Text style={styles.panelTitle}>Awaiting Requests...</Text>
              <Text style={styles.panelDesc}>Listening for vehicles experiencing breakdowns within 10km of your coordinates.</Text>
              
              {walletStats && (
                <View style={styles.earningsSummaryRow}>
                  <View style={styles.statCell}>
                    <Text style={styles.statLabel}>Earnings</Text>
                    <Text style={styles.statVal}>₹{walletStats.earnings?.total || 0}</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statLabel}>Jobs</Text>
                    <Text style={styles.statVal}>{walletStats.completedJobsCount || 0}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        // Panel 2: Operational Steps for Active Request
        <View style={styles.opsPanel}>
          <ScrollView contentContainerStyle={styles.opsScroll}>
            <View style={styles.headerInfo}>
              <Text style={styles.panelTitle}>ACTIVE REPAIR JOB</Text>
              <Text style={styles.fareLabel}>Total Fare: ₹{activeRequest.pricing?.totalAmount}</Text>
            </View>

            <View style={styles.customerCard}>
              <Image
                source={{ uri: activeRequest.customer?.avatar || 'https://cdn-icons-png.flaticon.com/512/147/147144.png' }}
                style={styles.avatar}
              />
              <View style={styles.custInfo}>
                <Text style={styles.custName}>{activeRequest.customer?.name || 'Customer'}</Text>
                <Text style={styles.custPhone}>{activeRequest.customer?.phone}</Text>
                <Text style={styles.vehicleLabel}>{activeRequest.vehicleType.toUpperCase()} • {activeRequest.vehicleModel || 'Model unspecified'}</Text>
                <Text style={styles.issueText}>" {activeRequest.issueDescription} "</Text>
              </View>
            </View>

            {/* Workflow Action Steps */}
            <View style={styles.actionSection}>
              {activeRequest.status === 'accepted' && (
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => handleStatusTransition('on_the_way')}
                  disabled={statusLoading}
                >
                  {statusLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>Start Traveling (En Route)</Text>}
                </TouchableOpacity>
              )}

              {activeRequest.status === 'on_the_way' && (
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => handleStatusTransition('arrived')}
                  disabled={statusLoading}
                >
                  {statusLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>I Have Arrived at Location</Text>}
                </TouchableOpacity>
              )}

              {activeRequest.status === 'arrived' && (
                <View style={styles.otpForm}>
                  <Text style={styles.otpLabelText}>Enter Start OTP PIN from Customer</Text>
                  <View style={styles.otpInputRow}>
                    <TextInput
                      style={styles.otpTextInput}
                      placeholder="0 0 0 0"
                      placeholderTextColor="#8e8e93"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={startOTP}
                      onChangeText={setStartOTP}
                    />
                    <TouchableOpacity
                      style={styles.otpVerifyBtn}
                      onPress={handleVerifyStartOTP}
                      disabled={otpLoading}
                    >
                      {otpLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.otpVerifyBtnText}>Verify</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {activeRequest.status === 'work_in_progress' && (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, styles.completeBtn]}
                  onPress={() => handleStatusTransition('completed')}
                  disabled={statusLoading}
                >
                  {statusLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>Complete Repair Services</Text>}
                </TouchableOpacity>
              )}

              <View style={styles.chatRow}>
                <TouchableOpacity
                  style={styles.chatLinkBtn}
                  onPress={() => navigation.navigate('Chat', { requestId: activeRequest._id, receiverName: activeRequest.customer?.name })}
                >
                  <Text style={styles.chatLinkBtnText}>Open Chat Room</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Incoming Booking Alert Modal */}
      {incomingRequestAlert && (
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>INCOMING BREAKDOWN</Text>
            </View>
            <Text style={styles.alertVehicle}>{incomingRequestAlert.vehicleType.toUpperCase()}</Text>
            <Text style={styles.alertDetails}>Model: {incomingRequestAlert.vehicleModel || 'Not Specified'}</Text>
            <Text style={styles.alertIssue}>" {incomingRequestAlert.issueDescription} "</Text>
            
            <View style={styles.alertMetrics}>
              <Text style={styles.metricText}>Distance: {incomingRequestAlert.distanceKm} km</Text>
              <Text style={styles.metricText}>Payout: ₹{incomingRequestAlert.estimatedFare}</Text>
            </View>

            {/* Countdown timer */}
            <View style={styles.timerBarWrapper}>
              <View style={[styles.timerBar, { width: `${(countdown / 30) * 100}%` }]} />
            </View>
            <Text style={styles.timerText}>Autoreject in {countdown}s</Text>

            <View style={styles.alertBtnRow}>
              <TouchableOpacity
                style={[styles.alertBtn, styles.rejectBtn]}
                onPress={() => handleRejectRequest(incomingRequestAlert.requestId)}
              >
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertBtn, styles.acceptBtn]}
                onPress={() => handleAcceptRequest(incomingRequestAlert.requestId)}
              >
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  map: {
    width: width,
    height: height,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#8e8e93',
    marginTop: 12,
  },
  topBanner: {
    position: 'absolute',
    top: 50,
    width: '90%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    alignItems: 'center',
    elevation: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  textOnline: {
    color: '#34c759',
  },
  textOffline: {
    color: '#ff3b30',
  },
  logoutBtn: {
    padding: 6,
  },
  logoutBtnText: {
    color: '#ff3b30',
    fontSize: 12,
    fontWeight: '600',
  },
  dashboardPanel: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  offlineBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  onlineBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  panelDesc: {
    fontSize: 13,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  kycBtn: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffcc00',
    height: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycBtnText: {
    color: '#ffcc00',
    fontWeight: '700',
    fontSize: 13,
  },
  earningsSummaryRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#2c2c2e',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffcc00',
    marginTop: 4,
  },
  opsPanel: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxHeight: height * 0.45,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    elevation: 20,
  },
  opsScroll: {
    padding: 24,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fareLabel: {
    color: '#ffcc00',
    fontWeight: '800',
    fontSize: 14,
  },
  customerCard: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3c',
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  custInfo: {
    flex: 1,
  },
  custName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  custPhone: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 2,
  },
  vehicleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffcc00',
    marginTop: 4,
  },
  issueText: {
    fontSize: 13,
    color: '#fff',
    fontStyle: 'italic',
    marginTop: 6,
  },
  actionSection: {
    width: '100%',
  },
  primaryActionBtn: {
    backgroundColor: '#ffcc00',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  completeBtn: {
    backgroundColor: '#34c759',
  },
  actionBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  otpForm: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    marginBottom: 16,
  },
  otpLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  otpTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 6,
    fontWeight: '700',
  },
  otpVerifyBtn: {
    backgroundColor: '#ffcc00',
    width: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpVerifyBtnText: {
    color: '#000',
    fontWeight: '700',
  },
  chatRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  chatLinkBtn: {
    padding: 8,
  },
  chatLinkBtnText: {
    color: '#ffcc00',
    fontSize: 14,
    fontWeight: '700',
  },
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#ffcc00',
    alignItems: 'center',
  },
  alertBadge: {
    backgroundColor: 'rgba(255, 204, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#ffcc00',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  alertBadgeText: {
    color: '#ffcc00',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  alertVehicle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  alertDetails: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 12,
  },
  alertIssue: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  alertMetrics: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  metricText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  timerBarWrapper: {
    height: 4,
    width: '100%',
    backgroundColor: '#2c2c2e',
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    backgroundColor: '#ffcc00',
  },
  timerText: {
    fontSize: 11,
    color: '#8e8e93',
    marginBottom: 24,
  },
  alertBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  alertBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#2c2c2e',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  rejectBtnText: {
    color: '#ff3b30',
    fontWeight: '700',
  },
  acceptBtn: {
    backgroundColor: '#ffcc00',
  },
  acceptBtnText: {
    color: '#000',
    fontWeight: '800',
  }
});
