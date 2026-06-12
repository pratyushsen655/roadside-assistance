// App.js - Root component for the Customer Expo app
import React, { useEffect, useRef } from 'react';
import { LogBox, InteractionManager } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import Constants from 'expo-constants';

const navigationRef = createNavigationContainerRef();

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

// Polyfill InteractionManager using requestIdleCallback to support third-party libraries
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
    return originalRunAfterInteractions ? originalRunAfterInteractions(task) : {
      cancel: () => clearTimeout(handle)
    };
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
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        try {
          const data = response.notification.request.content.data;
          if (data && data.screen) {
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
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
          <OfflineBanner />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
