/* eslint-disable no-console */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getItem, setItem, removeItem } from '../utils/storage';
import { registerForPushNotifications, savePushToken } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Alert } from 'react-native';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';

export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        setLoading(true);
        const storedToken = await getItem('userToken');
        const storedUser = await getItem('userData');
        
        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          // Silently validate token in background - don't logout on network error
          validateTokenSilently(storedToken);
        }
      } catch (error) {
        console.log('Auth load error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const validateTokenSilently = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) {
        // Only logout if explicitly unauthorized, not on network error
        const data = await res.json();
        if (data.message?.includes('expired')) {
          // Token genuinely expired - logout silently
          await clearAuth();
        }
      }
    } catch (error) {
      // Network error - keep user logged in, don't logout
      console.log('Token validation network error - keeping session:', error);
    }
  };

  const clearAuth = async () => {
    await removeItem('userToken');
    await removeItem('userData');
    setToken(null);
    setUser(null);
  };

  const login = async (userData, authToken) => {
    try {
      await setItem('userToken', authToken);
      await setItem('userData', JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);
      try {
        const pushToken = await registerForPushNotifications();
        if (pushToken) await savePushToken(pushToken);
      } catch (err) {
        console.log('[AuthContext] Error registering push notification on login:', err.message);
      }
    } catch (error) {
      console.log('Login storage error:', error);
    }
  };

  const updateUser = async (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    await setItem('userData', JSON.stringify(updated));
  };

  const logout = async () => {
    try {
      // Call backend logout (fire and forget - don't wait)
      const currentToken = await AsyncStorage.getItem('userToken') || await AsyncStorage.getItem('token');
      if (currentToken) {
        fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` },
        }).catch(() => {}); // ignore errors
      }
    } catch {}
    
    try {
      // Clear ALL possible storage keys (old and new)
      await AsyncStorage.multiRemove([
        'userToken',
        'userData', 
        'token',
        'user',
        'authToken',
        'currentUser',
        'pendingReferralCode',
        'appLanguage',
        'cachedRequests',
        'cachedProfile',
        'cachedNotifications',
        'savedAddress',
      ]);
      // Reset state
      setToken(null);
      setUser(null);
    } catch (error) {
      console.log('Logout error:', error);
      // Force clear state even if storage fails
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const authFetch = async (url, options = {}) => {
  const token = await getItem('token');
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  if (response.status === 401) {
    const data = await response.json();
    if (data.message?.includes('expired') || data.message?.includes('invalid') || data.message?.includes('Invalid')) {
      await removeItem('user');
      await removeItem('token');
      await removeItem('tokenStoredAt');
      Alert.alert('Session Expired', 'Please login again to continue.');
      return null;
    }
  }
  return response;
};
