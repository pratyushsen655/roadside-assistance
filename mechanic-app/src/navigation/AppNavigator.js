import React, { useContext, useEffect } from 'react';
import { Text, View, ActivityIndicator, Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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
import { useLanguage } from '../context/LanguageContext';
import { getSocket } from '../config/socket';

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

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#1a1a2e',
        borderTopColor: '#252542',
        borderTopWidth: 1,
        paddingBottom: 5,
        height: 70,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 100,
      },
      tabBarActiveTintColor: '#00BFA5',
      tabBarInactiveTintColor: '#aaaaaa',
    }}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen} 
      options={{ 
        tabBarIcon: ({color, size}) => <Ionicons name="home" size={size} color={color} /> 
      }} 
    />
    <Tab.Screen 
      name="Jobs" 
      component={JobsScreen} 
      options={{ 
        tabBarIcon: ({color, size}) => <Ionicons name="clipboard-outline" size={size} color={color} /> 
      }} 
    />
    <Tab.Screen 
      name="SOSAlerts" 
      component={SOSAlertsScreen} 
      options={{ 
        title: "New Job",
        tabBarButton: (props) => (
          <TouchableOpacity 
            {...props} 
            style={navStyles.floatingTabButton} 
            activeOpacity={0.85}
          >
            <View style={navStyles.floatingTabButtonInner}>
              <Ionicons name="add" size={32} color="#fff" />
            </View>
          </TouchableOpacity>
        )
      }} 
    />
    <Tab.Screen 
      name="Earnings" 
      component={EarningsScreen} 
      options={{ 
        tabBarIcon: ({color, size}) => <Ionicons name="wallet-outline" size={size} color={color} /> 
      }} 
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ 
        tabBarIcon: ({color, size}) => <Ionicons name="person-outline" size={size} color={color} /> 
      }} 
    />
  </Tab.Navigator>
);

const navStyles = StyleSheet.create({
  floatingTabButton: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00BFA5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingTabButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00BFA5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const AppNavigator = ({ navigationRef }) => {
  const { mechanicToken, isLoading } = useContext(AuthContext);
  const { languageLoading, hasSavedLanguage } = useLanguage();

  useEffect(() => {
    if (!mechanicToken) return;

    // 1. Setup Socket.io Global Listener (Layer 6 Foreground Case)
    let socket;
    try {
      socket = getSocket(mechanicToken);
      if (socket) {
        const handleSocketIncomingRequest = (data) => {
          console.log('[Socket Global Listener] Incoming request received:', data);
          if (navigationRef.current?.isReady()) {
            navigationRef.current?.navigate('IncomingRequest', { requestData: data });
          }
        };

        socket.on('incoming_request', handleSocketIncomingRequest);

        // Cleanup socket listener
        return () => {
          if (socket) {
            socket.off('incoming_request', handleSocketIncomingRequest);
          }
        };
      }
    } catch (err) {
      console.log('[Socket Global Listener] Failed to hook socket listener:', err.message);
    }

    // 2. Setup Native Module Event Listener (Android Layer 4 & 6 Foreground Case)
    let subscription;
    if (Platform.OS === 'android' && RingingModule) {
      try {
        const eventEmitter = new NativeEventEmitter(RingingModule);
        subscription = eventEmitter.addListener('onIncomingRequest', (data) => {
          console.log('[Native Global Listener] Incoming request received:', data);
          if (navigationRef.current?.isReady()) {
            navigationRef.current?.navigate('IncomingRequest', { requestData: data });
          }
        });
      } catch (err) {
        console.log('[Native Global Listener] Failed to hook event emitter:', err.message);
      }
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [mechanicToken, navigationRef]);

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
      onReady={() => {
        console.log('[NavigationContainer] Navigation is ready');
        if (Platform.OS === 'android' && RingingModule && mechanicToken) {
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
        </MainStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
