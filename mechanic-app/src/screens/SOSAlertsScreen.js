import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Vibration
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { getSocket } from '../config/socket';

export default function SOSAlertsScreen() {
  const { mechanicToken } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchActiveSOS = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sos/active`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        if (isMounted.current) {
          setAlerts(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.log('Error fetching active SOS alerts:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (mechanicToken) {
      fetchActiveSOS();
      const interval = setInterval(fetchActiveSOS, 10000);

      // Real-time listener for new SOS
      const socket = getSocket(mechanicToken);
      if (socket) {
        socket.on('sos:new', (newSos) => {
          try {
            console.log('[Socket] New SOS received:', newSos);
            Vibration.vibrate([0, 400, 200, 400]);
            if (isMounted.current) {
              setAlerts((prev) => {
                if (!prev.find(item => item._id === newSos._id)) {
                  return [newSos, ...prev];
                }
                return prev;
              });
            }
          } catch (err) {
            console.error('[SOS_ALERTS_SOCKET_ERROR] Error handling sos:new event:', err);
          }
        });
      }

      return () => {
        clearInterval(interval);
        if (socket) {
          socket.off('sos:new');
        }
      };
    }
  }, [mechanicToken]);

  const handleAccept = async (id) => {
    if (isMounted.current) {
      setAcceptingId(id);
    }
    try {
      const response = await fetch(`${API_URL}/api/sos/${id}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', "You've been assigned to this emergency!");
        // Remove from list
        if (isMounted.current) {
          setAlerts(prev => prev.filter(item => item._id !== id));
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to accept SOS emergency.');
      }
    } catch (error) {
      console.error('[SOS_ALERTS_ACCEPT_ERROR] Error accepting SOS:', error);
      Alert.alert('Error', 'Cannot connect to server.');
    } finally {
      if (isMounted.current) {
        setAcceptingId(null);
      }
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.emergencyLabel}>🚨 EMERGENCY SOS</Text>
        <Text style={styles.timeLabel}>
          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.label}>Emergency:</Text>
        <Text style={[styles.value, { color: '#FF3B30', fontWeight: 'bold' }]} numberOfLines={2}>
          {item.description || item.serviceType || 'Emergency Assistance Required'}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Customer ID:</Text>
        <Text style={styles.value} numberOfLines={1}>{item.customerId}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Coordinates:</Text>
        <Text style={styles.coordsValue}>
          📍 {item.location?.lat?.toFixed(6)}, {item.location?.lng?.toFixed(6)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.acceptBtn}
        onPress={() => handleAccept(item._id)}
        disabled={acceptingId === item._id}
      >
        {acceptingId === item._id ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.acceptBtnText}>Accept Emergency Dispatch</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active SOS Dispatches</Text>
        <Text style={styles.headerSubtitle}>Real-time emergency broadcast scanner</Text>
      </View>

      {loading && alerts.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.loadingText}>Connecting to emergency dispatch...</Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.radarIcon}>📡</Text>
          <Text style={styles.noAlertsText}>No active emergency SOS alerts nearby</Text>
          <Text style={styles.noAlertsSub}>Scanning frequencies automatically...</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchActiveSOS}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 50,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  emergencyLabel: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  timeLabel: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: '#aaaaaa',
    fontSize: 14,
    width: 110,
  },
  value: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  coordsValue: {
    color: '#00BFA5',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  acceptBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    elevation: 2,
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaaaaa',
    fontSize: 14,
    marginTop: 15,
  },
  radarIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  noAlertsText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  noAlertsSub: {
    color: '#aaaaaa',
    fontSize: 13,
    textAlign: 'center',
  },
});
