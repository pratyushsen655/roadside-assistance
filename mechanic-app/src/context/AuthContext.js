import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications, savePushToken } from '../services/notificationService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [mechanicToken, setMechanicToken] = useState(null);
  const [mechanic, setMechanic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mechanicLocation, setMechanicLocation] = useState(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('mechanicToken');
        if (token) {
          setMechanicToken(token);
          // Normally we'd also fetch the mechanic data here, but for now just mock it
          setMechanic({ name: 'Mechanic User', phone: '+919999999999' });

          // Sync push/FCM token on startup
          setTimeout(async () => {
            try {
              const pushToken = await registerForPushNotifications();
              if (pushToken) {
                await savePushToken(pushToken);
                console.log('[AuthContext] Push token registered and saved on startup:', pushToken);
              }
            } catch (err) {
              console.log('[AuthContext] Push token registration error on startup:', err.message);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error loading token', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (token, data) => {
    try {
      await AsyncStorage.setItem('mechanicToken', token);
      setMechanicToken(token);
      setMechanic(data);
      const pushToken = await registerForPushNotifications();
      if (pushToken) await savePushToken(pushToken);
    } catch (error) {
      console.error('Error saving token or push notification:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('mechanicToken');
      setMechanicToken(null);
      setMechanic(null);
    } catch (error) {
      console.error('Error removing token', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      mechanicToken, mechanic, login, logout, isLoading, setMechanicToken,
      mechanicLocation, setMechanicLocation, locationPermissionGranted, setLocationPermissionGranted
    }}>
      {children}
    </AuthContext.Provider>
  );
};
