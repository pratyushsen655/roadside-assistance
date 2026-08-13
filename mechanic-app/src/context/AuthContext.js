import React, { createContext, useState, useEffect } from 'react';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications, savePushToken } from '../services/notificationService';

import API_URL from '../config/api';

// Helper to decode JWT token payload in pure JS (Hermes safe without atob)
const decodeJwtId = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = '';
    for (let i = 0; i < base64.length;) {
      const enc1 = chars.indexOf(base64.charAt(i++));
      const enc2 = chars.indexOf(base64.charAt(i++));
      const enc3 = chars.indexOf(base64.charAt(i++));
      const enc4 = chars.indexOf(base64.charAt(i++));
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      str += String.fromCharCode(chr1);
      if (enc3 !== 64 && chr2 !== 0) str += String.fromCharCode(chr2);
      if (enc4 !== 64 && chr3 !== 0) str += String.fromCharCode(chr3);
    }
    const parsed = JSON.parse(str);
    return parsed?.id || parsed?._id || parsed?.mechanicId || null;
  } catch (e) {
    console.log('[AuthContext JWT Decode Error]', e.message);
    return null;
  }
};

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

          // 1. Immediately decode JWT token to extract mechanicId so mechanic._id is NEVER undefined at startup
          const jwtMechanicId = decodeJwtId(token);
          console.log('[AuthContext] Token loaded from storage. JWT Decoded Mechanic ID:', jwtMechanicId, typeof jwtMechanicId);

          if (jwtMechanicId) {
            setMechanic({ _id: jwtMechanicId, id: jwtMechanicId, mechanicId: jwtMechanicId });
          }

          // 2. Fetch full mechanic profile from /api/mechanic/profile to enrich profile
          try {
            console.log('[AuthContext] Fetching profile from:', `${API_URL}/api/mechanic/profile`);
            const res = await fetch(`${API_URL}/api/mechanic/profile`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            console.log('[AuthContext Profile API Response Body]', JSON.stringify(data));

            if (data.success && data.mechanic) {
              const m = data.mechanic;
              const realId = m._id || m.id || m.mechanicId || jwtMechanicId;
              console.log('[AuthContext] Profile loaded successfully | mechanic._id:', realId, '| Keys in profile:', Object.keys(m));
              setMechanic({ ...m, _id: realId, id: realId, mechanicId: realId });
            } else {
              console.warn('[AuthContext] Profile API returned unsuccessful response:', data);
              if (res.status === 401 || data.message?.toLowerCase().includes('token expired') || data.message?.toLowerCase().includes('jwt expired') || data.message?.toLowerCase().includes('invalid token')) {
                console.log('[AuthContext] Expired or invalid token detected. Auto-logging out...');
                await AsyncStorage.removeItem('mechanicToken');
                setMechanicToken(null);
                setMechanic(null);
              }
            }
          } catch (profileErr) {
            console.log('[AuthContext] Profile API fetch error:', profileErr.message);
          }

          // Save auth token to native SharedPreferences for background notification actions
          if (Platform.OS === 'android' && NativeModules.RingingModule && typeof NativeModules.RingingModule.saveAuthToken === 'function') {
            NativeModules.RingingModule.saveAuthToken(token, API_URL);
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
      if (Platform.OS === 'android' && NativeModules.RingingModule && typeof NativeModules.RingingModule.saveAuthToken === 'function') {
        NativeModules.RingingModule.saveAuthToken(token, API_URL);
      }
      const jwtMechanicId = decodeJwtId(token);
      const mId = data?._id || data?.id || data?.mechanicId || jwtMechanicId;
      const fullMechanic = data ? { ...data, _id: mId, id: mId, mechanicId: mId } : { _id: mId, id: mId, mechanicId: mId };
      console.log('[AuthContext login] Logged in successfully | mechanicId:', mId, '| mechanic obj:', JSON.stringify(fullMechanic));
      setMechanic(fullMechanic);
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
