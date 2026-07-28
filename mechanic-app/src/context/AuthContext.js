import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications, savePushToken } from '../services/notificationService';

import API_URL from '../config/api';

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

          // Fetch real mechanic profile to populate mechanic._id
          try {
            const res = await fetch(`${API_URL}/api/mechanic/profile`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.mechanic) {
              console.log('[AuthContext] Mechanic profile loaded from API:', data.mechanic._id);
              setMechanic(data.mechanic);
            } else {
              throw new Error('Profile response invalid');
            }
          } catch (profileErr) {
            console.log('[AuthContext] Profile fetch error, attempting JWT decode fallback:', profileErr.message);
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
              const decoded = JSON.parse(jsonPayload);
              if (decoded && decoded.id) {
                setMechanic({ _id: decoded.id, id: decoded.id, name: 'Mechanic User', phone: decoded.phone || '+919999999999' });
              } else {
                setMechanic({ name: 'Mechanic User', phone: '+919999999999' });
              }
            } catch (_) {
              setMechanic({ name: 'Mechanic User', phone: '+919999999999' });
            }
          }

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

  const [pendingRequests, setPendingRequests] = useState([]);

  const addPendingRequest = (newReq) => {
    if (!newReq) return;
    const reqId = (newReq.requestId || newReq._id || newReq.id)?.toString();
    setPendingRequests((prev) => {
      const exists = prev.some((r) => (r.requestId || r._id || r.id)?.toString() === reqId);
      if (exists) return prev;
      return [newReq, ...prev];
    });
  };

  const removePendingRequest = (reqId) => {
    if (!reqId) return;
    const targetId = reqId.toString();
    setPendingRequests((prev) => prev.filter((r) => (r.requestId || r._id || r.id)?.toString() !== targetId));
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('mechanicToken');
      setMechanicToken(null);
      setMechanic(null);
      setPendingRequests([]);
    } catch (error) {
      console.error('Error removing token', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      mechanicToken, mechanic, login, logout, isLoading, setMechanicToken,
      mechanicLocation, setMechanicLocation, locationPermissionGranted, setLocationPermissionGranted,
      pendingRequests, setPendingRequests, addPendingRequest, removePendingRequest
    }}>
      {children}
    </AuthContext.Provider>
  );
};
