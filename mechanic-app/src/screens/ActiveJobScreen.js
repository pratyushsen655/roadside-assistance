import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Dimensions, Modal, ActivityIndicator, Image
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';
import API_URL from '../config/api';

let QRCode;
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch (e) {
  QRCode = null;
}

const RenderQR = ({ value, size = 200 }) => {
  const [useFallback, setUseFallback] = useState(!QRCode);

  if (!useFallback && QRCode) {
    try {
      return (
        <View style={{ padding: 12, backgroundColor: '#ffffff', borderRadius: 16 }}>
          <QRCode value={value} size={size} color="#000000" backgroundColor="#ffffff" onError={() => setUseFallback(true)} />
        </View>
      );
    } catch (e) {
      return (
        <View style={{ padding: 12, backgroundColor: '#ffffff', borderRadius: 16 }}>
          <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(value)}&size=${size}x${size}` }} style={{ width: size, height: size }} />
        </View>
      );
    }
  }

  return (
    <View style={{ padding: 12, backgroundColor: '#ffffff', borderRadius: 16 }}>
      <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(value)}&size=${size}x${size}` }} style={{ width: size, height: size }} />
    </View>
  );
};


const { width, height } = Dimensions.get('window');

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1a1a2e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a1a2e" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#30304f" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#252542" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#30304f" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f0f1d" }] }
];

const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getChecklist = (issueType) => {
  const type = String(issueType || '').toLowerCase();
  if (type.includes('tire') || type.includes('puncture') || type.includes('flat')) {
    return {
      title: 'Flat Tire / Puncture Repair Guide',
      steps: [
        'Check tire damage (sidewall cuts vs tread punctures).',
        'Locate safe jack lift points on the vehicle chassis.',
        'Loosen lug nuts in a star pattern before raising the car.',
        'Inspect spare tire pressure and ensure correct torque specification.'
      ]
    };
  } else if (type.includes('battery') || type.includes('jump') || type.includes('dead')) {
    return {
      title: 'Battery Jump Start Checklist',
      steps: [
        'Inspect battery terminals for heavy corrosion (clean if necessary).',
        'Connect red positive cables first, then black negative cables.',
        'Turn off all electronics on both vehicles before starting.',
        'Keep engine running for at least 15 minutes after start to charge.'
      ]
    };
  } else if (type.includes('fuel') || type.includes('delivery') || type.includes('gas')) {
    return {
      title: 'Fuel Delivery Safety Checklist',
      steps: [
        'Verify correct fuel type (Petrol vs Diesel) with the customer.',
        'Check for leaks around the fuel tank and filler neck.',
        'Add fuel slowly using a safety funnel to avoid splashback.',
        'Prime the fuel pump by cycling the ignition key if it was completely empty.'
      ]
    };
  } else if (type.includes('engine') || type.includes('smoke') || type.includes('overheat')) {
    return {
      title: 'Engine / Overheating Diagnostic Guide',
      steps: [
        'Scan OBD-II codes to read active check-engine errors.',
        'Check coolant level and verify no white/blue smoke from exhaust.',
        'Inspect drive belts for cracks, tension, or slippage.',
        'Check engine oil level, color, and viscosity.'
      ]
    };
  } else {
    return {
      title: 'General Service Diagnostic Checklist',
      steps: [
        'Perform a visual 360-degree inspection of the vehicle.',
        'Verify customer description of symptoms and check warning lights.',
        'Check fluid levels (engine oil, coolant, brake fluid).',
        'Confirm resolution with customer before finalizing job completion.'
      ]
    };
  }
};

// Check if coordinate is a valid latitude/longitude number pair
const isValidCoordinate = (coord) => {
  return coord &&
    typeof coord.latitude === 'number' && !isNaN(coord.latitude) &&
    typeof coord.longitude === 'number' && !isNaN(coord.longitude);
};

