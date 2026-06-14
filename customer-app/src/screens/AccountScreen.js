/* eslint-disable no-console */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Skeleton from '../components/Skeleton';
import { theme } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function AccountScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        // Mock fallback for guest/dev environments
        setUser({
          name: 'Guest Customer',
          phone: '9876543210'
        });
      }
    } catch (error) {
      console.log('Error loading user profile:', error);
      setUser({
        name: 'Guest Customer',
        phone: '9876543210'
      });
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const formatPhoneNumber = (phoneStr) => {
    if (!phoneStr) return '98765 43210';
    // Clean string from any non-digits
    const cleaned = phoneStr.replace(/\D/g, '');
    // If it contains country code, strip it for formatting
    const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
    // Format as XXXXX XXXXX
    if (tenDigits.length === 10) {
      return `${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
    }
    return phoneStr;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Header Skeleton */}
        <View style={styles.headerSkeleton}>
          <Skeleton width={180} height={24} borderRadius={6} style={{ marginBottom: 10 }} />
          <Skeleton width={130} height={16} borderRadius={4} />
        </View>

        {/* Action Row Skeleton */}
        <View style={styles.skeletonActionsRow}>
          <Skeleton width={80} height={70} borderRadius={12} />
          <Skeleton width={80} height={70} borderRadius={12} />
          <Skeleton width={80} height={70} borderRadius={12} />
        </View>

        {/* Wallet & Subscription Skeleton */}
        <Skeleton width="100%" height={64} borderRadius={16} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={64} borderRadius={16} style={{ marginBottom: 24 }} />

        {/* Menu list Skeleton */}
        <View style={{ gap: 15 }}>
          <Skeleton width="100%" height={48} borderRadius={10} />
          <Skeleton width="100%" height={48} borderRadius={10} />
          <Skeleton width="100%" height={48} borderRadius={10} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Scrollable Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.header}>
          <Text style={styles.greetingText}>
            Hello, <Text style={styles.boldText}>{user?.name || 'Customer'}</Text>
          </Text>
          <Text style={styles.phoneText}>
            🇮🇳 +91 {formatPhoneNumber(user?.phone)}
          </Text>
        </Animated.View>

        {/* 3-Column Quick Actions Row */}
        <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.actionsRow}>
          {/* Order History */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('ServiceHistory')}
          >
            <View style={styles.actionIconBg}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color="#E8192C" />
              <Ionicons name="time" size={12} color="#E8192C" style={styles.clockSubIcon} />
            </View>
            <Text style={styles.actionLabel}>Order History</Text>
          </TouchableOpacity>

          {/* My Vehicles */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('AddressBook')}
          >
            <View style={styles.actionIconBg}>
              <Ionicons name="car" size={24} color="#E8192C" />
            </View>
            <Text style={styles.actionLabel}>My Vehicles</Text>
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              Alert.alert(
                'Help & Support',
                'Need assistance? Call us 24/7 at +1-800-555-0199 or email support@roadsideassistance.com.'
              );
            }}
          >
            <View style={styles.actionIconBg}>
              <Ionicons name="headset" size={24} color="#E8192C" />
            </View>
            <Text style={styles.actionLabel}>Help & Support</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Wallet Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <TouchableOpacity
            style={styles.walletCard}
            onPress={() => {
              Alert.alert(
                'GoApp Money Wallet',
                'Your current GoApp Money balance is ₹1,500. You can use it to pay for emergency roadside requests and store orders.'
              );
            }}
            activeOpacity={0.8}
          >
            <View style={styles.walletLeft}>
              <View style={styles.walletLogoContainer}>
                <Text style={styles.walletLogoText}>G</Text>
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletTitle}>GoApp Money</Text>
                <Text style={styles.walletBalance}>₹1,500</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Subscription Banner */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <TouchableOpacity
            style={styles.subCard}
            onPress={() => {
              Alert.alert(
                'Miles Premium',
                'Save over ₹19,400 annually. Get free towing, unlimited battery jumpstarts, free flat tyre repair, and zero dispatch fees. Join today!'
              );
            }}
            activeOpacity={0.8}
          >
            <View style={styles.subLeft}>
              <View style={styles.subBadge}>
                <Text style={styles.subBadgeText}>Miles</Text>
              </View>
              <Text style={styles.subTitle}>
                Save ₹19400 Annually, Free SOS & much more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#E8192C" />
          </TouchableOpacity>
        </Animated.View>

        {/* Divider line */}
        <View style={styles.divider} />

        {/* Menu list items */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.menuContainer}>
          {/* Profile with Incomplete status */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="person-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.menuLabel}>Profile</Text>
              <View style={styles.incompleteBadge}>
                <Text style={styles.incompleteBadgeText}>Incomplete</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Set Preferences */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Preferences', 'Preference settings coming soon!');
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="sliders-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.menuLabel}>Set Preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Refer and Earn */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Referral')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="gift-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.menuLabel}>Refer and Earn</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Register as Partner */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Register as Partner',
                'Become a towing or service partner with us. Register details at partners@roadside.com'
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconCircle}>
                <FontAwesome5 name="handshake" size={16} color="#374151" />
              </View>
              <Text style={styles.menuLabel}>Register as Partner</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Settings Section with Switch */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Settings</Text>
          <View style={styles.settingsItem}>
            <View style={styles.settingsLeft}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="notifications-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.settingsLabel}>App Notifications</Text>
            </View>
            <Switch
              trackColor={{ false: '#E5E7EB', true: '#FED7D7' }}
              thumbColor={notificationsEnabled ? '#E8192C' : '#9CA3AF'}
              ios_backgroundColor="#E5E7EB"
              onValueChange={setNotificationsEnabled}
              value={notificationsEnabled}
            />
          </View>
        </Animated.View>

        {/* Footer links */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.footer}>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => Alert.alert('Privacy Policy', 'Standard roadside app privacy terms.')}>
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.footerLinkText}>Logout</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <Text style={styles.footerVersionText}>v3.2.5</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        {/* Home */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        {/* Help */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => navigation.navigate('Help')}
        >
          <Ionicons name="help-circle-outline" size={24} color="#6B7280" />
          <Text style={styles.navText}>Help</Text>
        </TouchableOpacity>

        {/* SOS - Center floating bell */}
        <TouchableOpacity
          style={styles.sosNavButton}
          onPress={() => navigation.navigate('SOS')}
          activeOpacity={0.85}
        >
          <View style={styles.sosNavCircle}>
            <Ionicons name="notifications" size={28} color="#FFF" />
          </View>
          <Text style={styles.sosNavText}>SOS</Text>
        </TouchableOpacity>



        {/* Account / Active */}
        <TouchableOpacity
          style={styles.navTab}
          onPress={() => {}}
        >
          <Ionicons name="person" size={24} color="#E8192C" />
          <Text style={[styles.navText, styles.activeNavText]}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    padding: theme.spacing.horizontalPadding,
    backgroundColor: theme.colors.white,
    paddingTop: 60,
  },
  scrollContent: {
    padding: theme.spacing.horizontalPadding,
    paddingTop: 60,
    paddingBottom: 110, // clear bottom navigation
  },
  headerSkeleton: {
    marginBottom: 30,
  },
  skeletonActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  header: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 22,
    color: theme.colors.textPrimary,
  },
  boldText: {
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  phoneText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionItem: {
    width: '30%',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.card.borderRadius,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  clockSubIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: theme.colors.white,
    borderRadius: 6,
    padding: 1,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  walletCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.card.borderRadius,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletLogoText: {
    color: '#D97706',
    fontWeight: 'bold',
    fontSize: 20,
  },
  walletInfo: {
    justifyContent: 'center',
  },
  walletTitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  subCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: theme.card.borderRadius,
    padding: 16,
    marginBottom: 20,
  },
  subLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  subBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.button.borderRadius,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  subBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  subTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
  },
  menuContainer: {
    marginVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  incompleteBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  incompleteBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  settingsSection: {
    marginTop: 20,
    marginBottom: 15,
  },
  settingsSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.card.borderRadius,
    padding: 12,
    paddingRight: 16,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLinkText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  footerDot: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  footerVersionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    height: 75,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    paddingBottom: 10,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.18,
  },
  navText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  sosNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -15,
    width: width * 0.18,
  },
  sosNavCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sosNavText: {
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: 'bold',
  }
});
