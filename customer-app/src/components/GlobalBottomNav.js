// src/components/GlobalBottomNav.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useNavigationState } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function GlobalBottomNav({ state: propState, navigation: propNavigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Try to use navigation from props first, then from hooks
  let navigation;
  try {
    navigation = propNavigation || useNavigation();
  } catch (e) {
    // Return null if rendered outside navigation context (e.g., intermediate transitions)
    return null;
  }

  const state = propState || useNavigationState(s => s);

  if (!state || !state.routes) {
    return null;
  }

  // Find the active route name
  const getActiveRouteName = (navState) => {
    if (!navState || !navState.routes) return null;
    const route = navState.routes[navState.index];
    if (route.state) {
      return getActiveRouteName(route.state);
    }
    return route.name;
  };

  const currentRouteName = getActiveRouteName(state) || 'Home';

  const navigateToTab = (screenName) => {
    if (currentRouteName === screenName) return;
    try {
      navigation.navigate(screenName);
    } catch (e) {
      console.warn(`[GlobalBottomNav] Failed to navigate to ${screenName}:`, e.message);
    }
  };

  return (
    <View style={[styles.bottomNavBar, { bottom: Math.max(insets.bottom, 16) }]}>
      {/* Home Tab */}
      <TouchableOpacity 
        style={styles.navTab} 
        onPress={() => navigateToTab('Home')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={currentRouteName === 'Home' ? 'home' : 'home-outline'} 
          size={24} 
          color={currentRouteName === 'Home' ? '#E8192C' : '#6B7280'} 
          style={currentRouteName === 'Home' && styles.activeNavIcon}
        />
        <Text style={[styles.navText, currentRouteName === 'Home' && styles.activeNavText]}>
          {t('nav.home', 'Home')}
        </Text>
      </TouchableOpacity>

      {/* Bookings Tab */}
      <TouchableOpacity 
        style={styles.navTab} 
        onPress={() => navigateToTab('ServiceHistory')}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name={currentRouteName === 'ServiceHistory' ? 'calendar-check' : 'calendar-check-outline'} 
          size={24} 
          color={currentRouteName === 'ServiceHistory' ? '#E8192C' : '#6B7280'} 
          style={currentRouteName === 'ServiceHistory' && styles.activeNavIcon}
        />
        <Text style={[styles.navText, currentRouteName === 'ServiceHistory' && styles.activeNavText]}>
          {t('nav.bookings', 'Bookings')}
        </Text>
      </TouchableOpacity>

      {/* SOS Tab - Center Highlighted Button */}
      <TouchableOpacity 
        style={styles.sosNavButton} 
        onPress={() => navigateToTab('SOS')} 
        activeOpacity={0.85}
      >
        <View style={styles.sosNavCircle}>
          <Ionicons 
            name="notifications-outline" 
            size={26} 
            color="#FFF" 
          />
        </View>
        <Text style={styles.sosNavText}>
          {t('nav.sos', 'SOS')}
        </Text>
      </TouchableOpacity>

      {/* Help Tab */}
      <TouchableOpacity 
        style={styles.navTab} 
        onPress={() => navigateToTab('Help')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={currentRouteName === 'Help' ? 'help-circle' : 'help-circle-outline'} 
          size={24} 
          color={currentRouteName === 'Help' ? '#E8192C' : '#6B7280'} 
          style={currentRouteName === 'Help' && styles.activeNavIcon}
        />
        <Text style={[styles.navText, currentRouteName === 'Help' && styles.activeNavText]}>
          {t('nav.help', 'Help')}
        </Text>
      </TouchableOpacity>

      {/* Account Tab */}
      <TouchableOpacity 
        style={styles.navTab} 
        onPress={() => navigateToTab('Account')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={currentRouteName === 'Account' ? 'person' : 'person-outline'} 
          size={24} 
          color={currentRouteName === 'Account' ? '#E8192C' : '#6B7280'} 
          style={currentRouteName === 'Account' && styles.activeNavIcon}
        />
        <Text style={[styles.navText, currentRouteName === 'Account' && styles.activeNavText]}>
          {t('nav.account', 'Account')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    paddingVertical: 10,
    borderRadius: 24,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.18,
    paddingVertical: 4,
  },
  activeNavIcon: {
    transform: [{ scale: 1.05 }],
  },
  navText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeNavText: {
    color: '#E8192C',
    fontWeight: 'bold',
  },
  sosNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.18,
    marginTop: -20,
  },
  sosNavCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A4A83',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#0A4A83',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  sosNavText: {
    fontSize: 11,
    color: '#0A4A83',
    marginTop: 4,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
