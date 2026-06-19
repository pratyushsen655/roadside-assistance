// src/components/GlobalBottomNav.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function GlobalBottomNav() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const currentRouteName = route.name;

  const navigateToTab = (screenName) => {
    if (currentRouteName !== screenName) {
      // If navigating to Home, and it exists in history, we can reset or navigate
      // Use navigate to prevent reset of navigation state unless necessary
      navigation.navigate(screenName);
    }
  };

  return (
    <View style={[styles.bottomNavBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Home Tab */}
      <TouchableOpacity 
        style={styles.navTab} 
        onPress={() => navigateToTab('Home')}
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

      {/* Notifications Tab - highlighted center */}
      <TouchableOpacity 
        style={styles.sosNavButton} 
        onPress={() => navigateToTab('Notifications')} 
        activeOpacity={0.85}
      >
        <View style={[
          styles.sosNavCircle, 
          currentRouteName === 'Notifications' && styles.activeSosNavCircle
        ]}>
          <Ionicons 
            name={currentRouteName === 'Notifications' ? 'notifications' : 'notifications-outline'} 
            size={26} 
            color="#FFF" 
          />
        </View>
        <Text style={[
          styles.sosNavText, 
          currentRouteName === 'Notifications' && styles.activeSosNavText
        ]}>
          {t('nav.notifications', 'Notifications')}
        </Text>
      </TouchableOpacity>

      {/* Help Tab */}
      <TouchableOpacity 
        style={styles.navTab} 
        onPress={() => navigateToTab('Help')}
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
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    paddingTop: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  activeNavText: {
    color: '#E8192C',
    fontWeight: 'bold',
  },
  sosNavButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.2,
    marginTop: -15,
  },
  sosNavCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#6B7280', // neutral when inactive
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  activeSosNavCircle: {
    backgroundColor: '#1E3A8A', // highlighted blue color as request
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.4,
  },
  sosNavText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeSosNavText: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
});
