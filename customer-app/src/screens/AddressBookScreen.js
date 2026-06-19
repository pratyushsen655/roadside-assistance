/* eslint-disable no-console */
import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Modal, TextInput, LayoutAnimation,
  Platform, UIManager, Alert, ActivityIndicator
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import * as Location from 'expo-location';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android Old Architecture only
// (New Architecture handles this natively — calling the experimental
// API there is a no-op and prints a warning, so we skip it)
const isOldArchitecture = !('__turboModuleProxy' in global);
if (Platform.OS === 'android' && isOldArchitecture && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';

export default function AddressBookScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [addresses, setAddresses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Modal states
  const [label, setLabel] = useState('Home');
  const [addressText, setAddressText] = useState('');
  const [landmark, setLandmark] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  const [emptyStateLat, setEmptyStateLat] = useState(null);
  const [emptyStateLng, setEmptyStateLng] = useState(null);
  const [emptyStateName, setEmptyStateName] = useState('Locating...');
  const [emptyStateAddress, setEmptyStateAddress] = useState('Fetching your current location...');

  useEffect(() => {
    loadAddresses();
    fetchEmptyStateLocation();
  }, []);

  const fetchEmptyStateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setEmptyStateName('Permission Denied');
        setEmptyStateAddress('Please enable location permissions to see your current area.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setEmptyStateLat(position.coords.latitude);
      setEmptyStateLng(position.coords.longitude);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const areaName = place.subregion || place.district || place.city || 'Current Location';
        const addrString = `${place.name || ''}, ${place.street || ''}, ${place.district || ''}, ${place.city || ''}, ${place.region || ''} - ${place.postalCode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim();
        setEmptyStateName(areaName);
        setEmptyStateAddress(addrString);
      } else {
        setEmptyStateName('Current Location');
        setEmptyStateAddress('Unable to fetch detailed address');
      }
    } catch (e) {
      setEmptyStateName('Location Error');
      setEmptyStateAddress('Could not determine your location.');
    }
  };

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/address`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAddresses(data.addresses);
      }
    } catch (e) {
      console.log('Error loading addresses', e);
    }
    setLoading(false);
  };

  const fetchGPSLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to auto-fill your address');
        setLocationLoading(false);
        return;
      }
      
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(position.coords.latitude);
      setLng(position.coords.longitude);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const addrString = `${place.name || ''}, ${place.street || ''}, ${place.district || ''}, ${place.city || ''}, ${place.region || ''} - ${place.postalCode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim();
        setAddressText(addrString);
      }
    } catch (e) {
      console.log('Error fetching GPS', e);
      Alert.alert('Error', 'Failed to fetch GPS location.');
    }
    setLocationLoading(false);
  };

  const handleFabPress = async () => {
    setLabel('Home');
    setAddressText('');
    setLandmark('');
    setLat(null);
    setLng(null);
    await fetchGPSLocation();
    setModalVisible(true);
  };

  const handleAddAddress = async () => {
    if (!addressText.trim()) {
      Alert.alert('Error', 'Please enter a valid address');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          label,
          address: addressText,
          landmark,
          lat,
          lng
        })
      });
      const data = await res.json();
      if (data.success) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setAddresses([data.address, ...addresses]); 
        setModalVisible(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to save address');
      }
    } catch (e) {
      Alert.alert('Error', 'Server Error');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/address/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setAddresses(addresses.filter(item => item._id !== id));
            }
          } catch (e) {
            console.log('Error deleting address', e);
          }
        }
      }
    ]);
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/address/${id}/default`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        loadAddresses(); // reload to get updated defaults
      }
    } catch (e) {
      console.log('Error setting default address', e);
    }
  };

  const handleUseAddress = (item) => {
    navigation.navigate('Request', { selectedAddress: item.address, lat: item.location?.lat, lng: item.location?.lng });
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Home': return '🏠';
      case 'Work': return '💼';
      default: return '📍';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.labelContainer}>
          <Text style={styles.icon}>{getIcon(item.label)}</Text>
          <Text style={[styles.cardLabel, { color: '#B34700' }]}>{item.label}</Text>
          {item.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View>}
        </View>
      </View>
      <Text style={styles.addressText}>{item.address}</Text>
      {item.landmark ? <Text style={styles.landmarkText}>Landmark: {item.landmark}</Text> : null}
      
      <View style={styles.actionButtonsRow}>
        {!item.isDefault && (
          <TouchableOpacity onPress={() => handleSetDefault(item._id)} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>⭐ Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.useButton} onPress={() => handleUseAddress(item)}>
        <Text style={styles.useButtonText}>Use This Address</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyMapContainer}>
      <View style={styles.mapWrapper}>
        {emptyStateLat && emptyStateLng ? (
          <MapView
            style={styles.emptyMapView}
            initialRegion={{
              latitude: emptyStateLat,
              longitude: emptyStateLng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          />
        ) : (
          <View style={styles.emptyMapPlaceholder} />
        )}
      </View>
      <View style={styles.emptyInfoContainer}>
        <Ionicons name="location" size={50} color="#E8192C" />
        <Text style={styles.emptyAreaName}>{emptyStateName}</Text>
        <Text style={styles.emptyAddressText}>{emptyStateAddress}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Address Book</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#B34700" style={{ marginTop: 100 }} />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyComponent}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleFabPress} disabled={locationLoading}>
        {locationLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.fabText}>+</Text>
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Address</Text>
            
            <Text style={styles.inputLabel}>Label (Home/Work/Other)</Text>
            <View style={styles.chipContainer}>
              {['Home', 'Work', 'Other'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, label === type && styles.chipActive]}
                  onPress={() => setLabel(type)}
                >
                  <Text style={[styles.chipText, label === type && styles.chipTextActive]}>
                    {getIcon(type)} {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Full Address</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main St, Apt 4B, City"
              value={addressText}
              onChangeText={setAddressText}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Landmark (Optional)</Text>
            <TextInput
              style={styles.inputSingle}
              placeholder="Nearby landmark (optional)"
              value={landmark}
              onChangeText={setLandmark}
            />

            <TouchableOpacity style={styles.refetchButton} onPress={fetchGPSLocation}>
              {locationLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.refetchText}>Use Current Location</Text>}
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddAddress}>
                <Text style={styles.saveButtonText}>Save Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  backButton: { width: 60 },
  backText: { color: '#B34700', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  listContent: { padding: 0, paddingBottom: 100, flexGrow: 1 },
  emptyMapContainer: { flex: 1, backgroundColor: '#fff' },
  mapWrapper: { height: 350, width: '100%', overflow: 'hidden' },
  emptyMapView: { flex: 1, opacity: 0.7 },
  emptyMapPlaceholder: { flex: 1, backgroundColor: '#f0f0f0' },
  emptyInfoContainer: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 30 },
  emptyAreaName: { fontSize: 20, fontWeight: 'bold', color: '#E8192C', marginTop: 10, textAlign: 'center' },
  emptyAddressText: { fontSize: 15, color: '#333', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 15,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  labelContainer: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 18, marginRight: 8 },
  cardLabel: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  defaultBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 10 },
  defaultBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  addressText: { fontSize: 15, color: '#666', marginBottom: 5, lineHeight: 22 },
  landmarkText: { fontSize: 13, color: '#999', marginBottom: 15 },
  actionButtonsRow: { flexDirection: 'row', marginBottom: 15 },
  actionBtn: { marginRight: 15 },
  actionBtnText: { color: '#555', fontSize: 13 },
  useButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#B34700', borderRadius: 8, padding: 12, alignItems: 'center' },
  useButtonText: { color: '#B34700', fontSize: 15, fontWeight: 'bold' },
  fab: {
    position: 'absolute', bottom: 30, right: 30,
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#B34700',
    justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#B34700', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 5
  },
  fabText: { fontSize: 32, color: '#fff', marginTop: -4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 10 },
  chipContainer: { flexDirection: 'row', marginBottom: 20 },
  chip: { 
    paddingVertical: 10, paddingHorizontal: 15, 
    borderRadius: 20, borderWidth: 1, borderColor: '#ddd', 
    marginRight: 10, backgroundColor: '#f9f9f9'
  },
  chipActive: { backgroundColor: '#B34700', borderColor: '#B34700' },
  chipText: { fontSize: 14, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  input: { 
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, 
    padding: 15, fontSize: 16, marginBottom: 20, height: 80, textAlignVertical: 'top' 
  },
  inputSingle: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, 
    padding: 15, fontSize: 16, marginBottom: 20
  },
  refetchButton: { backgroundColor: '#4a90e2', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  refetchText: { color: '#fff', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelButton: { padding: 15, marginRight: 10 },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#B34700', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, justifyContent: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
