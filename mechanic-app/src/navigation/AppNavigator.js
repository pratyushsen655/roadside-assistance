import React, { useContext, useEffect } from 'react';
import { Text, View, ActivityIndicator, Platform, NativeModules, NativeEventEmitter, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthContext } from '../context/AuthContext';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import JobsScreen from '../screens/JobsScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ActiveJobScreen from '../screens/ActiveJobScreen';
import ChatScreen from '../screens/ChatScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import SOSAlertsScreen from '../screens/SOSAlertsScreen';
import OnTheWayScreen from '../screens/OnTheWayScreen';
import PerformanceScreen from '../screens/PerformanceScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import IncomingRequestScreen from '../screens/IncomingRequestScreen';
import BankDetailsScreen from '../screens/BankDetailsScreen';
import NotificationHistoryScreen from '../screens/NotificationHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useLanguage } from '../context/LanguageContext';
import { getSocket, joinMechanicRoom } from '../config/socket';
import { checkAndStoreInitialNotification, navigatePendingInitialTarget } from '../utils/initialNotificationHandler';
import { playIncomingRequestSound, stopIncomingRequestSound } from '../services/soundService';

const { RingingModule } = NativeModules;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);


// TAB_BAR_CONTENT_HEIGHT is the fixed visual height of the tab bar content area
// (icons + labels). insets.bottom is added dynamically so the bar automatically
// clears the Android gesture strip / iOS home indicator on every device.
const TAB_BAR_CONTENT_HEIGHT = 60;

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 28) : Math.max(insets.bottom, 12);

  return (
    <Tab.Navigator
      safeAreaInsets={{ bottom: bottomInset }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#362A84',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={22} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  );
}

const AppNavigator = ({ navigationRef }) => {
  const { mechanicToken, mechanic, isLoading, addPendingRequest, removePendingRequest } = useContext(AuthContext);
  const { languageLoading, hasSavedLanguage } = useLanguage();

  useEffect(() => {
    if (!mechanicToken) return;

    // 1. Setup Socket.io Global Listener (App-Level Scope)
    let socket;
    let handleSocketIncomingRequest;
    let handleRequestCancelledOrTimeout;
    try {
      const mechId = mechanic?._id || mechanic?.id || mechanic?.mechanicId;
      console.log('[MECHANIC ID SOURCE]', mechId, typeof mechId, '| Full mechanic object:', JSON.stringify(mechanic));
      socket = getSocket(mechanicToken, mechId);
      if (mechId) {
        joinMechanicRoom(mechId);
      }
      if (socket) {
        console.log(`[TRACE App-Level Listener Registered] Socket event listeners attached in AppNavigator | mechanicId: "${mechId}" | Timestamp: ${new Date().toISOString()}`);

        handleSocketIncomingRequest = (data) => {
          console.log(`[TRACE App-Level Event Fired] Incoming request received! Storing in global state. Payload:`, JSON.stringify(data));
          
          try {
            // Trigger request alert sound playback (respecting sound toggle)
            playIncomingRequestSound();

            // 1. Push to global store so HomeScreen & all components update immediately
            addPendingRequest(data);

            // 2. Trigger visible UI auto-navigation
            const navReady = navigationRef.current?.isReady();
            console.log(`[TRACE Navigation State] Is Navigation Ready: ${navReady}`);
            if (navReady) {
              console.log(`[TRACE UI Trigger] Navigating to IncomingRequest screen...`);
              navigationRef.current?.navigate('IncomingRequest', { requestData: data });
            } else {
              console.error(`[TRACE UI Navigation Error] Navigation container is NOT ready yet!`);
              Alert.alert('NAV ERROR', 'Navigation container is NOT ready yet!');
            }
          } catch (navErr) {
            console.error('[CRITICAL NAVIGATION EXCEPTION] Failed in handleSocketIncomingRequest:', navErr);
            Alert.alert('NAV ERROR', navErr.message || String(navErr));
          }
        };

        handleRequestCancelledOrTimeout = (data) => {
          console.log(`[TRACE Request Cancelled/Timeout] Removing request from global state:`, data);
          stopIncomingRequestSound();
          const reqId = data?.requestId || data?._id;
          try {
            const notifee = require('@notifee/react-native').default;
            if (notifee) {
              if (reqId && typeof notifee.cancelNotification === 'function') {
                notifee.cancelNotification(reqId);
              }
              if (typeof notifee.cancelAllNotifications === 'function') {
                notifee.cancelAllNotifications();
              }
            }
          } catch (e) {}
          if (reqId) {
            removePendingRequest(reqId);
          }
        };

        socket.on('new_breakdown_request', handleSocketIncomingRequest);
        socket.on('incoming_request', handleSocketIncomingRequest);
        socket.on('incoming-request', handleSocketIncomingRequest);
        socket.on('new:job:request', handleSocketIncomingRequest);
        socket.on('new_request_available', handleSocketIncomingRequest);
        socket.on('incoming_request_timeout', handleRequestCancelledOrTimeout);
        socket.on('request_cancelled', handleRequestCancelledOrTimeout);
      }
    } catch (err) {
      console.log('[TRACE App-Level Listener ERROR] Failed to hook socket listener:', err.message);
    }

    // 2. Setup Native Module Event Listener (only if native module exposes full event emitter interface)
    let subscription;
    if (Platform.OS === 'android' && RingingModule && typeof RingingModule.addListener === 'function' && typeof RingingModule.removeListeners === 'function') {
      try {
        const eventEmitter = new NativeEventEmitter(RingingModule);
        subscription = eventEmitter.addListener('onIncomingRequest', (data) => {
          console.log('[TRACE Native Event Fired] Incoming request received:', data);
          playIncomingRequestSound();
          addPendingRequest(data);
          if (navigationRef.current?.isReady()) {
            navigationRef.current?.navigate('IncomingRequest', { requestData: data });
          }
        });
      } catch (err) {
        console.log('[TRACE Native Event ERROR] Failed to hook event emitter:', err.message);
      }
    }

    return () => {
      if (socket && handleSocketIncomingRequest) {
        console.log(`[TRACE Listener Cleanup] Cleaning up socket listeners in AppNavigator`);
        socket.off('new_breakdown_request', handleSocketIncomingRequest);
        socket.off('incoming_request', handleSocketIncomingRequest);
        socket.off('incoming-request', handleSocketIncomingRequest);
        socket.off('new:job:request', handleSocketIncomingRequest);
        socket.off('new_request_available', handleSocketIncomingRequest);
        socket.off('incoming_request_timeout', handleRequestCancelledOrTimeout);
        socket.off('request_cancelled', handleRequestCancelledOrTimeout);
      }
      if (subscription) {
        subscription.remove();
      }
    };
  }, [mechanicToken, mechanic, navigationRef, addPendingRequest, removePendingRequest]);

  if (isLoading || languageLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00BFA5" />
      </View>
    );
  }

  // Force language selection if not saved yet
  if (!hasSavedLanguage) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} initialParams={{ isOnboarding: true }} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={async () => {
        console.log('[NavigationContainer] Navigation is ready');

        // 1. Process any pending target captured during app initialization
        const handled = navigatePendingInitialTarget(navigationRef);
        if (handled) return;

        // 2. Double check multi-source initial notification if not yet captured
        const initialTarget = await checkAndStoreInitialNotification();
        if (initialTarget) {
          console.log('[NavigationContainer onReady] Captured initial target:', initialTarget);
          navigatePendingInitialTarget(navigationRef);
          return;
        }

        // 3. Fallback check for RingingModule
        if (Platform.OS === 'android' && RingingModule && typeof RingingModule.getInitialRingingData === 'function' && mechanicToken) {
          RingingModule.getInitialRingingData().then((data) => {
            if (data) {
              console.log('[NavigationContainer] Cold start ringing data detected:', data);
              navigationRef.current?.navigate('IncomingRequest', { requestData: data });
            }
          }).catch(err => {
            console.log('[NavigationContainer] Error fetching initial ringing data:', err.message);
          });
        }
      }}
    >
      {mechanicToken ? (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          <MainStack.Screen name="Tabs" component={MainTabs} />
          <MainStack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
          <MainStack.Screen name="ActiveJob" component={ActiveJobScreen} />
          <MainStack.Screen name="OnTheWay" component={OnTheWayScreen} />
          <MainStack.Screen name="Chat" component={ChatScreen} />
          <MainStack.Screen name="Reviews" component={ReviewsScreen} />
          <MainStack.Screen name="Performance" component={PerformanceScreen} />
          <MainStack.Screen name="IncomingRequest" component={IncomingRequestScreen} />
          <MainStack.Screen name="BankDetails" component={BankDetailsScreen} />
          <MainStack.Screen name="NotificationHistory" component={NotificationHistoryScreen} />
          <MainStack.Screen name="Settings" component={SettingsScreen} />
        </MainStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;