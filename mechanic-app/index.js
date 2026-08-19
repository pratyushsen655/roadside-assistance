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

      // Trigger audio playback for incoming call alert in background
      try {
        const { playIncomingRequestSound } = require('./src/services/soundService');
        await playIncomingRequestSound();
      } catch (soundErr) {
        console.log('[FCM Background] soundService play error:', soundErr?.message);
      }

      // Create high-importance CALL notification channel with custom raw alert sound
      let channelId = 'incoming_job_channel_v3';
      try {
        channelId = await notifee.createChannel({
          id: 'incoming_job_channel_v3',
          name: 'Incoming Job Requests',
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          sound: 'incoming_request_alert',
          vibration: true,
          vibrationPattern: [300, 500, 300, 500],
          lights: true,
          lightColor: '#FF6B00',
          bypassDnd: true,
        });
        console.log('[Notifee Background] Channel created/verified:', channelId);
      } catch (channelErr) {
        console.error('[Notifee Background Error] Failed to create channel:', channelErr);
        channelId = 'incoming_job_channel_v2';
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

      // Attempt 1: Full-Screen Action Notification with Screen Wake (Lock-screen / call launch)
      try {
        console.log('[NOTIFEE_TRACE] [Attempt 1] About to call displayNotification with fullScreenAction & wakeScreen...');
        console.log('[NOTIFEE_TRACE] [Attempt 1] Payload:', JSON.stringify(notificationPayload));
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
            wakeScreen: true, // Wakes up locked / dark screen
            ongoing: true,
            autoCancel: false,
            loopSound: true,
            sound: 'incoming_request_alert',
            vibrationPattern: [300, 500, 300, 500],
            timeoutAfter: 35000, // 35 seconds auto-timeout
          },
        });
        console.log('[NOTIFEE_TRACE] [Attempt 1 SUCCESS] displayNotification resolved, ID:', notifId);
      } catch (primaryErr) {
        console.error('[NOTIFEE_TRACE] [Attempt 1 FAILED] Message:', primaryErr?.message || String(primaryErr));
        console.error('[NOTIFEE_TRACE] [Attempt 1 FAILED] Stack:', primaryErr?.stack);
        
        // Attempt 2: Fallback Heads-Up Banner Notification with wakeScreen
        try {
          console.log('[NOTIFEE_TRACE] [Attempt 2] About to call FALLBACK displayNotification...');
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
              wakeScreen: true, // Wakes up locked / dark screen
              ongoing: true,
              autoCancel: false,
              loopSound: true,
              sound: 'incoming_request_alert',
              vibrationPattern: [300, 500, 300, 500],
              timeoutAfter: 35000,
            },
          });
          console.log('[NOTIFEE_TRACE] [Attempt 2 SUCCESS] Fallback displayNotification resolved, ID:', fallbackId);
        } catch (fallbackErr) {
          console.error('[NOTIFEE_TRACE] [Attempt 2 FAILED] Message:', fallbackErr?.message || String(fallbackErr));
          console.error('[NOTIFEE_TRACE] [Attempt 2 FAILED] Stack:', fallbackErr?.stack);
        }
      }
    }
  });

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { EventType } = require('@notifee/react-native');
    console.log('[Notifee Background Event]', type, detail);
    if (type === EventType.PRESS || type === EventType.ACTION_PRESS || type === EventType.DISMISSED) {
      try {
        const { stopIncomingRequestSound } = require('./src/services/soundService');
        await stopIncomingRequestSound();
      } catch (e) {}
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
