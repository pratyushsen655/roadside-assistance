import React, { createContext, useState, useEffect } from 'react';
import { getItem, setItem, removeItem } from '../utils/storage';

export const AuthContext = createContext({
  user: null,
  token: null,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      const storedUser = await getItem('user');
      const storedToken = await getItem('token');
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
      setLoading(false);
    };
    loadAuth();
  }, []);

  const login = async (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    await setItem('user', JSON.stringify(userData));
    await setItem('token', authToken);
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await removeItem('user');
    await removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
