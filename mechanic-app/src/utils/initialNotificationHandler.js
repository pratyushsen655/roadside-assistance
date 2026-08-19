import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

let pendingInitialTarget = null;
let pollingInterval = null;

/**
 * Checks all potential notification sources for cold-start incoming request payloads.
 */
export async function checkAndStoreInitialNotification() {
  try {
    // 1. Check Native RingingModule (Android cold start)
    const { RingingModule } = NativeModules;
    if (Platform.OS === 'android' && RingingModule && typeof RingingModule.getInitialRingingData === 'function') {
      try {
        const ringingData = await RingingModule.getInitialRingingData();
        if (ringingData && (ringingData.jobId || ringingData.requestId)) {
          const jobId = ringingData.jobId || ringingData.requestId;
          console.log('[InitialNotification] Found cold start data from RingingModule:', ringingData);
          pendingInitialTarget = {
            screen: 'IncomingRequest',
            params: { requestId: jobId, requestData: ringingData, notificationId: jobId }
          };
          return pendingInitialTarget;
        }
      } catch (rErr) {
        console.log('[InitialNotification] RingingModule check error:', rErr.message);
      }
    }

    // 2. Check Notifee initial notification
    try {
      const notifee = require('@notifee/react-native').default;
      if (notifee && typeof notifee.getInitialNotification === 'function') {
        const initialNotif = await notifee.getInitialNotification();
        if (initialNotif && initialNotif.notification) {
          console.log('[InitialNotification] Found cold start data from Notifee:', initialNotif);
          const data = initialNotif.notification.data || {};
          const jobId = data.jobId || data.requestId || initialNotif.notification.id;
          if (jobId || data.screen === 'IncomingRequest') {
            pendingInitialTarget = {
              screen: 'IncomingRequest',
              params: {
                requestId: jobId,
                requestData: data,
                notificationId: initialNotif.notification.id || jobId
              }
            };
            return pendingInitialTarget;
          }
        }
      }
    } catch (nErr) {
      console.log('[InitialNotification] Notifee check error:', nErr.message);
    }

    // 3. Check Firebase Messaging initial notification
    try {
      const messaging = require('@react-native-firebase/messaging').default;
      if (messaging && typeof messaging().getInitialNotification === 'function') {
        const fcmNotif = await messaging().getInitialNotification();
        if (fcmNotif && fcmNotif.data) {
          console.log('[InitialNotification] Found cold start data from FCM:', fcmNotif);
          const data = fcmNotif.data;
          const jobId = data.jobId || data.requestId;
          if (jobId || data.type === 'incoming_request' || data.screen === 'IncomingRequest') {
            pendingInitialTarget = {
              screen: 'IncomingRequest',
              params: {
                requestId: jobId,
                requestData: data,
                notificationId: jobId
              }
            };
            return pendingInitialTarget;
          }
        }
      }
    } catch (fErr) {
      console.log('[InitialNotification] FCM check error:', fErr.message);
    }

    // 4. Check expo-notifications if not in Expo Go
    if (!isExpoGo) {
      try {
        const Notifications = require('expo-notifications');
        if (Notifications && typeof Notifications.getLastNotificationResponseAsync === 'function') {
          const expoNotif = await Notifications.getLastNotificationResponseAsync();
          if (expoNotif && expoNotif.notification) {
            console.log('[InitialNotification] Found cold start data from Expo Notifications:', expoNotif);
            const data = expoNotif.notification.request.content.data || {};
            const jobId = data.jobId || data.requestId;
            if (jobId || data.screen === 'IncomingRequest') {
              pendingInitialTarget = {
                screen: 'IncomingRequest',
                params: {
                  requestId: jobId,
                  requestData: data,
                  notificationId: jobId
                }
              };
              return pendingInitialTarget;
            }
          }
        }
      } catch (eErr) {
        console.log('[InitialNotification] Expo Notifications check error:', eErr.message);
      }
    }
  } catch (err) {
    console.warn('[InitialNotification] Overall check error:', err.message);
  }

  return pendingInitialTarget;
}

/**
 * Navigates to the pending target if navigation is ready.
 */
export function navigatePendingInitialTarget(navigationRef) {
  if (!pendingInitialTarget) return false;

  const isReady = typeof navigationRef === 'function' ? navigationRef() : navigationRef?.isReady?.();

  if (isReady) {
    console.log('[InitialNotification] Navigation IS READY. Executing navigation to:', pendingInitialTarget);
    const target = { ...pendingInitialTarget };
    pendingInitialTarget = null; // Clear so it only executes once
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }

    try {
      if (typeof navigationRef.navigate === 'function') {
        navigationRef.navigate(target.screen, target.params);
      } else if (navigationRef.current && typeof navigationRef.current.navigate === 'function') {
        navigationRef.current.navigate(target.screen, target.params);
      }
      return true;
    } catch (err) {
      console.error('[InitialNotification] Navigation error:', err.message);
    }
  } else {
    console.log('[InitialNotification] Navigation NOT READY yet. Will retry when ready...');
  }
  return false;
}

/**
 * Starts a timer polling for navigation readiness for up to maxWaitMs.
 */
export function startPollingForReadyNavigation(navigationRef, maxWaitMs = 5000) {
  if (pollingInterval) clearInterval(pollingInterval);

  const startTime = Date.now();
  pollingInterval = setInterval(() => {
    const success = navigatePendingInitialTarget(navigationRef);
    if (success || (Date.now() - startTime > maxWaitMs)) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }, 150);
}
