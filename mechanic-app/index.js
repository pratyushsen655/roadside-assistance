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
      const channelId = await notifee.createChannel({
        id: 'incoming_job_channel_v2',
        name: 'Incoming Job Requests',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'incoming_request_alert',
        vibration: true,
      });

      // Display full screen notification even when app is closed / phone locked
      await notifee.displayNotification({
        title: '🚨 Emergency Assistance Request',
        body: `${customerName} needs ${vehicleType} assistance ${price ? `(${price})` : ''}`,
        data: {
          ...data,
          jobId,
          requestId: jobId,
          requestData: data,
          screen: 'IncomingRequest',
        },
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
