import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75; // Drawer takes up 75% of screen width

export default function DrawerMenu({ visible, onClose, mechanic, logout }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      // Slide in from left
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out to left
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleNavigate = (screen) => {
    onClose();
    navigation.navigate(screen);
  };

  const handleLogout = () => {
    onClose();
    if (logout) {
      logout();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Click outside to close */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Animated Drawer Panel */}
        <Animated.View
          style={[
            styles.drawerPanel,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          {/* Header section with mechanic details */}
          <View style={styles.drawerHeader}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account-wrench" size={40} color="#00BFA5" />
            </View>
            <Text style={styles.mechanicName} numberOfLines={1}>
              {mechanic?.name || 'Mechanic User'}
            </Text>
            <Text style={styles.mechanicPhone} numberOfLines={1}>
              {mechanic?.phone || '+919999999999'}
            </Text>
          </View>

          {/* Menu Options */}
          <View style={styles.menuItemsContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Home')}>
              <Ionicons name="home-outline" size={22} color="#00BFA5" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>{t('menu_home') || 'Home'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Jobs')}>
              <Ionicons name="clipboard-outline" size={22} color="#00BFA5" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>{t('menu_jobs') || 'My Jobs'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Earnings')}>
              <Ionicons name="wallet-outline" size={22} color="#00BFA5" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>{t('menu_earnings') || 'Earnings'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Performance')}>
              <Ionicons name="stats-chart-outline" size={22} color="#00BFA5" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>{t('menu_performance') || 'Performance'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('LanguageSelection')}>
              <Ionicons name="language-outline" size={22} color="#00BFA5" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>{t('menu_language') || 'Change Language'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Profile')}>
              <Ionicons name="person-outline" size={22} color="#00BFA5" style={styles.menuIcon} />
              <Text style={styles.menuItemText}>{t('menu_profile') || 'Profile Settings'}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('SOSAlerts')}>
              <Ionicons name="alert-circle-outline" size={22} color="#E74C3C" style={styles.menuIcon} />
              <Text style={[styles.menuItemText, { color: '#E74C3C' }]}>{t('menu_emergency') || 'SOS / Emergency'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#aaaaaa" style={styles.menuIcon} />
              <Text style={[styles.menuItemText, { color: '#aaaaaa' }]}>{t('menu_logout') || 'Logout'}</Text>
            </TouchableOpacity>
          </View>

          {/* Footer branding */}
          <View style={styles.drawerFooter}>
            <Text style={styles.brandingText}>RoadMitra Mechanic</Text>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  drawerPanel: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#1a1a2e',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 4, height: 0 },
    justifyContent: 'space-between',
  },
  drawerHeader: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#252542',
    paddingBottom: 15,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#252542',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#00BFA5',
  },
  mechanicName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  mechanicPhone: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  menuItemsContainer: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuItemText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#252542',
    marginVertical: 10,
  },
  drawerFooter: {
    alignItems: 'center',
  },
  brandingText: {
    color: '#00BFA5',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  versionText: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
  },
});
