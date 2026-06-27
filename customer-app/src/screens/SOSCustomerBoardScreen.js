import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Dimensions, TextInput, ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../config/socket';

const { width, height } = Dimensions.get('window');

const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if coordinate is a valid latitude/longitude number pair
const isValidCoordinate = (coord) => {
  return coord && 
         typeof coord.latitude === 'number' && !isNaN(coord.latitude) &&
         typeof coord.longitude === 'number' && !isNaN(coord.longitude);
};

export default function SOSCustomerBoardScreen({ route, navigation }) {
  const { sosId, mechanicId, mechanicName, mechanicPhone, customerLat, customerLng } = route.params || {};
  const { token } = useContext(AuthContext);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [customerCoords] = useState({
    latitude: customerLat || 28.6139,
    longitude: customerLng || 77.2090
  });

  const [mechanicCoords, setMechanicCoords] = useState(null);
  const [status, setStatus] = useState('accepted'); // accepted, en_route, arrived, in_progress, completed
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: `Hello! I am ${mechanicName || 'your responder'}. I've accepted your request and am heading your way. Please keep your hazard lights on.`,
      sender: 'mechanic'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [eta, setEta] = useState(null);

  const socket = getSocket(token);

  useEffect(() => {
    if (!socket || !sosId) return;

    // Join SOS/job room
    socket.emit('join:job:room', { jobId: sosId });

    const reconnectHandler = () => {
      console.log('[Socket] Reconnected - rejoining job room:', sosId);
      socket.emit('join:job:room', { jobId: sosId });
    };
    socket.on('connect', reconnectHandler);

    // Listen for mechanic location updates
    socket.on('mechanic:location:update', (coords) => {
      try {
        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
          if (isMounted.current) {
            setMechanicCoords({
              latitude: coords.lat,
              longitude: coords.lng
            });
          }
        }
      } catch (err) {
        console.error('[SOS_CUSTOMER_BOARD_SOCKET_ERROR] Error handling mechanic location update:', err);
      }
    });

    // Listen for job status changes
    socket.on('job:status:changed', (data) => {
      try {
        if (data && data.status) {
          if (isMounted.current) {
            setStatus(data.status);
          }
          if (data.status === 'completed') {
            Alert.alert('Service Completed', 'The mechanic has finished the emergency work.', [
              { text: 'Go Home', onPress: () => {
                if (isMounted.current && navigation) {
                  navigation.navigate('Home');
                }
              } }
            ]);
          }
        }
      } catch (err) {
        console.error('[SOS_CUSTOMER_BOARD_SOCKET_ERROR] Error handling job status changes:', err);
      }
    });

    // Listen for real-time messages
    socket.on('chat:message', (msg) => {
      try {
        if (msg && msg.jobId === sosId && msg.senderType === 'mechanic') {
          if (isMounted.current) {
            setMessages((prev) => [
              ...prev,
              { id: msg._id || String(Date.now()), text: msg.message, sender: 'mechanic' }
            ]);
          }
        }
      } catch (err) {
        console.error('[SOS_CUSTOMER_BOARD_SOCKET_ERROR] Error handling chat message:', err);
      }
    });

    return () => {
      socket.off('mechanic:location:update');
      socket.off('job:status:changed');
      socket.off('chat:message');
      socket.off('connect', reconnectHandler);
    };
  }, [sosId, socket]);

  // Calculate distance & ETA dynamically
  useEffect(() => {
    try {
      if (mechanicCoords) {
        const dist = getDistanceInKm(
          customerCoords.latitude,
          customerCoords.longitude,
          mechanicCoords.latitude,
          mechanicCoords.longitude
        );
        // Roughly 3 minutes per km
        const calculatedEta = Math.max(1, Math.round(dist * 3));
        if (isMounted.current) {
          setEta(calculatedEta);
        }
      }
    } catch (err) {
      console.error('[SOS_CUSTOMER_BOARD_ETA_ERROR] Error calculating ETA:', err);
    }
  }, [mechanicCoords, customerCoords]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (socket && sosId) {
      try {
        socket.emit('chat:send', {
          jobId: sosId,
          message: inputText,
          senderType: 'customer',
          senderId: token // or user ID
        });
      } catch (err) {
        console.error('[SOS_CUSTOMER_BOARD_CHAT_ERROR] Error emitting chat message:', err);
      }

      if (isMounted.current) {
        setMessages((prev) => [
          ...prev,
          { id: String(Date.now()), text: inputText, sender: 'customer' }
        ]);
        setInputText('');
      }
    }
  };

  const handleCallMechanic = () => {
    if (mechanicPhone) {
      Linking.openURL(`tel:${mechanicPhone}`);
    } else {
      Alert.alert('Phone Number Unavailable', 'The mechanic phone number is not available.');
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'accepted': return 'On the way';
      case 'en_route': return 'Traveling';
      case 'arrived': return 'Arrived';
      case 'work_in_progress': return 'Assisting';
      default: return 'Traveling';
    }
  };

  const latestMechanicMessage = [...messages]
    .reverse()
    .find((m) => m.sender === 'mechanic')?.text;

  // Dark Map Style JSON to render a grid/dark view
  const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
    { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#121212' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#181818' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
    { featureType: 'road.highway.controlled_portal', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] }
  ];

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS Customer Board</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ServiceHistory')}>
          <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          customMapStyle={darkMapStyle}
          initialRegion={{
            latitude: customerCoords.latitude,
            longitude: customerCoords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
          }}
        >
          {/* Customer pin (orange/yellow) */}
          {isValidCoordinate(customerCoords) && (
            <Marker coordinate={customerCoords} title="Your Location">
              <View style={styles.customerMarkerBg}>
                <Ionicons name="location" size={28} color="#FF9F0A" />
              </View>
            </Marker>
          )}

          {/* Mechanic pin (red pulsing) */}
          {isValidCoordinate(mechanicCoords) && (
            <Marker coordinate={mechanicCoords} title="Mechanic Location">
              <View style={styles.mechanicMarkerBg}>
                <Ionicons name="car-sport" size={28} color="#E8192C" />
              </View>
            </Marker>
          )}

          {/* Route line (teal/cyan) */}
          {isValidCoordinate(customerCoords) && isValidCoordinate(mechanicCoords) && (
            <Polyline
              coordinates={[customerCoords, mechanicCoords]}
              strokeWidth={4}
              strokeColor="#2DD4D4"
            />
          )}
        </MapView>

        {/* ETA Badge */}
        <View style={styles.etaBadge}>
          <View style={styles.etaDot} />
          <Text style={styles.etaText}>
            ETA: {eta !== null ? `${eta} MINS` : 'CALCULATING...'}
          </Text>
        </View>
      </View>

      {/* Mechanic Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.avatarBg}>
          <Text style={styles.avatarText}>
            {mechanicName ? mechanicName.charAt(0).toUpperCase() : 'M'}
          </Text>
        </View>

        <View style={styles.mechanicDetails}>
          <Text style={styles.mechanicName}>{mechanicName || 'Responder Mechanic'}</Text>
          <View style={styles.ratingRow}>
            <FontAwesome name="star" size={14} color="#FFD60A" />
            <Text style={styles.ratingText}>4.8</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{getStatusLabel()}</Text>
            </View>
          </View>
          <Text style={styles.vehicleDetails}>Silver Bolero • KA 03 MB 5689</Text>
        </View>

        <TouchableOpacity style={styles.callButton} onPress={handleCallMechanic}>
          <Ionicons name="call" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Chat / Status Panel */}
      <View style={styles.chatPanel}>
        <View style={styles.chatBubble}>
          <Text style={styles.chatText}>
            {latestMechanicMessage || 'Waiting for status update...'}
          </Text>
        </View>
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Inform mechanic..."
          placeholderTextColor="#8E8E93"
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mapContainer: {
    height: height * 0.42,
    position: 'relative',
  },
  customerMarkerBg: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mechanicMarkerBg: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 25, 44, 0.2)',
    padding: 6,
    borderRadius: 20,
  },
  etaBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  etaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8192C',
    marginRight: 6,
  },
  etaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  avatarBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8192C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mechanicDetails: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    color: '#FFD60A',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#FF9F0A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  vehicleDetails: {
    fontSize: 13,
    color: '#AEAEB2',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  chatPanel: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  chatBubble: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  chatText: {
    color: '#E5E5EA',
    fontSize: 14,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8192C',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
