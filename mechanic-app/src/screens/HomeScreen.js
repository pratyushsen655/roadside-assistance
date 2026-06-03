import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { api } from '../utils/api';
import { useIsFocused } from '@react-navigation/native';

const HomeScreen = ({ navigation }) => {
  const { user, signOut } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/mechanics/' + user.id + '/stats');
      if (res.success) setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchStats();
  }, [isFocused]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff9500" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {user.name || 'Mechanic'}!</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Earnings (₹)</Text>
        <Text style={styles.amount}>₹ {stats?.total || 0}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('JobRequests')}>
        <Text style={styles.buttonText}>View Job Requests</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  welcome: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 5,
    fontFamily: 'Inter',
  },
  amount: {
    fontSize: 32,
    color: '#ff9500',
    fontFamily: 'Inter',
  },
  button: {
    backgroundColor: '#ff9500',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter',
  },
  logoutBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ff9500',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

export default HomeScreen;
