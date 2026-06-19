import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';

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
import AccountScreen from '../screens/AccountScreen';
import HelpScreen from '../screens/HelpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useContext(AuthContext);
  const { languageLoading } = useContext(LanguageContext);

  if (loading || languageLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#B34700', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          <Stack.Screen name="Request" component={RequestScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddressBook" component={AddressBookScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Referral" component={ReferralScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Help" component={HelpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SOS" component={SOSScreen} />
          <Stack.Screen name="SOSConfirmation" component={SOSConfirmationScreen} />
          <Stack.Screen name="Tracking" component={TrackingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ServiceHistory" component={ServiceHistoryScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RateJob" component={RateJobScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MechanicProfile" component={MechanicProfileScreen} options={{ headerShown: false }} />
          {/* Language selection accessible from settings */}
          <Stack.Screen
            name="LanguageSelection"
            component={LanguageSelectionScreen}
            options={{ headerShown: false, animation: 'slide_from_bottom' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen
            name="LanguageSelection"
            component={LanguageSelectionScreen}
            options={{ headerShown: false, animation: 'fade' }}
          />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}