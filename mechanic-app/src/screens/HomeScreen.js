import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Animated
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';
import { getSocket } from '../config/socket';

const RadarScanner = () => {
  const scaleAnim1 = useRef(new Animated.Value(0.2)).current;
  const opacityAnim1 = useRef(new Animated.Value(1)).current;
  const scaleAnim2 = useRef(new Animated.Value(0.2)).current;
  const opacityAnim2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse1 = Animated.loop(
      Animated.parallel([
        Animated.timing(scaleAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        })
      ])
    );

    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.parallel([
          Animated.timing(scaleAnim2, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim2, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          })
        ])
      ])
    );

    pulse1.start();
    pulse2.start();

    return () => {
      pulse1.stop();
      pulse2.stop();
    };
  }, []);

  return (
    <View style={styles.radarContainer}>
      <View style={styles.radarCenter}>
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              transform: [{ scale: scaleAnim1 }],
              opacity: opacityAnim1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              transform: [{ scale: scaleAnim2 }],
              opacity: opacityAnim2,
            },
          ]}
        />
        <View style={styles.sonarCore}>
          <Text style={{ fontSize: 24 }}>📡</Text>
        </View>
      </View>
      <Text style={styles.scanningText}>Scanning for nearby requests...</Text>
      <Text style={styles.scanningSub}>Auto-refreshing live dispatcher</Text>
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { mechanic, mechanicToken } = useContext(AuthContext);
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState([]);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [stats, setStats] = useState({
    jobsToday: 0,
    earningsToday: 0,
    rating: 5.0,
    totalJobs: 0
  });
  const [acceptLoading, setAcceptLoading] = useState({});

  useEffect(() => {
    if (mechanicToken) {
      fetchStats();
      // Also fetch isOnline state from profile on mount
      fetchProfileOnlineStatus();

      const unsubscribe = navigation.addListener('focus', () => {
        fetchStats();
        fetchProfileOnlineStatus();
      });

      return unsubscribe;
    }
  }, [mechanicToken, navigation]);

  useEffect(() => {
    let interval;
    if (mechanicToken && isOnline) {
      fetchPendingRequests();
      interval = setInterval(() => {
        fetchPendingRequests();
      }, 10000);
    } else {
      setRequests([]);
    }
    return () => clearInterval(interval);
  }, [isOnline, mechanicToken]);

  const fetchProfileOnlineStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mechanic/profile`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success && data.mechanic) {
        setIsOnline(data.mechanic.isOnline || false);
      }
    } catch (error) {
      console.log('Error fetching online status:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mechanic/stats`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStats({
          jobsToday: data.jobsToday || 0,
          earningsToday: data.earningsToday || 0,
          rating: data.rating || 5.0,
          totalJobs: data.totalJobs || 0
        });
      }
    } catch (error) {
      console.log('Error fetching stats:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mechanic/requests/pending`, {
        headers: {
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setRequests(data);
      }
    } catch (error) {
      console.log('Error fetching pending requests:', error);
    }
  };

  const toggleStatus = async () => {
    const newStatus = !isOnline;
    setToggleLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mechanic/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        },
        body: JSON.stringify({ isOnline: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        setIsOnline(data.isOnline);
      } else {
        Alert.alert('Error', data.message || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status. Server is unreachable.');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleAcceptRequest = async (id) => {
    setAcceptLoading(prev => ({ ...prev, [id]: true }));
    try {
      const response = await fetch(`${API_URL}/api/mechanic/requests/${id}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();

      if (data.success) {
        // Emit Socket event to notify customer
        const socket = getSocket(mechanicToken);
        if (socket) {
          socket.emit('job:accepted', {
            jobId: data.jobId,
            mechanicName: mechanic?.name || 'Mechanic',
            mechanicPhone: mechanic?.phone || '+919999999999'
          });
        }

        // Navigate to ActiveJob map screen
        navigation.navigate('ActiveJob', {
          jobId: data.jobId,
          customerLocation: data.customerLocation,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerAddress: data.location,
          issue: data.issue
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to accept request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request. Server is unreachable.');
    } finally {
      setAcceptLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/mechanic/requests/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mechanicToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setRequests(prev => prev.filter(r => r._id !== id));
      } else {
        Alert.alert('Error', data.message || 'Failed to reject request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request. Server is unreachable.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{mechanic?.name || 'Mechanic'}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          {toggleLoading ? (
            <ActivityIndicator size="small" color="#00BFA5" />
          ) : (
            <Switch
              trackColor={{ false: '#767577', true: '#00BFA5' }}
              thumbColor={isOnline ? '#ffffff' : '#f4f3f4'}
              onValueChange={toggleStatus}
              value={isOnline}
            />
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.jobsToday}</Text>
          <Text style={styles.statLabel}>Jobs Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{stats.earningsToday}</Text>
          <Text style={styles.statLabel}>Earnings Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.rating.toFixed(1)} ★</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Incoming Requests</Text>

      {requests.length === 0 ? (
        isOnline ? (
          <RadarScanner />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Go online to receive requests</Text>
          </View>
        )
      ) : (
        requests.map(req => (
          <View key={req._id} style={styles.requestCard}>
            <View style={styles.reqHeader}>
              <Text style={styles.reqCustomer}>{req.customerName}</Text>
              <Text style={styles.reqDistance}>{req.distance}</Text>
            </View>
            <Text style={styles.reqDetails}>
              {req.vehicleMake} {req.vehicleModel} • {req.issueType.replace('_', ' ')}
            </Text>
            <Text style={styles.reqAddress} numberOfLines={1}>
              📍 {req.location}
            </Text>
            {req.issueDescription ? (
              <Text style={styles.reqDesc}>"{req.issueDescription}"</Text>
            ) : null}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleRejectRequest(req._id)}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleAcceptRequest(req._id)}
                disabled={acceptLoading[req._id]}
              >
                {acceptLoading[req._id] ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  greeting: {
    color: '#aaaaaa',
    fontSize: 16,
  },
  name: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'center',
    width: 60,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#252542',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  statValue: {
    color: '#00BFA5',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    color: '#aaaaaa',
    fontSize: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  emptyContainer: {
    backgroundColor: '#252542',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 50,
  },
  emptyText: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  requestCard: {
    backgroundColor: '#252542',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  reqCustomer: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  reqDistance: {
    color: '#00BFA5',
    fontWeight: 'bold',
  },
  reqDetails: {
    color: '#ffffff',
    marginBottom: 5,
    fontSize: 15,
  },
  reqAddress: {
    color: '#aaaaaa',
    fontSize: 13,
    marginBottom: 10,
  },
  reqDesc: {
    color: '#aaaaaa',
    fontSize: 13,
    fontStyle: 'italic',
    backgroundColor: '#1a1a2e',
    padding: 8,
    borderRadius: 6,
    marginBottom: 15,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#3a3a5a',
  },
  acceptBtn: {
    backgroundColor: '#00BFA5',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  radarContainer: {
    backgroundColor: '#252542',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  radarCenter: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  pulseCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#00BFA5',
    backgroundColor: 'rgba(0, 191, 165, 0.08)',
  },
  sonarCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00BFA5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#00BFA5',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
  },
  scanningText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  scanningSub: {
    color: '#aaaaaa',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default HomeScreen;
