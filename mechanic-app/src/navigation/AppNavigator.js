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
import SOSAlertsScreen from '../screens/SOSAlertsScreen';
import OnTheWayScreen from '../screens/OnTheWayScreen';
import PerformanceScreen from '../screens/PerformanceScreen';

const Stack = createStackNavigator();

const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();


const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
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
        paddingBottom: 5,
        height: 65,
        position: 'relative',
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
          <MainStack.Screen name="OnTheWay" component={OnTheWayScreen} />
          <MainStack.Screen name="Chat" component={ChatScreen} />
          <MainStack.Screen name="Reviews" component={ReviewsScreen} />
          <MainStack.Screen name="Performance" component={PerformanceScreen} />
        </MainStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
