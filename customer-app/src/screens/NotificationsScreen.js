import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Animated, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL}/api` : 'https://roadside-assistance-production-ddaf.up.railway.app/api';

const getRelativeTime = (dateString) => {
  if (!dateString) return 'Just now';
  const now = new Date();
  const date = new Date(dateString);
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const Skeleton = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [opacity]);
  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonIcon} />
      <View style={{ flex: 1 }}>
        <View style={styles.skeletonTextLong} />
        <View style={styles.skeletonTextShort} />
      </View>
    </Animated.View>
  );
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getToken = async () => {
    return (await AsyncStorage.getItem('userToken')) || (await AsyncStorage.getItem('token'));
  };

  const fetchNotifications = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please login again.');
        await AsyncStorage.multiRemove(['token', 'user', 'tokenStoredAt']);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      const data = await res.json();
      if (res.ok && data) {
        setNotifications(data.notifications || data || []);
      } else if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        Alert.alert('Error', data?.message || 'Failed to fetch notifications');
      }
    } catch (e) {
      console.log('Error fetching notifications:', e);
      Alert.alert('Error', 'Failed to fetch notifications. Please check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAllRead = async () => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.log('Error marking all read:', e);
    }
  };

  const markReadAndNavigate = async (notif) => {
    if (!notif.read) {
      try {
        const token = await getToken();
        await fetch(`${API_BASE}/notifications/${notif._id || notif.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => (n._id === notif._id || n.id === notif.id) ? { ...n, read: true } : n));
      } catch (e) {
        console.log('Error marking read:', e);
      }
    }
    
    switch (notif.type) {
      case 'mechanic_assigned':
      case 'mechanic_en_route':
        navigation.navigate('Request');
        break;
      case 'job_complete':
      case 'rate_mechanic':
        // fall back to default or appropriate screen
        break;
      case 'new_message':
        navigation.navigate('Chat');
        break;
      default:
        break;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'mechanic_assigned': return '🔧';
      case 'job_complete': return '✅';
      case 'rate_mechanic': return '⭐';
      case 'mechanic_en_route': return '📍';
      case 'new_message': return '💬';
      default: return '🔔';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark All Read</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 100 }} />}
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          notifications.map(notif => (
            <TouchableOpacity
              key={notif._id || notif.id || Math.random().toString()}
              style={[styles.card, !notif.read && styles.unreadCard]}
              onPress={() => markReadAndNavigate(notif)}
            >
              <Text style={styles.icon}>{getIcon(notif.type)}</Text>
              <View style={styles.cardContent}>
                <Text style={styles.notifTitle}>{notif.title || 'Notification'}</Text>
                <Text style={styles.notifBody}>{notif.message || notif.body || 'You have a new update.'}</Text>
                <Text style={styles.time}>{getRelativeTime(notif.createdAt || notif.date)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    elevation: 2,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 24, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  markAllBtn: { width: 100, alignItems: 'flex-end' },
  markAllText: { fontSize: 14, color: '#FF6B00', fontWeight: 'bold' },
  scrollContent: { padding: 15 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyText: { fontSize: 16, color: '#666' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 1,
    alignItems: 'center',
  },
  unreadCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#B34700',
  },
  icon: { fontSize: 28, marginRight: 15 },
  cardContent: { flex: 1 },
  notifTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  notifBody: { fontSize: 14, color: '#666', marginBottom: 8 },
  time: { fontSize: 12, color: '#999' },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  skeletonIcon: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#ccc', marginRight: 15 },
  skeletonTextLong: { height: 16, backgroundColor: '#ccc', borderRadius: 4, marginBottom: 8, width: '80%' },
  skeletonTextShort: { height: 14, backgroundColor: '#ccc', borderRadius: 4, width: '50%' },
});
