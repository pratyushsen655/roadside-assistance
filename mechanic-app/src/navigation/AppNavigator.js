import React, { useContext } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#1a1a2e',
        borderTopColor: '#252542',
        paddingBottom: 5,
        height: 60,
      },
      tabBarActiveTintColor: '#00BFA5',
      tabBarInactiveTintColor: '#aaaaaa',
    }}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen} 
      options={{ 
        tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>🏠</Text> 
      }} 
    />
    <Tab.Screen 
      name="Jobs" 
      component={JobsScreen} 
      options={{ 
        tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>🔧</Text> 
      }} 
    />
    <Tab.Screen 
      name="Earnings" 
      component={EarningsScreen} 
      options={{ 
        tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>💰</Text> 
      }} 
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{ 
        tabBarIcon: ({color}) => <Text style={{color, fontSize: 20}}>👤</Text> 
      }} 
    />
  </Tab.Navigator>
);

const AppNavigator = ({ navigationRef }) => {
  const { mechanicToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00BFA5" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {mechanicToken ? (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          <MainStack.Screen name="Tabs" component={MainTabs} />
          <MainStack.Screen name="ActiveJob" component={ActiveJobScreen} />
          <MainStack.Screen name="Chat" component={ChatScreen} />
          <MainStack.Screen name="Reviews" component={ReviewsScreen} />
        </MainStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
