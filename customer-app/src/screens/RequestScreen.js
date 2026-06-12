import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, Animated
} from 'react-native';
import { getSocket } from '../config/socket';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.104.223.76:5000';

export default function RequestScreen({ navigation, route }) {
  const [serviceType, setServiceType] = useState('tire_repair');
  const [description, setDescription] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Current Location');
  const [loading, setLoading] = useState(false);
  const [waitingForMechanic, setWaitingForMechanic] = useState(false);
  const [jobId, setJobId] = useState(null);
  const { token } = useContext(AuthContext);

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

  useEffect(() => {
    return () => {
      if (token) {
        const socket = getSocket(token);
        if (socket) {
          socket.off('job:accepted:notify');
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
    setLoading(true);
    try {
      // Fetch dynamic position if available, else use default coordinates
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
          customerAddress
        })
      });
      const data = await response.json();
      if (data.success && data.request) {
        const createdJobId = data.request._id;
        setJobId(createdJobId);
        setWaitingForMechanic(true);

        const socket = getSocket(token);
        socket.emit('join:job:room', { jobId: createdJobId });

        socket.on('job:accepted:notify', (mechanicDetails) => {
          console.log('[Socket] Job accepted by mechanic:', mechanicDetails);
          setWaitingForMechanic(false);
          socket.off('job:accepted:notify');

          navigation.replace('Tracking', {
            jobId: createdJobId,
            mechanicId: mechanicDetails.mechanicId,
            mechanicName: mechanicDetails.mechanicName,
            mechanicPhone: mechanicDetails.mechanicPhone,
            customerLat: data.request.customerLocation?.coordinates[1] || 28.6139,
            customerLng: data.request.customerLocation?.coordinates[0] || 77.2090
          });
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Cannot connect to server');
    }
    setLoading(false);
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
        <TouchableOpacity style={styles.button} onPress={handleRequest}>
          {loading ? <ActivityIndicator color="#fff" /> :
            <Text style={styles.buttonText}>🔧 Send Request</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Waiting Overlay with Pulsing Orange Circle */}
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
          <TouchableOpacity
            style={styles.waitingCancelBtn}
            onPress={() => {
              setWaitingForMechanic(false);
              navigation.goBack();
            }}
          >
            <Text style={styles.waitingCancelText}>Cancel</Text>
          </TouchableOpacity>
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
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, backgroundColor: '#fff', fontSize: 15, height: 100, textAlignVertical: 'top' },
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
});