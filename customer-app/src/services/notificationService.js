import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import API_URL from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Detect if running inside Expo Go (SDK 53+ removed push notification support from Expo Go)
const isExpoGo = Constants.appOwnership === 'expo';

// Conditionally set up notification handler (safe for Expo Go)
if (!isExpoGo) {
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('[NotificationService] setNotificationHandler failed:', e.message);
  }
}

export const registerForPushNotifications = async () => {
  // Skip if in Expo Go or not a physical device
  if (isExpoGo) {
    console.log('[NotificationService] Skipping push registration in Expo Go (SDK 53+ restriction).');
    return null;
  }
  if (!Device.isDevice) {
    console.log('[NotificationService] Not a physical device, skipping push registration.');
    return null;
  }

  try {
    const Notifications = require('expo-notifications');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    let projectId = undefined;
    try {
      projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    } catch (e) {
      console.log('[NotificationService] Error getting projectId:', e);
    }

    const token = (await Notifications.getExpoPushTokenAsync({
      ...(projectId ? { projectId } : {})
    })).data;

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#B34700',
      });
    }

    return token;
  } catch (err) {
    console.log('[NotificationService] Push registration error:', err.message);
    return null;
  }
};

export const savePushToken = async (token) => {
  try {
    const authToken = await AsyncStorage.getItem('token');
    if (!authToken || !token) return;
    await fetch(`${API_URL}/api/auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ pushToken: token })
    });
  } catch (err) {
    console.error('[NotificationService] Error saving push token:', err);
  }
};
