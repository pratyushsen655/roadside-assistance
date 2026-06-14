/* eslint-disable no-console */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { getItem, setItem, removeItem } from '../utils/storage';
import { registerForPushNotifications, savePushToken } from '../services/notificationService';
import { AppState } from 'react-native';

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
    const checkSessionTimeout = async () => {
      try {
        const lastBackgroundTime = await getItem('lastBackgroundTime');
        if (lastBackgroundTime) {
          const elapsed = Date.now() - Number(lastBackgroundTime);
          if (elapsed >= 120000) {
            await removeItem('user');
            await removeItem('token');
            await removeItem('lastBackgroundTime');
            return true;
          }
          await removeItem('lastBackgroundTime');
        }
      } catch (e) {
        console.error('Session timeout check error:', e.message);
      }
      return false;
    };

    const loadAuth = async () => {
      try {
        const timedOut = await checkSessionTimeout();
        if (timedOut) {
          setLoading(false);
          return;
        }

        const storedUser = await getItem('user');
        const storedToken = await getItem('token');

        if (storedUser && storedToken) {
          try {
            const res = await fetch(`${API_URL}/api/auth/profile`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            const data = await res.json();
            if (data.success) {
              // Refresh user data from server
              setUser(data.user);
              setToken(storedToken);
              await setItem('user', JSON.stringify(data.user));
            } else {
              await removeItem('user');
              await removeItem('token');
            }
          } catch {
            // Network error — keep stored session (offline tolerance)
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
          }
        }
      } catch (e) {
        console.error('Auth restore error:', e.message);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        await setItem('lastBackgroundTime', Date.now().toString());
      } else if (nextAppState === 'active') {
        try {
          const lastBackgroundTime = await getItem('lastBackgroundTime');
          if (lastBackgroundTime) {
            const elapsed = Date.now() - Number(lastBackgroundTime);
            if (elapsed >= 120000) {
              await logout();
            }
            await removeItem('lastBackgroundTime');
          }
        } catch (e) {
          console.error('[AuthContext] AppState active check error:', e.message);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Called after OTP verify success.
   * @param {object} userData  — user object from /verify-otp response
   * @param {string} authToken — JWT from /verify-otp response
   */
  const login = async (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    await setItem('user', JSON.stringify(userData));
    await setItem('token', authToken);
    try {
      const pushToken = await registerForPushNotifications();
      if (pushToken) await savePushToken(pushToken);
    } catch (err) {
      console.log('[AuthContext] Error registering push notification on login:', err.message);
    }
  };

  /**
   * Update cached user data (e.g. after CompleteProfile save).
   */
  const updateUser = async (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    await setItem('user', JSON.stringify(updated));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await removeItem('user');
    await removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
