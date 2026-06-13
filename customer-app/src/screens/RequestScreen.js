import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, Animated
} from 'react-native';
import { getSocket } from '../config/socket';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';

export default function RequestScreen({ navigation, route }) {
  const [serviceType, setServiceType] = useState('tire_repair');
  const [description, setDescription] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Current Location');
  const [loading, setLoading] = useState(false);
  const [waitingForMechanic, setWaitingForMechanic] = useState(false);
  const [jobId, setJobId] = useState(null);
  const { token } = useContext(AuthContext);

  // Bidding System State
  const [initialPrice, setInitialPrice] = useState('350');
  const [currentBiddingPrice, setCurrentBiddingPrice] = useState(350);
  const [countdown, setCountdown] = useState(120);
  const [showBidModal, setShowBidModal] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [autoPromptDelay, setAutoPromptDelay] = useState(120);
  const [maxPriceIncrease, setMaxPriceIncrease] = useState(1000);
  const countdownIntervalRef = useRef(null);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (route.params?.selectedAddress) {
      setCustomerAddress(route.params.selectedAddress);
    }
  }, [route.params?.selectedAddress]);

  useEffect(() => {
    if (waitingForMechanic) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [waitingForMechanic]);

  // Handle countdown timer for bidding prompt
  useEffect(() => {
    if (waitingForMechanic && jobId) {
      // Fetch current configuration delay
      fetch(`${API_URL}/api/requests/bidding-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          const delay = Number(data.settings.autoPromptDelay) || 120;
          setAutoPromptDelay(delay);
          setMaxPriceIncrease(Number(data.settings.maxPriceIncrease) || 1000);
          setCountdown(delay);
        }
      })
      .catch(err => console.log('Error fetching bidding settings:', err));

      setCountdown(autoPromptDelay);
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            setShowBidModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(countdownIntervalRef.current);
      setShowBidModal(false);
    }

    return () => clearInterval(countdownIntervalRef.current);
  }, [waitingForMechanic, jobId]);

  useEffect(() => {
    return () => {
      if (token) {
        const socket = getSocket(token);
        if (socket) {
          socket.off('job:accepted:notify');
          socket.off('request:price_updated');
        }
      }
    };
  }, [token]);

  const services = [
    { label: '🔧 Flat/Puncture Repair', value: 'tire_repair' },
    { label: '🚛 Towing', value: 'towing' },
    { label: '⛽ Fuel Delivery', value: 'fuel_delivery' },
    { label: '🔩 Engine Repair', value: 'engine_repair' },
    { label: '🔋 Battery Jump', value: 'battery' },
    { label: '🔑 Lock Out', value: 'lock_out' },
    { label: '❓ Other', value: 'other' },
  ];

  const handleRequest = async () => {
    if (!description) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }
    if (!initialPrice || isNaN(Number(initialPrice)) || Number(initialPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid initial price');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceType,
          description,
          vehicleType: 'car',
          location: {
            type: 'Point',
            coordinates: [77.2090, 28.6139] // standard default coords
          },
          customerAddress,
          initialPrice: Number(initialPrice)
        })
      });
      const data = await response.json();
      if (data.success && data.request) {
        const createdJobId = data.request._id;
        setJobId(createdJobId);
        setCurrentBiddingPrice(Number(initialPrice));
        setWaitingForMechanic(true);

        const socket = getSocket(token);
        socket.emit('join:job:room', { jobId: createdJobId });

        socket.on('job:accepted:notify', (mechanicDetails) => {
          console.log('[Socket] Job accepted by mechanic:', mechanicDetails);
          setWaitingForMechanic(false);
          socket.off('job:accepted:notify');
          socket.off('request:price_updated');

          navigation.replace('Tracking', {
            jobId: createdJobId,
            mechanicId: mechanicDetails.mechanicId,
            mechanicName: mechanicDetails.mechanicName,
            mechanicPhone: mechanicDetails.mechanicPhone,
            customerLat: data.request.customerLocation?.coordinates[1] || 28.6139,
            customerLng: data.request.customerLocation?.coordinates[0] || 77.2090
          });
        });

        // Listen for real-time price updates
        socket.on('request:price_updated', (updateData) => {
          if (updateData && updateData.current_price) {
            setCurrentBiddingPrice(updateData.current_price);
            // Reset countdown for next bid prompt
            setCountdown(autoPromptDelay);
            setShowBidModal(false);
            
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownIntervalRef.current);
                  setShowBidModal(true);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to server');
    }
    setLoading(false);
  };

  const handleIncreasePrice = async (amountToAdd) => {
    setBidError('');
    const totalIncrease = (currentBiddingPrice - Number(initialPrice)) + Number(amountToAdd);
    if (totalIncrease > maxPriceIncrease) {
      setBidError(`Maximum total increase limit of ₹${maxPriceIncrease} reached.`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/requests/${jobId}/increase-price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ incrementAmount: Number(amountToAdd) })
      });
      const data = await response.json();
      if (data.success) {
        setCustomBidAmount('');
        setShowBidModal(false);
        // Socket listener will sync this, but set locally for immediate response
        setCurrentBiddingPrice(data.request.current_price);
      } else {
        setBidError(data.message || 'Failed to update offer');
      }
    } catch (err) {
      setBidError('Server is unreachable. Check connection.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Request Mechanic</Text>
        <Text style={styles.label}>Location:</Text>
        <TouchableOpacity
          style={styles.addressBtn}
          onPress={() => navigation.navigate('AddressBook')}
        >
          <Text style={styles.addressBtnText}>{customerAddress}</Text>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Select Service Type:</Text>
        {services.map(service => (
          <TouchableOpacity
            key={service.value}
            style={[styles.serviceBtn, serviceType === service.value && styles.selectedBtn]}
            onPress={() => setServiceType(service.value)}>
            <Text style={[styles.serviceBtnText, serviceType === service.value && styles.selectedText]}>
              {service.label}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Describe Your Issue:</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Car won't start, flat tyre on highway..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Initial Service Offer (₹):</Text>
        <TextInput
          style={styles.priceInput}
          placeholder="e.g. 350"
          value={initialPrice}
          onChangeText={setInitialPrice}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.button} onPress={handleRequest}>
          {loading ? <ActivityIndicator color="#fff" /> :
            <Text style={styles.buttonText}>🔧 Send Request</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Waiting Overlay with Bidding Integration */}
      {waitingForMechanic && (
        <View style={styles.waitingOverlay}>
          <Animated.View style={[styles.pulseCircle, {
            transform: [{
              scale: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 2.8]
              })
            }],
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 0]
            })
          }]} />
          <View style={styles.pulseCore}>
            <Text style={{ fontSize: 36 }}>🚗</Text>
          </View>
          <Text style={styles.waitingText}>Finding a nearby mechanic...</Text>
          <Text style={styles.waitingSubtext}>We are locating the best technician for you.</Text>
          
          <View style={styles.currentOfferContainer}>
            <Text style={styles.currentOfferLabel}>Current Offer Price</Text>
            <Text style={styles.currentOfferValue}>₹{currentBiddingPrice}</Text>
          </View>

          {countdown > 0 ? (
            <Text style={styles.timerText}>Next offer increase available in {countdown}s</Text>
          ) : (
            <TouchableOpacity style={styles.increaseOfferOverlayBtn} onPress={() => setShowBidModal(true)}>
              <Text style={styles.increaseOfferOverlayBtnText}>⚡ Increase Offer Now</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.waitingCancelBtn}
            onPress={() => {
              setWaitingForMechanic(false);
              navigation.goBack();
            }}
          >
            <Text style={styles.waitingCancelText}>Cancel</Text>
          </TouchableOpacity>

          {/* Rapido-style Bidding bottom sheet dialog */}
          {showBidModal && (
            <View style={styles.modalBackdrop}>
              <View style={styles.bidModalContent}>
                <Text style={styles.bidModalTitle}>Increase Your Offer ⚡</Text>
                <Text style={styles.bidModalSub}>Higher price = Faster mechanic response.</Text>
                
                {bidError ? <Text style={styles.bidErrorText}>{bidError}</Text> : null}

                <View style={styles.quickBidRow}>
                  {[50, 100, 200].map(amt => (
                    <TouchableOpacity
                      key={amt}
                      style={styles.quickBidBtn}
                      onPress={() => handleIncreasePrice(amt)}
                    >
                      <Text style={styles.quickBidBtnText}>+₹{amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.customBidContainer}>
                  <TextInput
                    style={styles.customBidInput}
                    placeholder="Enter custom increase"
                    placeholderTextColor="#999"
                    value={customBidAmount}
                    onChangeText={setCustomBidAmount}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.customBidSubmitBtn}
                    onPress={() => {
                      if (!customBidAmount) return;
                      handleIncreasePrice(customBidAmount);
                    }}
                  >
                    <Text style={styles.customBidSubmitText}>Add</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeBidModalBtn} onPress={() => setShowBidModal(false)}>
                  <Text style={styles.closeBidModalText}>Keep Waiting (₹{currentBiddingPrice})</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FF6B00', marginTop: 50, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginTop: 15, color: '#333' },
  addressBtn: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
  addressBtnText: { fontSize: 15, color: '#333', flex: 1 },
  changeText: { color: '#B34700', fontWeight: 'bold', fontSize: 15 },
  serviceBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8, backgroundColor: '#fff' },
  selectedBtn: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  serviceBtnText: { fontSize: 15, color: '#333' },
  selectedText: { color: '#fff', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, backgroundColor: '#fff', fontSize: 15, height: 100, textAlignVertical: 'top', marginBottom: 10 },
  priceInput: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, backgroundColor: '#fff', fontSize: 16, fontWeight: 'bold', color: '#333' },
  button: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { padding: 15, alignItems: 'center', marginTop: 10 },
  cancelText: { color: '#666', fontSize: 15 },

  // Waiting Overlay styles
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pulseCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B00',
  },
  pulseCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#FF6B00',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 30,
  },
  waitingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  waitingSubtext: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  waitingCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    borderRadius: 25,
  },
  waitingCancelText: {
    color: '#FF6B00',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Bidding details wait styles
  currentOfferContainer: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  currentOfferLabel: {
    color: '#FF6B00',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentOfferValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 2,
  },
  timerText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 25,
  },
  increaseOfferOverlayBtn: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginBottom: 25,
    shadowColor: '#FF6B00',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  increaseOfferOverlayBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 2000,
  },
  bidModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  bidModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  bidModalSub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  bidErrorText: {
    color: 'red',
    fontSize: 13,
    marginBottom: 10,
  },
  quickBidRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  quickBidBtn: {
    backgroundColor: '#FFF0E6',
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  quickBidBtnText: {
    color: '#FF6B00',
    fontWeight: 'bold',
    fontSize: 16,
  },
  customBidContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  customBidInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
    height: 48,
    color: '#333',
  },
  customBidSubmitBtn: {
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    height: 48,
  },
  customBidSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  closeBidModalBtn: {
    paddingVertical: 10,
  },
  closeBidModalText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
