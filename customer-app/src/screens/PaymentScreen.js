import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, Alert, Modal, Animated, Platform
} from 'react-native';
import { AuthContext, API_URL } from '../context/AuthContext';
import { downloadInvoice } from '../utils/downloadInvoice';

// Safe require for react-native-razorpay to support Expo Go simulations
let RazorpayCheckout;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  console.log('[PaymentScreen] Razorpay SDK not available natively (common in Expo Go/development). Fallback simulator will be used.');
}

export default function PaymentScreen({ route, navigation }) {
  const { jobId, mechanicName, amount } = route.params || {};
  const { token, user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Animation Refs
  const checkScale = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const baseFare = amount ? amount - 29 : 321;
  const platformFee = 29;
  const totalAmount = amount || 350;

  // Function to show success animation and redirect
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

  // Pay Now tap handler
  const handlePayNow = async () => {
    setLoading(true);
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
        throw new Error(orderData.message || 'Failed to create Razorpay order');
      }

      const { orderId, keyId } = orderData;

      // 2. Open Razorpay Checkout or Simulation Popup
      if (RazorpayCheckout && Platform.OS !== 'web') {
        const options = {
          description: 'Roadside Assistance Payment',
          image: 'https://cdn-icons-png.flaticon.com/512/3208/3208413.png',
          currency: 'INR',
          key: keyId,
          amount: Math.round(totalAmount * 100),
          order_id: orderId,
          name: 'Roadside Assistance',
          prefill: {
            contact: user?.phone || '+919999999999',
            email: user?.email || 'customer@roadside.com'
          },
          theme: { color: '#B34700' }
        };

        RazorpayCheckout.open(options)
          .then(async (data) => {
            // Success callback
            await verifyPayment({
              razorpayOrderId: orderId,
              razorpayPaymentId: data.razorpay_payment_id,
              razorpaySignature: data.razorpay_signature,
              jobId
            });
          })
          .catch((error) => {
            console.log('[Razorpay Error]', error);
            Alert.alert('Payment Failed', error.description || 'Transaction cancelled by user.');
            setLoading(false);
          });
      } else {
        // Fallback simulation modal for Expo Go / Web / Missing SDK
        setLoading(false);
        setShowSimModal(true);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not initiate payment.');
      setLoading(false);
    }
  };

  // Verify Razorpay Payment Details on Backend
  const verifyPayment = async (paymentDetails) => {
    setLoading(true);
    try {
      const resVerify = await fetch(`${API_URL}/api/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentDetails)
      });

      const data = await resVerify.json();
      if (resVerify.ok) {
        triggerSuccessAnimation();
      } else {
        Alert.alert('Verification Failed', data.message || 'We could not verify your payment.');
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to reach payment verification server.');
    } finally {
      setLoading(false);
    }
  };

  // Pay with Cash handler
  const handlePayCash = async () => {
    Alert.alert(
      'Pay on Cash',
      'Confirm that you will settle the amount of ₹' + totalAmount + ' in cash directly with the mechanic.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Cash Payment',
          onPress: async () => {
            setLoading(true);
            try {
              const resCash = await fetch(`${API_URL}/api/payments/pay-cash`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ jobId })
              });

              const data = await resCash.json();
              if (resCash.ok) {
                triggerSuccessAnimation();
              } else {
                Alert.alert('Error', data.message || 'Failed to process cash payment option.');
              }
            } catch (err) {
              Alert.alert('Error', 'Unable to reach payment server.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Custom Simulator actions
  const runSimulatedPayment = async (success) => {
    setShowSimModal(false);
    if (!success) {
      Alert.alert('Payment Failed', 'Simulated transaction rejection.');
      return;
    }

    setLoading(true);
    // Simulate API orderId from local state
    await verifyPayment({
      razorpayOrderId: 'order_mock_' + Math.random().toString(36).substring(7),
      razorpayPaymentId: 'pay_mock_' + Math.random().toString(36).substring(7),
      razorpaySignature: 'mock_signature', // Dev signature bypass
      jobId
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Invoice Settlement</Text>
          <Text style={styles.headerSubtitle}>Choose a payment option to complete your booking</Text>
        </View>

        {/* Invoice Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.brandTitle}>🚗 RESCUE ASSIST</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Invoice Pending</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assigned Mechanic</Text>
            <Text style={styles.detailValue}>{mechanicName || 'Professional Mechanic'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service Request ID</Text>
            <Text style={styles.detailValueMono}>{jobId ? jobId.substring(18) : 'N/A'}</Text>
          </View>

          <View style={styles.divider} />

          {/* Breakdown */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service Charge</Text>
            <Text style={styles.priceValue}>₹{baseFare}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform Convenience Fee</Text>
            <Text style={styles.priceValue}>₹{platformFee}</Text>
          </View>

          <View style={styles.dividerBold} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Bill Amount</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* Payment Options Actions */}
        <View style={styles.actionContainer}>
          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#B34700" />
              <Text style={styles.loaderText}>Verifying invoice transaction...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.payBtn}
                onPress={handlePayNow}
                activeOpacity={0.9}
              >
                <Text style={styles.payBtnText}>Pay Online ₹{totalAmount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cashBtn}
                onPress={handlePayCash}
                activeOpacity={0.8}
              >
                <Text style={styles.cashBtnText}>Settled via Cash to Mechanic</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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

      {/* EXPO GO SIMULATION MODAL */}
      <Modal
        visible={showSimModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSimModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Razorpay Sandbox Simulator</Text>
            <Text style={styles.modalBody}>
              You are currently running the app in development mode / Expo Go without native Razorpay libraries.
              Select an option to simulate a response:
            </Text>

            <TouchableOpacity
              style={styles.simSuccessBtn}
              onPress={() => runSimulatedPayment(true)}
            >
              <Text style={styles.simBtnText}>🟢 Simulate Successful Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simFailBtn}
              onPress={() => runSimulatedPayment(false)}
            >
              <Text style={styles.simBtnText}>🔴 Simulate Failed Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simCancelBtn}
              onPress={() => setShowSimModal(false)}
            >
              <Text style={styles.simCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between'
  },
  header: {
    marginTop: 20,
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 6
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#B34700',
    letterSpacing: 1
  },
  badge: {
    backgroundColor: '#FFEFE6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#B34700'
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16
  },
  dividerBold: {
    height: 2,
    backgroundColor: '#F0F0F0',
    marginVertical: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  detailLabel: {
    fontSize: 13,
    color: '#888'
  },
  detailValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333'
  },
  detailValueMono: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    color: '#666'
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  priceLabel: {
    fontSize: 14,
    color: '#555'
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E'
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#B34700'
  },
  actionContainer: {
    marginTop: 30,
    marginBottom: 10
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
    elevation: 4,
    marginBottom: 14
  },
  payBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  cashBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#CCC',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center'
  },
  cashBtnText: {
    color: '#777',
    fontWeight: '700',
    fontSize: 14
  },
  loaderBox: {
    alignItems: 'center',
    paddingVertical: 15
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#B34700',
    fontWeight: '600'
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  modalBody: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 20
  },
  simSuccessBtn: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A5D6A7'
  },
  simFailBtn: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2'
  },
  simBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333'
  },
  simCancelBtn: {
    alignItems: 'center',
    paddingVertical: 5
  },
  simCancelBtnText: {
    color: '#999',
    fontWeight: '600'
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