export default function ActiveJobScreen({ route, navigation }) {
  const { jobId, customerLocation, customerName, customerPhone, issue } = route.params || {};
  const { mechanicToken } = useContext(AuthContext);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [mechanicCoords, setMechanicCoords] = useState(null);
  const [jobStatus, setJobStatus] = useState(route.params?.status || 'accepted'); // accepted, en_route, arrived, in_progress, completed
  const [loading, setLoading] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  const [qrLoading, setQrLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrMethod, setQrMethod] = useState(''); // 'qr' or 'payment_link'
  const [paymentPaid, setPaymentPaid] = useState(false);
  const [finalAmount, setFinalAmount] = useState(0);
  
  const pollingIntervalRef = useRef(null);

  const socket = getSocket(mechanicToken);

  const customerCoords = {
    latitude:
      Array.isArray(customerLocation?.coordinates) && customerLocation.coordinates.length >= 2
        ? customerLocation.coordinates[1]
        : 28.6139,
    longitude:
      Array.isArray(customerLocation?.coordinates) && customerLocation.coordinates.length >= 2
        ? customerLocation.coordinates[0]
        : 77.2090
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isMounted.current) {
        setUnreadCount(0);
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!jobId || !mechanicToken) return;
    const fetchJobStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/requests/${jobId}`, {
          headers: { Authorization: `Bearer ${mechanicToken}` }
        });
        const data = await res.json();
        if (data.success && data.request) {
          if (isMounted.current) {
            const statusMap = {
              accepted: 'accepted',
              on_the_way: 'en_route',
              arrived: 'arrived',
              work_in_progress: 'in_progress',
              completed: 'completed'
            };
            setJobStatus(statusMap[data.request.status] || 'accepted');
          }
        }
      } catch (err) {
        console.error('[ActiveJobScreen] Error fetching job status:', err);
      }
    };
    fetchJobStatus();
  }, [jobId, mechanicToken]);

  // Join Room on Socket mount & listen for messages
  useEffect(() => {
    if (socket && jobId) {
      socket.emit('join:job:room', { jobId });
      console.log(`[Socket] Mechanic joined room job:${jobId}`);

      socket.on('chat:message', (msg) => {
        try {
          console.log('[Socket] Chat message received in ActiveJob:', msg);
          if (msg && msg.jobId === jobId && msg.senderType === 'customer') {
            if (isMounted.current) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        } catch (err) {
          console.error('[ACTIVE_JOB_SOCKET_ERROR] Error handling chat:message:', err);
        }
      });

      socket.on('payment:completed', (data) => {
        try {
          console.log('[Socket] payment:completed received in ActiveJob:', data);
          if (data && data.requestId === jobId) {
            handlePaymentSuccess();
          }
        } catch (err) {
          console.error('[ACTIVE_JOB_SOCKET_ERROR] Error handling payment:completed:', err);
        }
      });
    }
    return () => {
      if (socket) {
        socket.off('chat:message');
        socket.off('payment:completed');
      }
    };
  }, [jobId, socket]);

  // watchPositionAsync for continuous GPS tracking and location emit
  useEffect(() => {
    let subscriber;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'GPS permission is required for map tracking.');
          return;
        }

        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10
          },
          (loc) => {
            const { latitude, longitude } = loc.coords;
            if (isMounted.current) {
              setMechanicCoords({ latitude, longitude });
            }

            // Emit location to customer
            if (socket) {
              try {
                socket.emit('mechanic:location', {
                  jobId,
                  lat: latitude,
                  lng: longitude
                });
                console.log('[Socket] Emitted mechanic location:', { lat: latitude, lng: longitude });
              } catch (socketErr) {
                console.error('[ACTIVE_JOB_SOCKET_ERROR] Error emitting location:', socketErr);
              }
            }
          }
        );
      } catch (err) {
        console.log('Error watching position:', err);
      }
    };

    startLocationTracking();

    return () => {
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, [jobId, socket]);

  const handlePaymentSuccess = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (isMounted.current) {
      setPaymentPaid(true);
    }
  };

  const startPaymentPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/payments/status/${jobId}`, {
          headers: { 'Authorization': `Bearer ${mechanicToken}` }
        });
        const data = await response.json();
        if (data.success && data.paid) {
          handlePaymentSuccess();
        }
      } catch (err) {
        console.log('[Payment Polling Error]:', err.message);
      }
    }, 3000);
  };

  const generatePaymentQR = async () => {
    if (isMounted.current) {
      setQrLoading(true);
      setPaymentPaid(false);
      setQrCodeUrl('');
    }
    try {
      const response = await fetch(`${API_URL}/api/payments/create-qr-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({ requestId: jobId })
      });
      const data = await response.json();
      if (data.success) {
        if (isMounted.current) {
          setQrCodeUrl(data.qrUrl);
          setQrMethod(data.method);
          setFinalAmount(data.amount || earnings || 350);
        }
        startPaymentPolling();
      } else {
        Alert.alert('Payment Setup Failed', data.message || 'Could not generate QR payment.');
      }
    } catch (err) {
      console.error('[ActiveJobScreen] Error generating payment QR:', err);
      Alert.alert('Error', 'Unable to reach payment server.');
    } finally {
      if (isMounted.current) {
        setQrLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const updateStatus = async (newStatus) => {
    if (isMounted.current) {
      setLoading(true);
    }
    try {
      const response = await fetch(`${API_URL}/api/mechanic/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();

      if (data.success) {
        if (isMounted.current) {
          setJobStatus(newStatus);
        }

        // Emit status update to socket
        if (socket) {
          try {
            socket.emit('job:status:update', { jobId, status: newStatus });
          } catch (socketErr) {
            console.error('[ACTIVE_JOB_SOCKET_ERROR] Error emitting job status update:', socketErr);
          }
        }

        if (newStatus === 'completed') {
          if (isMounted.current) {
            setEarnings(data.earningsEarned || 350);
            setFinalAmount(data.earningsEarned || 350);
            setShowCompleteModal(true);
            generatePaymentQR();
          }
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('[ACTIVE_JOB_UPDATE_STATUS_ERROR] Error updating status:', err);
      Alert.alert('Error', 'Failed to update status. Server unreachable.');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const getActionButton = () => {
    switch (jobStatus) {
      case 'accepted':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#00BFA5' }]}
            onPress={() => updateStatus('en_route')}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>🚗 I'm On My Way</Text>}
          </TouchableOpacity>
        );
      case 'en_route':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FFB300' }]}
            onPress={() => updateStatus('arrived')}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>📍 I've Arrived</Text>}
          </TouchableOpacity>
        );
      case 'arrived':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1E88E5' }]}
            onPress={() => updateStatus('in_progress')}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>🔧 Start Job</Text>}
          </TouchableOpacity>
        );
      case 'in_progress':
        return (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
            onPress={() => updateStatus('completed')}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>✅ Complete Job</Text>}
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  // Distance calculation
  let distance = 0;
  if (mechanicCoords) {
    distance = getDistanceInKm(
      mechanicCoords.latitude,
      mechanicCoords.longitude,
      customerCoords.latitude,
      customerCoords.longitude
    );
  }

  return (
    <View style={styles.container}>
      {isValidCoordinate(customerCoords) && (
        <MapView
          style={styles.map}
          customMapStyle={darkMapStyle}
          initialRegion={{
            latitude: customerCoords.latitude,
            longitude: customerCoords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
        >
          {/* Customer Location */}
          <Marker coordinate={customerCoords} title="Customer Location">
            <View style={styles.customerPin}>
              <Text style={{ fontSize: 28 }}>🚗</Text>
            </View>
          </Marker>

          {/* Mechanic Live Location */}
          {isValidCoordinate(mechanicCoords) && (
            <Marker coordinate={mechanicCoords} title="You">
              <View style={styles.mechanicPin} />
            </Marker>
          )}

          {/* Polyline Route */}
          {isValidCoordinate(mechanicCoords) && (
            <Polyline
              coordinates={[mechanicCoords, customerCoords]}
              strokeColor="#00BFA5"
              strokeWidth={4}
            />
          )}
        </MapView>
      )}

      {/* Top Customer Info Card */}
      <View style={styles.topCard}>
        <View style={styles.customerHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{customerName || 'Customer'}</Text>
            <Text style={styles.issueText}>🔧 {issue || 'Roadside Assistance'}</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${customerPhone}`)}
            >
              <Text style={{ fontSize: 20 }}>📞</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => {
                setUnreadCount(0);
                navigation.navigate('Chat', { jobId, receiverName: customerName });
              }}
            >
              <Text style={{ fontSize: 20 }}>💬</Text>
              {unreadCount > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checklistBtn}
              onPress={() => setShowChecklistModal(true)}
            >
              <Text style={{ fontSize: 20 }}>💡</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.addressText} numberOfLines={2}>📍 {route.params?.customerAddress || 'Customer Location Address'}</Text>
      </View>

      {/* Bottom Info Bar & Action Buttons */}
      <View style={styles.bottomContainer}>
        {mechanicCoords && (
          <View style={styles.distanceBar}>
            <Text style={styles.distanceText}>
              Customer is <Text style={styles.distanceValue}>{distance.toFixed(1)} km</Text> away
            </Text>
          </View>
        )}
        {getActionButton()}
      </View>

      {/* Completion & Earnings Modal */}
      <Modal visible={showCompleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {qrLoading ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="large" color="#00BFA5" style={{ marginBottom: 15 }} />
                <Text style={styles.modalTitle}>Generating Payment QR...</Text>
                <Text style={styles.modalText}>Fetching secure order from Razorpay</Text>
              </View>
            ) : qrCodeUrl ? (
              !paymentPaid ? (
                <View style={{ alignItems: 'center', width: '100%' }}>
                  <Text style={styles.modalTitle}>Scan to Pay</Text>
                  <Text style={[styles.earningsValue, { marginBottom: 20 }]}>₹{finalAmount}</Text>
                  
                  <RenderQR value={qrCodeUrl} size={200} />
                  
                  <Text style={[styles.modalText, { marginTop: 20, marginBottom: 5 }]}>
                    {qrMethod === 'qr' ? 'UPI QR Code' : 'Payment Link QR Code'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                    <ActivityIndicator size="small" color="#00BFA5" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#aaaaaa', fontSize: 14 }}>Waiting for customer payment...</Text>
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: 'center', width: '100%' }}>
                  <Text style={styles.modalSuccessIcon}>✅</Text>
                  <Text style={styles.modalTitle}>Payment Received!</Text>
                  <Text style={styles.modalText}>Customer has paid the total amount of ₹{finalAmount}.</Text>

                  <View style={styles.earningsBox}>
                    <Text style={styles.earningsLabel}>Your Net Earnings (80%)</Text>
                    <Text style={styles.earningsValue}>₹{earnings}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: '#1E88E5', marginBottom: 12 }]}
                    onPress={() => Linking.openURL(`${API_URL}/api/requests/${jobId}/invoice`)}
                  >
                    <Text style={styles.modalBtnText}>📄 View PDF Invoice</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalBtn}
                    onPress={() => {
                      setShowCompleteModal(false);
                      navigation.navigate('Home');
                    }}
                  >
                    <Text style={styles.modalBtnText}>Back to Home</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={{ alignItems: 'center', width: '100%' }}>
                <Text style={styles.modalSuccessIcon}>🎉</Text>
                <Text style={styles.modalTitle}>Job Completed!</Text>
                <Text style={styles.modalText}>You have successfully resolved the breakdown request.</Text>

                <View style={styles.earningsBox}>
                  <Text style={styles.earningsLabel}>Earnings Earned</Text>
                  <Text style={styles.earningsValue}>₹{earnings}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#E74C3C', marginBottom: 12 }]}
                  onPress={generatePaymentQR}
                >
                  <Text style={styles.modalBtnText}>Retry Generating QR Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => {
                    setShowCompleteModal(false);
                    navigation.navigate('Home');
                  }}
                >
                  <Text style={styles.modalBtnText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Diagnostic Checklist Modal */}
      <Modal visible={showChecklistModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.checklistModalContent}>
            <Text style={styles.checklistTitle}>💡 AI Diagnostic Guide</Text>
            <Text style={{ color: '#aaaaaa', fontSize: 13, marginBottom: 20, fontStyle: 'italic' }}>
              Suggested steps for {String(issue || 'Roadside Assistance').replace(/_/g, ' ')}:
            </Text>
            {getChecklist(issue).steps.map((step, idx) => (
              <View key={idx} style={styles.checklistItem}>
                <Text style={styles.checklistBullet}>{idx + 1}.</Text>
                <Text style={styles.checklistText}>{step}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.closeChecklistBtn}
              onPress={() => setShowChecklistModal(false)}
            >
              <Text style={styles.modalBtnText}>Got It, Thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  map: {
    width: width,
    height: height,
  },
  customerPin: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mechanicPin: {
    width: 20,
    height: 20,
    backgroundColor: '#00BFA5',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 5,
    shadowColor: '#00BFA5',
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  topCard: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  issueText: {
    color: '#00BFA5',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  callBtn: {
    backgroundColor: '#3a3a5a',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBtn: {
    backgroundColor: '#3a3a5a',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    position: 'relative',
  },
  checklistBtn: {
    backgroundColor: '#3a3a5a',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checklistModalContent: {
    width: '95%',
    backgroundColor: '#252542',
    borderRadius: 24,
    padding: 24,
    alignItems: 'flex-start',
    elevation: 10,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  checklistTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00BFA5',
    marginBottom: 5,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checklistBullet: {
    fontSize: 16,
    color: '#00BFA5',
    marginRight: 10,
    fontWeight: 'bold',
  },
  checklistText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  closeChecklistBtn: {
    backgroundColor: '#00BFA5',
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'red',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  addressText: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#252542',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
  },
  distanceBar: {
    alignItems: 'center',
    marginBottom: 15,
  },
  distanceText: {
    color: '#aaaaaa',
    fontSize: 16,
  },
  distanceValue: {
    color: '#00BFA5',
    fontWeight: 'bold',
  },
  actionBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#252542',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
  },
  modalSuccessIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  modalText: {
    color: '#aaaaaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
  },
  earningsBox: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  earningsLabel: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 5,
  },
  earningsValue: {
    color: '#00BFA5',
    fontSize: 32,
    fontWeight: 'bold',
  },
  modalBtn: {
    backgroundColor: '#00BFA5',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});