import 'react-native-gesture-handler';
import './src/utils/network'; // Global fetch network override
import './src/i18n'; // Initialize i18next before any component renders
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

console.log(`[Mechanic App Bundle Verification] Bundle build timestamp: 2026-07-28T13:20:00.000Z | Expo SDK: ${require('expo/package.json').version}`);
import { LogBox, InteractionManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
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
  'SafeAreaView has been deprecated',
  '`new NativeEventEmitter()` was called with a non-null argument',
  'expo-notifications: Android Push notifications',
  'warnOfExpoGoPushUsage',
  'No task registered for key',
  'This method is deprecated',
]);

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Notifee initial notification & press handlers for dev build / standalone
    try {
      const notifee = require('@notifee/react-native').default;
      const { EventType, AndroidImportance, AndroidVisibility } = require('@notifee/react-native');

      // Explicitly request notification permissions (required for Android 13+ / API 33+)
      notifee.requestPermission()
        .then(settings => {
          console.log('[Notifee Startup] Authorization status:', settings.authorizationStatus);
        })
        .catch(err => {
          console.log('[Notifee Startup Error] Request permission failed:', err?.message);
        });

      // Check battery optimization status
      notifee.isBatteryOptimizationEnabled()
        .then(batteryOptimizationEnabled => {
          console.log('[Notifee Startup] Is Battery Optimization Enabled:', batteryOptimizationEnabled);
          if (batteryOptimizationEnabled) {
            console.log('[Notifee Startup Warning] Battery optimization is ENABLED. Incoming call notifications when app is closed may be delayed or restricted by OS.');
          }
        })
        .catch(err => {
          console.log('[Notifee Startup Error] Check battery optimization failed:', err?.message);
        });

      // Query detailed settings
      notifee.getNotificationSettings()
        .then(settings => {
          console.log('[Notifee Startup] Current Notification Settings:', JSON.stringify(settings));
        })
        .catch(err => {
          console.log('[Notifee Startup Error] Get notification settings failed:', err?.message);
        });

      // Create notification channel once on startup
      notifee.createChannel({
        id: 'incoming_job_channel_v2',
        name: 'Incoming Job Requests',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'incoming_request_alert',
        vibration: true,
      });

      notifee.getInitialNotification().then(initialNotification => {
        if (initialNotification) {
          console.log('[Notifee Launch App]', initialNotification);
          const data = initialNotification.notification.data;
          const jobId = data?.jobId || data?.requestId;
          if (jobId) {
            setTimeout(() => {
              if (navigationRef.isReady()) {
                navigationRef.navigate('IncomingRequest', { requestId: jobId, requestData: data });
              }
            }, 500);
          }
        }
      });

      const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
          console.log('[Notifee Event Press]', detail);
          const data = detail.notification?.data;
          const jobId = data?.jobId || data?.requestId;
          if (jobId && navigationRef.isReady()) {
            navigationRef.navigate('IncomingRequest', { requestId: jobId, requestData: data });
          }
          if (detail.notification?.id) {
            notifee.cancelNotification(detail.notification.id);
          }
        }
      });

      // Cleanup
      var notifeeCleanup = unsubscribeNotifee;
    } catch (e) {
      console.log('[App] Notifee setup notice:', e.message);
    }

    if (!Notifications) {
      console.log('[App] Running in Expo Go — push notifications disabled. Use a dev build for full support.');
      return () => {
        if (notifeeCleanup) notifeeCleanup();
      };
    }
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received in foreground:', notification);
        const data = notification.request.content.data;
        if (data && (data.requestId || data.jobId)) {
          console.log('[App] Ringing notification received in foreground. Navigating...');
          if (navigationRef.isReady()) {
            navigationRef.navigate('IncomingRequest', { requestId: data.jobId || data.requestId, requestData: data });
          }
        }
      });
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        try {
          const data = response.notification.request.content.data;
          if (data && (data.requestId || data.jobId)) {
            console.log('[App] Ringing notification tapped. Navigating...');
            if (navigationRef.isReady()) {
              navigationRef.navigate('IncomingRequest', { requestId: data.jobId || data.requestId, requestData: data });
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
      if (notifeeCleanup) notifeeCleanup();
      try {
        if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
        if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
      } catch (e) {}
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <StatusBar style="auto" />
                <AppNavigator navigationRef={navigationRef} />
                <OfflineBanner />
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
