import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import API_URL from '../config/api';

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

const getTypeConfig = (type) => {
  switch (type) {
    case 'new_request':
      return { icon: 'briefcase-outline', bg: '#EEF2FF', color: '#362A84' };
    case 'payment_received':
      return { icon: 'wallet-outline', bg: '#DCFCE7', color: '#15803D' };
    case 'job_cancelled':
      return { icon: 'close-circle-outline', bg: '#FEE2E2', color: '#DC2626' };
    case 'kyc_update':
      return { icon: 'shield-checkmark-outline', bg: '#FEF3C7', color: '#D97706' };
    case 'announcement':
    case 'admin_broadcast':
      return { icon: 'megaphone-outline', bg: '#E0F2FE', color: '#0284C7' };
    default:
      return { icon: 'notifications-outline', bg: '#F1F5F9', color: '#475569' };
  }
};

const NotificationHistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android' ? Math.max(insets.top, 24) : insets.top;
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 24) : insets.bottom;

  const { mechanicToken } = useContext(AuthContext);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!mechanicToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/mechanic/notifications`, {
        headers: { Authorization: `Bearer ${mechanicToken}` }
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('[NotificationHistoryScreen] Error fetching notifications:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mechanicToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id) => {
    try {
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
      await fetch(`${API_URL}/api/mechanic/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${mechanicToken}` }
      });
    } catch (err) {
      console.error('[NotificationHistoryScreen] Error marking as read:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      const res = await fetch(`${API_URL}/api/mechanic/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${mechanicToken}` }
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'All notifications marked as read');
      }
    } catch (err) {
      console.error('[NotificationHistoryScreen] Error marking all read:', err.message);
    }
  };

  const handlePressItem = (item) => {
    if (!item.isRead) {
      markAsRead(item._id);
    }

    if (item.type === 'new_request' && item.relatedId) {
      navigation.navigate('IncomingRequest', { requestId: item.relatedId });
    } else if (item.type === 'payment_received') {
      navigation.navigate('Earnings');
    } else if (item.type === 'kyc_update') {
      navigation.navigate('Profile');
    }
  };

  const renderItem = ({ item }) => {
    const config = getTypeConfig(item.type);
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.cardUnread]}
        onPress={() => handlePressItem(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>

        <View style={styles.contentCol}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timestamp}>{formatRelativeTime(item.createdAt)}</Text>
          </View>

          <Text style={styles.bodyText} numberOfLines={2}>
            {item.message || item.body}
          </Text>
        </View>

        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        
        {notifications.some((n) => !n.isRead) ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Read All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#362A84" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomInset + 30 },
            notifications.length === 0 && { flex: 1 }
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#362A84']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={42} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>
                Important updates about service requests, earnings, and account status will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#362A84',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  readAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  readAllText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardUnread: {
    borderColor: '#C7D2FE',
    backgroundColor: '#FAF7FF',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  titleUnread: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  bodyText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#362A84',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationHistoryScreen;
