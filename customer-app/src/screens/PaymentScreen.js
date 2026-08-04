import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Alert, Animated, Platform,
  Linking, AppState, Image
} from 'react-native';
import { AuthContext, API_URL } from '../context/AuthContext';
import { downloadInvoice } from '../utils/downloadInvoice';
import { getSocket } from '../config/socket';

export default function PaymentScreen({ route, navigation }) {
  const { jobId, mechanicName, amount, serviceType } = route.params || {};
  const { token } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  
  // UPI Flow States
  const [paymentStatus, setPaymentStatus] = useState('PENDING'); // PENDING, SUBMITTED, SUCCESS, FAILURE, CANCELLED
  const [noUpiApp, setNoUpiApp] = useState(false);
  const [orderId, setOrderId] = useState(jobId ? `job_${jobId.toString().slice(-6)}` : 'job_pay_123');

  // Animation Refs
  const checkScale = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const totalAmount = amount || 350;
  const upiVpa = 'riderescue@upi';
  const upiPayeeName = 'RideRescue Assistance';
  const upiNote = `Payment for ${serviceType || 'Roadside Job'} #${jobId?.toString().slice(-6) || ''}`;
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(upiPayeeName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(upiNote)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

  // Check if UPI apps are installed on mount
  useEffect(() => {
    const checkUpiPresence = async () => {
      try {
        const canOpen = await Linking.canOpenURL(upiUri);
        setNoUpiApp(!canOpen);
      } catch (err) {
        console.log('[PaymentScreen] Error checking UPI app presence:', err);
        setNoUpiApp(true);
      }
    };
    checkUpiPresence();
  }, [upiUri]);

  // Connect socket to room for live payment confirmation
  useEffect(() => {
    if (!token || !jobId) return;
    const socket = getSocket(token);
    if (!socket) return;

    socket.emit('join:job:room', { jobId });

    const handlePaymentCompleted = (data) => {
      console.log('[Socket] payment:completed received on PaymentScreen:', data);
      if (data && (data.requestId === jobId || data.jobId === jobId)) {
        setPaymentStatus('SUCCESS');
        triggerSuccessAnimation();
      }
    };

    socket.on('payment:completed', handlePaymentCompleted);
    socket.on('payment_completed', handlePaymentCompleted);

    return () => {
      socket.off('payment:completed', handlePaymentCompleted);
      socket.off('payment_completed', handlePaymentCompleted);
    };
  }, [token, jobId]);

  // Poll payment status every 4 seconds while in SUBMITTED state
  useEffect(() => {
    let intervalId;
    if (paymentStatus === 'SUBMITTED' && jobId) {
      intervalId = setInterval(() => {
        pollPaymentStatus(true);
      }, 4000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [paymentStatus, jobId]);

  // Monitor AppState change (when returning from UPI app)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && paymentStatus === 'SUBMITTED') {
        pollPaymentStatus(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [paymentStatus, jobId]);

  // Function to show success animation and auto-navigate to RateJob screen
  const triggerSuccessAnimation = () => {
    setShowSuccessOverlay(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-navigate directly to RateJob screen after brief success animation
    setTimeout(() => {
      navigation.replace('RateJob', { jobId, mechanicName });
    }, 1600);
  };

  // Launch UPI App Deep Link
  const handlePayViaUpiApp = async () => {
    setLoading(true);
    setPaymentStatus('PENDING');
    try {
      // 1. Create order on backend (optional pre-order tracking)
      try {
        const resOrder = await fetch(`${API_URL}/api/payments/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ jobId, amount: totalAmount })
        });
        const orderData = await resOrder.json();
        if (orderData.success && orderData.orderId) {
          setOrderId(orderData.orderId);
        }
      } catch (err) {
        console.log('[PaymentScreen] Order creation pre-step note:', err.message);
      }

      // 2. Launch UPI Intent
      const canOpen = await Linking.canOpenURL(upiUri);
      if (!canOpen) {
        setNoUpiApp(true);
        Alert.alert(
          'UPI App Required',
          'Please scan the QR code using any UPI app (Google Pay, PhonePe, Paytm, BHIM) on your phone or install a UPI app.'
        );
        setLoading(false);
        return;
      }

      setPaymentStatus('SUBMITTED');
      setLoading(false);
      await Linking.openURL(upiUri);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not launch UPI app.');
      setPaymentStatus('FAILURE');
      setLoading(false);
    }
  };

  // Verify payment status on backend (Manual Check or Polling)
  const pollPaymentStatus = async (silent = false) => {
    if (!jobId) return;
    if (!silent) setVerificationLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.paid) {
        setPaymentStatus('SUCCESS');
        triggerSuccessAnimation();
      } else if (!silent) {
        Alert.alert(
          'Payment Processing',
          'We have not received payment confirmation from your bank yet. If you have already completed the transfer in your UPI app, please wait a moment or tap "Verify Status" again.'
        );
      }
    } catch (err) {
      console.log('[PaymentScreen] Error checking payment status:', err);
      if (!silent) {
        Alert.alert('Network Error', 'Could not check payment status. Please try again.');
      }
    } finally {
      if (!silent) setVerificationLoading(false);
    }
  };

  // Developer Simulator helper
  const runSimulatedPaymentState = async (state) => {
    if (state === 'SUCCESS') {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/payments/simulate-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ requestId: jobId })
        });
        const data = await response.json();
        if (data.success) {
          setPaymentStatus('SUCCESS');
          triggerSuccessAnimation();
        } else {
          Alert.alert('Simulation Failed', data.message || 'Could not simulate success.');
        }
      } catch (err) {
        Alert.alert('Error', 'Unable to reach payment simulation server.');
      } finally {
        setLoading(false);
      }
    } else {
      setPaymentStatus(state);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.headerTitle}>Pay with UPI</Text>
          <Text style={styles.headerSub}>Settle your roadside service bill securely</Text>
          
          <View style={styles.divider} />

          {/* Job Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Service Type</Text>
              <Text style={styles.value}>{serviceType ? String(serviceType).replace(/_/g, ' ') : 'Roadside Repair'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Assigned Mechanic</Text>
              <Text style={styles.value}>{mechanicName || 'Professional Mechanic'}</Text>
            </View>
          </View>

          {/* Amount Display */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Amount Due</Text>
            <Text style={styles.amountValue}>₹{totalAmount}</Text>
          </View>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Scan to Pay via UPI</Text>
            <View style={styles.qrCard}>
              <Image
                source={{ uri: qrCodeUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.qrSub}>Use Google Pay, PhonePe, Paytm, BHIM or any UPI app</Text>
          </View>

          <View style={styles.divider} />

          {/* Pay via UPI App Deep Link Button */}
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#E8192C" />
              <Text style={styles.loaderText}>Launching UPI App...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={handlePayViaUpiApp}
              activeOpacity={0.88}
            >
              <Text style={styles.payBtnText}>📲 Pay via UPI App</Text>
            </TouchableOpacity>
          )}

          {/* Fallback "I've Paid" Verification Button */}
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => pollPaymentStatus(false)}
            disabled={verificationLoading}
            activeOpacity={0.8}
          >
            {verificationLoading ? (
              <ActivityIndicator size="small" color="#4B5563" />
            ) : (
              <Text style={styles.verifyBtnText}>🔄 I've Paid (Verify Status)</Text>
            )}
          </TouchableOpacity>

          {/* Current Payment Status Banner */}
          {paymentStatus !== 'PENDING' && (
            <View style={styles.statusIndicator}>
              <Text style={[styles.statusText, styles[`statusText_${paymentStatus}`]]}>
                Status: {paymentStatus === 'SUBMITTED' ? 'Processing Payment...' : paymentStatus}
              </Text>
            </View>
          )}
        </View>

        {/* Developer Sandbox Controls */}
        {__DEV__ && (
          <View style={styles.simulatorCard}>
            <Text style={styles.simTitle}>🛠️ Developer Sandbox Simulator</Text>
            <View style={styles.simButtonsContainer}>
              <TouchableOpacity
                style={[styles.simBtn, styles.simBtnSuccess]}
                onPress={() => runSimulatedPaymentState('SUCCESS')}
              >
                <Text style={styles.simBtnText}>Simulate SUCCESS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simBtn, styles.simBtnFailure]}
                onPress={() => runSimulatedPaymentState('FAILURE')}
              >
                <Text style={styles.simBtnText}>Simulate FAILURE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* SUCCESS OVERLAY */}
      {showSuccessOverlay && (
        <Animated.View style={[styles.successOverlay, { opacity: overlayOpacity }]}>
          <Animated.View style={[styles.successCard, { transform: [{ scale: checkScale }] }]}>
            <View style={styles.checkmarkCircle}>
              <Text style={styles.checkmarkIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSubtitle}>Your invoice of ₹{totalAmount} has been settled.</Text>

            <View style={styles.successBtnContainer}>
              <TouchableOpacity
                style={[styles.successBtn, styles.successRateBtn]}
                onPress={() => {
                  setShowSuccessOverlay(false);
                  navigation.replace('RateJob', { jobId, mechanicName });
                }}
              >
                <Text style={styles.successRateBtnText}>⭐ Rate Mechanic</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.successBtn, styles.successInvoiceBtn]}
                onPress={() => downloadInvoice(jobId, token)}
              >
                <Text style={styles.successInvoiceBtnText}>📄 Download Invoice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.successBtn, styles.successHistoryBtn]}
                onPress={() => {
                  setShowSuccessOverlay(false);
                  navigation.replace('ServiceHistory');
                }}
              >
                <Text style={styles.successHistoryBtnText}>📋 View History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successHomeBtn}
                onPress={() => {
                  setShowSuccessOverlay(false);
                  navigation.navigate('Home');
                }}
              >
                <Text style={styles.successHomeBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16
  },
  summaryContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500'
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A'
  },
  amountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  amountLabel: {
    fontSize: 12,
    color: '#E8192C',
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  amountValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#E8192C'
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 12
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10
  },
  qrCard: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8
  },
  qrImage: {
    width: 180,
    height: 180
  },
  qrSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center'
  },
  payBtn: {
    backgroundColor: '#E8192C',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#E8192C',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 10
  },
  payBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5
  },
  verifyBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  verifyBtnText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14
  },
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 15
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#E8192C',
    fontWeight: '600'
  },
  statusIndicator: {
    marginTop: 14,
    alignItems: 'center'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700'
  },
  statusText_SUBMITTED: {
    color: '#D97706'
  },
  statusText_FAILURE: {
    color: '#DC2626'
  },
  statusText_SUCCESS: {
    color: '#16A34A'
  },
  simulatorCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  simTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  simButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  simBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  simBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  simBtnSuccess: {
    backgroundColor: '#16A34A'
  },
  simBtnFailure: {
    backgroundColor: '#DC2626'
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    elevation: 10
  },
  checkmarkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  checkmarkIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6
  },
  successSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16
  },
  successBtnContainer: {
    width: '100%',
    gap: 8
  },
  successBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  successRateBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#E8192C'
  },
  successRateBtnText: {
    color: '#E8192C',
    fontWeight: 'bold',
    fontSize: 14
  },
  successInvoiceBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  successInvoiceBtnText: {
    color: '#334155',
    fontWeight: 'bold',
    fontSize: 14
  },
  successHistoryBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  successHistoryBtnText: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: 14
  },
  successHomeBtn: {
    paddingVertical: 10,
    alignItems: 'center'
  },
  successHomeBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500'
  }
});
