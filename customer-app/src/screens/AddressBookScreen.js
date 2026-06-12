import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Modal, TextInput, LayoutAnimation,
  Platform, UIManager, Alert, LogBox
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreLogs(['setLayoutAnimationEnabledExperimental']);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STORAGE_KEY = 'savedAddresses';

export default function AddressBookScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Modal states
  const [label, setLabel] = useState('Home');
  const [addressText, setAddressText] = useState('');

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setAddresses(JSON.parse(data));
      }
    } catch (e) {
      console.log('Error loading addresses', e);
    }
  };

  const saveAddressesToStorage = async (newAddresses) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses));
    } catch (e) {
      console.log('Error saving addresses', e);
    }
  };

  const handleAddAddress = () => {
    if (!addressText.trim()) {
      Alert.alert('Error', 'Please enter a valid address');
      return;
    }
    const newAddress = {
      id: Date.now().toString(),
      label,
      addressText,
    };
    const updated = [...addresses, newAddress];
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAddresses(updated);
    saveAddressesToStorage(updated);
    
    setModalVisible(false);
    setAddressText('');
    setLabel('Home');
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          const updated = addresses.filter(item => item.id !== id);
          setAddresses(updated);
          saveAddressesToStorage(updated);
        }
      }
    ]);
  };

  const handleUseAddress = (address) => {
    navigation.navigate('Request', { selectedAddress: address.addressText });
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
          <Text style={styles.cardLabel}>{item.label}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.addressText}>{item.addressText}</Text>
      <TouchableOpacity 
        style={styles.useButton} 
        onPress={() => handleUseAddress(item)}
      >
        <Text style={styles.useButtonText}>Use This Address</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📍</Text>
      <Text style={styles.emptyText}>No saved addresses yet</Text>
      <Text style={styles.emptySubtext}>Add a frequently used location to quickly request a mechanic.</Text>
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

      <FlatList
        data={addresses}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyComponent}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Address</Text>
            
            <Text style={styles.inputLabel}>Label</Text>
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
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddAddress}>
                <Text style={styles.saveButtonText}>Save</Text>
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
  listContent: { padding: 20, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyEmoji: { fontSize: 60, marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 10 },
  emptySubtext: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 15,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  labelContainer: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 18, marginRight: 8 },
  cardLabel: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  deleteBtn: { padding: 5 },
  deleteIcon: { fontSize: 18 },
  addressText: { fontSize: 15, color: '#666', marginBottom: 20, lineHeight: 22 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 5 },
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
    padding: 15, fontSize: 16, marginBottom: 30, height: 100, textAlignVertical: 'top' 
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelButton: { padding: 15, marginRight: 10 },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#B34700', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
