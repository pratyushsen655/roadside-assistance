import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Alert, Animated, Platform,
  Linking, AppState
} from 'react-native';
import { AuthContext, API_URL } from '../context/AuthContext';
import { downloadInvoice } from '../utils/downloadInvoice';

export default function PaymentScreen({ route, navigation }) {
  const { jobId, mechanicName, amount } = route.params || {};
  const { token } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  
  // UPI Flow States
  const [paymentStatus, setPaymentStatus] = useState('PENDING'); // PENDING, SUBMITTED, SUCCESS, FAILURE, CANCELLED
  const [noUpiApp, setNoUpiApp] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Animation Refs
  const checkScale = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const totalAmount = amount || 350;

  // Check if UPI apps are installed on mount
  useEffect(() => {
    const checkUpiPresence = async () => {
      try {
        const dummyUri = 'upi://pay?pa=merchant@upi&pn=RescueAssist&am=10&cu=INR&tn=test';
        const canOpen = await Linking.canOpenURL(dummyUri);
        setNoUpiApp(!canOpen);
      } catch (err) {
        console.log('[PaymentScreen] Error checking UPI app presence:', err);
        setNoUpiApp(true);
      }
    };
    checkUpiPresence();
  }, []);

  // Poll payment status every 3 seconds while in SUBMITTED state
  useEffect(() => {
    let intervalId;
    if (paymentStatus === 'SUBMITTED' && jobId) {
      intervalId = setInterval(pollPaymentStatus, 3000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [paymentStatus, orderId]);

  // Monitor AppState change (when returning from UPI app)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && paymentStatus === 'SUBMITTED') {
        pollPaymentStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [paymentStatus, orderId]);

  // Function to show success animation
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
  };

  // Create Order and launch UPI app
  const handlePayNow = async () => {
    setLoading(true);
    setPaymentStatus('PENDING');
    try {
      // 1. Create order on backend
      const resOrder = await fetch(`${API_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId, amount: totalAmount })
      });

      const orderData = await resOrder.json();
      if (!resOrder.ok) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      const fetchedOrderId = orderData.orderId;
      setOrderId(fetchedOrderId);

      // 2. Generate UPI Intent URI
      const upiUri = `upi://pay?pa=merchant@upi&pn=RescueAssist&am=${totalAmount}&cu=INR&tn=${fetchedOrderId}`;

      // 3. Check if UPI app can open the URI
      const canOpen = await Linking.canOpenURL(upiUri);
      if (!canOpen) {
        setNoUpiApp(true);
        setPaymentStatus('FAILURE');
        Alert.alert('No UPI App Found', 'No UPI app found. Please install Google Pay, PhonePe, Paytm, or BHIM.');
        setLoading(false);
        return;
      }

      // 4. Launch UPI Intent and set status to SUBMITTED
      setPaymentStatus('SUBMITTED');
      setLoading(false);
      
      await Linking.openURL(upiUri);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not initiate payment.');
      setPaymentStatus('FAILURE');
      setLoading(false);
    }
  };

  // Verify payment status on backend
  const pollPaymentStatus = async () => {
    if (!jobId) return;
    setVerificationLoading(true);
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
      }
    } catch (err) {
      console.log('[PaymentScreen] Error checking payment status:', err);
    } finally {
      setVerificationLoading(false);
    }
  };

  // Custom Simulator actions for Testing
  const runSimulatedPaymentState = async (state) => {
    if (state === 'SUCCESS') {
      setLoading(true);
      try {
        // Direct simulation via simulate-payment endpoint
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.headerTitle}>Settle Service Invoice</Text>
          
          <View style={styles.divider} />

          {/* Merchant Name */}
          <View style={styles.row}>
            <Text style={styles.label}>Merchant Name</Text>
            <Text style={styles.value}>{mechanicName || 'Rescue Assist'}</Text>
          </View>

          {/* Amount Display */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total Payable Amount</Text>
            <Text style={styles.amountValue}>₹{totalAmount}</Text>
          </View>

          <View style={styles.divider} />

          {/* Warning Message if no UPI app installed */}
          {noUpiApp && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                No UPI app found. Please install Google Pay, PhonePe, Paytm, or BHIM.
              </Text>
            </View>
          )}

          {/* Action Button */}
          {loading || verificationLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#B34700" />
              <Text style={styles.loaderText}>
                {verificationLoading ? 'Verifying payment on backend...' : 'Initiating payment...'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.payBtn, noUpiApp && styles.disabledBtn]}
              onPress={handlePayNow}
              disabled={noUpiApp}
              activeOpacity={0.9}
            >
              <Text style={styles.payBtnText}>Pay with UPI</Text>
            </TouchableOpacity>
          )}

          {/* Current UPI Payment Status indicator */}
          {paymentStatus !== 'PENDING' && (
            <View style={styles.statusIndicator}>
              <Text style={[styles.statusText, styles[`statusText_${paymentStatus}`]]}>
                Transaction Status: {paymentStatus}
              </Text>
            </View>
          )}
        </View>

        {/* Developer Sandbox Simulator controls */}
        {(__DEV__ || noUpiApp) && (
          <View style={styles.simulatorCard}>
            <Text style={styles.simTitle}>🛠️ Developer Simulator (UPI Response)</Text>
            <Text style={styles.simSubtitle}>
              Simulate standard response states from external UPI apps during development.
            </Text>
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

            <View style={styles.simButtonsContainer}>
              <TouchableOpacity
                style={[styles.simBtn, styles.simBtnSubmitted]}
                onPress={() => runSimulatedPaymentState('SUBMITTED')}
              >
                <Text style={styles.simBtnText}>Simulate SUBMITTED</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simBtn, styles.simBtnCancelled]}
                onPress={() => runSimulatedPaymentState('CANCELLED')}
              >
                <Text style={styles.simBtnText}>Simulate CANCELLED</Text>
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
            <Text style={styles.successSubtitle}>Your invoice has been settled successfully.</Text>

            <View style={styles.successBtnContainer}>
              <TouchableOpacity
                style={[styles.successBtn, styles.successInvoiceBtn]}
                onPress={() => downloadInvoice(jobId, token)}
              >
                <Text style={styles.successInvoiceBtnText}>📄 Download Invoice</Text>
              </TouchableOpacity>

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
    backgroundColor: '#FAFAFA'
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#FAFAFA'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 10
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E'
  },
  amountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    backgroundColor: '#FFF7F2',
    borderRadius: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#FFE0CC'
  },
  amountLabel: {
    fontSize: 13,
    color: '#B34700',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#B34700'
  },
  warningBox: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20
  },
  warningText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18
  },
  payBtn: {
    backgroundColor: '#B34700',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#B34700',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  disabledBtn: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0
  },
  payBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5
  },
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 15
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#B34700',
    fontWeight: '600'
  },
  statusIndicator: {
    marginTop: 16,
    alignItems: 'center'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700'
  },
  statusText_SUBMITTED: {
    color: '#FF8F00'
  },
  statusText_FAILURE: {
    color: '#C62828'
  },
  statusText_CANCELLED: {
    color: '#555555'
  },
  statusText_SUCCESS: {
    color: '#2E7D32'
  },
  simulatorCard: {
    backgroundColor: '#2E3842',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4A5560'
  },
  simTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6
  },
  simSubtitle: {
    color: '#B0BEC5',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16
  },
  simButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  simBtn: {
    flex: 0.48,
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
    backgroundColor: '#2E7D32'
  },
  simBtnFailure: {
    backgroundColor: '#C62828'
  },
  simBtnSubmitted: {
    backgroundColor: '#FF8F00'
  },
  simBtnCancelled: {
    backgroundColor: '#546E7A'
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10
  },
  checkmarkCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  checkmarkIcon: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  successSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18
  },
  successBtnContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  successBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  successInvoiceBtn: {
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#00BFA5',
  },
  successInvoiceBtnText: {
    color: '#00BFA5',
    fontWeight: 'bold',
    fontSize: 14,
  },
  successRateBtn: {
    backgroundColor: '#FFF3E6',
    borderWidth: 1,
    borderColor: '#B34700',
  },
  successRateBtnText: {
    color: '#B34700',
    fontWeight: 'bold',
    fontSize: 14,
  },
  successHistoryBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  successHistoryBtnText: {
    color: '#4B5563',
    fontWeight: 'bold',
    fontSize: 14,
  },
  successHomeBtn: {
    paddingVertical: 10,
    marginTop: 5,
  },
  successHomeBtnText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
});
