// App.js - Root component for the Mechanic Expo app
import React, { useEffect, useRef } from 'react';
import { LogBox, InteractionManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator.js';
import { createNavigationContainerRef } from '@react-navigation/native';
import Constants from 'expo-constants';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';

export const navigationRef = createNavigationContainerRef();

// Detect if running inside Expo Go (SDK 53+ removed push notification support from Expo Go)
const isExpoGo = Constants.appOwnership === 'expo';

// Only import and configure Notifications when NOT in Expo Go to avoid the SDK 53 crash
let Notifications = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('[App] expo-notifications not available:', e.message);
  }
}

// Polyfill InteractionManager using requestIdleCallback to support third‑party libraries
if (InteractionManager) {
  const originalRunAfterInteractions = InteractionManager.runAfterInteractions;
  InteractionManager.runAfterInteractions = (task) => {
    let handle;
    if (typeof requestIdleCallback !== 'undefined') {
      handle = requestIdleCallback(() => {
        if (task) task();
      });
      return { cancel: () => cancelIdleCallback(handle) };
    }
    return originalRunAfterInteractions ? originalRunAfterInteractions(task) : { cancel: () => clearTimeout(handle) };
  };
}

LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
  'expo-notifications: Android Push notifications',
  'warnOfExpoGoPushUsage',
]);

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!Notifications) {
      console.log('[App] Running in Expo Go — push notifications disabled. Use a dev build for full support.');
      return;
    }
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received in foreground:', notification);
        const data = notification.request.content.data;
        if (data && data.requestId) {
          console.log('[App] Ringing notification received in foreground. Navigating...');
          if (navigationRef.isReady()) {
            navigationRef.navigate('IncomingRequest', { requestData: data });
          }
        }
      });
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        try {
          const data = response.notification.request.content.data;
          if (data && data.requestId) {
            console.log('[App] Ringing notification tapped. Navigating...');
            if (navigationRef.isReady()) {
              navigationRef.navigate('IncomingRequest', { requestData: data });
            }
          } else if (data && data.screen) {
            let params = data.params;
            if (typeof params === 'string') {
              try { params = JSON.parse(params); } catch (e) {}
            }
            if (navigationRef.isReady()) {
              navigationRef.navigate(data.screen, params);
            }
          }
        } catch (err) {
          console.log('[Notification Tap Error]', err.message);
        }
      });
    } catch (err) {
      console.log('[App] Notification listener setup failed:', err.message);
    }
    return () => {
      try {
        if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
        if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
      } catch (e) {}
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <AppNavigator navigationRef={navigationRef} />
            <OfflineBanner />
          </AuthProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
