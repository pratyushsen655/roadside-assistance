import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

// Configure FCM & Notifee background handlers safely (only active in native dev builds)
try {
  const messaging = require('@react-native-firebase/messaging').default;
  const notifee = require('@notifee/react-native').default;
  const { AndroidImportance, AndroidCategory, AndroidVisibility } = require('@notifee/react-native');

  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCM Background Message Received]', remoteMessage);
    const data = remoteMessage?.data || {};

    if (data.type === 'incoming_request' || data.isRingingAction === 'true') {
      const jobId = data.jobId || data.requestId;
      const customerName = data.customerName || 'Customer';
      const price = data.price ? `₹${data.price}` : '';
      const vehicleType = data.vehicleType || 'Breakdown';

      // Create high-importance CALL notification channel with custom raw alert sound
      let channelId = 'incoming_job_channel_v2';
      try {
        channelId = await notifee.createChannel({
          id: 'incoming_job_channel_v2',
          name: 'Incoming Job Requests',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          sound: 'incoming_request_alert',
          vibration: true,
        });
        console.log('[Notifee Background] Channel created/verified:', channelId);
      } catch (channelErr) {
        console.error('[Notifee Background Error] Failed to create channel:', channelErr);
      }

      const notificationPayload = {
        title: '🚨 Emergency Assistance Request',
        body: `${customerName} needs ${vehicleType} assistance ${price ? `(${price})` : ''}`,
        data: {
          ...data,
          jobId,
          requestId: jobId,
          notificationId: jobId,
          requestData: data,
          screen: 'IncomingRequest',
        },
      };

      // Attempt 1: Full-Screen Action Notification (Lock-screen / auto-launch)
      try {
        console.log('[Notifee Background] Attempting displayNotification with fullScreenAction...');
        const notifId = await notifee.displayNotification({
          id: jobId,
          ...notificationPayload,
          android: {
            channelId,
            importance: AndroidImportance.HIGH,
            category: AndroidCategory.CALL,
            fullScreenAction: {
              id: 'default',
              launchActivity: 'default',
            },
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            ongoing: true,
            autoCancel: false,
            loopSound: true,
            sound: 'incoming_request_alert',
            timeoutAfter: 35000, // 35 seconds auto-timeout
          },
        });
        console.log('[Notifee Background SUCCESS] Notification with fullScreenAction displayed, ID:', notifId);
      } catch (primaryErr) {
        console.error('[Notifee Background ERROR] Primary displayNotification with fullScreenAction failed:', primaryErr?.message || primaryErr, primaryErr);
        
        // Attempt 2: Fallback Heads-Up Banner Notification without fullScreenAction
        try {
          console.log('[Notifee Background] Attempting FALLBACK displayNotification without fullScreenAction...');
          const fallbackId = await notifee.displayNotification({
            id: jobId,
            ...notificationPayload,
            android: {
              channelId,
              importance: AndroidImportance.HIGH,
              category: AndroidCategory.CALL,
              pressAction: {
                id: 'default',
                launchActivity: 'default',
              },
              ongoing: true,
              autoCancel: false,
              loopSound: true,
              sound: 'incoming_request_alert',
              timeoutAfter: 35000,
            },
          });
          console.log('[Notifee Background FALLBACK SUCCESS] Fallback heads-up notification displayed, ID:', fallbackId);
        } catch (fallbackErr) {
          console.error('[Notifee Background CRITICAL ERROR] Fallback notification display also failed:', fallbackErr?.message || fallbackErr, fallbackErr);
        }
      }
    }
  });

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { EventType } = require('@notifee/react-native');
    console.log('[Notifee Background Event]', type, detail);
    if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
      if (detail.notification?.id) {
        await notifee.cancelNotification(detail.notification.id);
      }
    }
  });
} catch (e) {
  console.log('[index.js] Firebase/Notifee background listener skipped in dev mode:', e.message);
}

import App from './App';

registerRootComponent(App);
