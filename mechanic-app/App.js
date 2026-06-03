import React, { useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import LoginScreen from './src/screens/LoginScreen';
import KYCScreen from './src/screens/KYCScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

function NavigationWrapper() {
  const { token, mechanic, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffcc00" />
      </View>
    );
  }

  // Redirect logic: If logged in but KYC not approved, default to KYC portal. Otherwise, dashboard.
  const isKycApproved = mechanic?.kycStatus === 'approved';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          // Authenticated Stack
          <>
            {!isKycApproved ? (
              <>
                <Stack.Screen name="KYC" component={KYCScreen} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="KYC" component={KYCScreen} />
              </>
            )}
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        ) : (
          // Auth flow Stack
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <View style={styles.container}>
          <NavigationWrapper />
          <StatusBar style="light" />
        </View>
      </SocketProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
