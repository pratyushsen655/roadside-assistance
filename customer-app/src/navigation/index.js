import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import CompleteProfileScreen from '../screens/CompleteProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import RequestScreen from '../screens/RequestScreen';
import ChatScreen from '../screens/ChatScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AddressBookScreen from '../screens/AddressBookScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReferralScreen from '../screens/ReferralScreen';
import SOSScreen from '../screens/SOSScreen';
import SOSConfirmationScreen from '../screens/SOSConfirmationScreen';
import TrackingScreen from '../screens/TrackingScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import RateJobScreen from '../screens/RateJobScreen';
import MechanicProfileScreen from '../screens/MechanicProfileScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}
    >
      {/* Auth flow */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* New: profile setup for first-time OTP users */}
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />

      {/* Main app */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Request" component={RequestScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />

      {/* Profile & settings */}
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddressBook" component={AddressBookScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SOS" component={SOSScreen} />
      <Stack.Screen name="SOSConfirmation" component={SOSConfirmationScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ServiceHistory" component={ServiceHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RateJob" component={RateJobScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MechanicProfile" component={MechanicProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}