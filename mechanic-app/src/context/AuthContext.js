import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const AuthContext = createContext();

export const API_URL = 'http://10.0.2.2:5000/api'; // Host machine loopback inside android emulator

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [mechanic, setMechanic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhone, setActivePhone] = useState('');

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@mechanic_token');
      const storedMech = await AsyncStorage.getItem('@mechanic_details');

      if (storedToken && storedMech) {
        setToken(storedToken);
        setMechanic(JSON.parse(storedMech));
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (e) {
      console.error('Failed to load session details:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, phone, specializations) => {
    try {
      const res = await axios.post(`${API_URL}/auth/mechanic/register`, {
        name,
        email,
        phone,
        vehicleSpecializations: specializations
      });
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.'
      };
    }
  };

  const requestOTP = async (phone) => {
    try {
      setActivePhone(phone);
      const res = await axios.post(`${API_URL}/auth/mechanic/otp`, { phone });
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to dispatch OTP.'
      };
    }
  };

  const verifyOTP = async (otp) => {
    try {
      const res = await axios.post(`${API_URL}/auth/mechanic/verify`, {
        phone: activePhone,
        otp
      });

      const { token: jwtToken, mechanic: mechData } = res.data;

      setToken(jwtToken);
      setMechanic(mechData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;

      await AsyncStorage.setItem('@mechanic_token', jwtToken);
      await AsyncStorage.setItem('@mechanic_details', JSON.stringify(mechData));

      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Invalid or expired verification OTP.'
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@mechanic_token');
      await AsyncStorage.removeItem('@mechanic_details');
      setToken(null);
      setMechanic(null);
      delete axios.defaults.headers.common['Authorization'];
    } catch (e) {
      console.error('Logout error:', e.message);
    }
  };

  const uploadKYCDocs = async (docType, docUrl) => {
    try {
      const res = await axios.post(`${API_URL}/mechanics/kyc`, { docType, docUrl });
      const updatedMech = { ...mechanic, kycStatus: 'pending' };
      setMechanic(updatedMech);
      await AsyncStorage.setItem('@mechanic_details', JSON.stringify(updatedMech));
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed uploading KYC.' };
    }
  };

  const toggleAvailability = async (status) => {
    try {
      const res = await axios.put(`${API_URL}/mechanics/status`, { status });
      const updatedMech = { ...mechanic, status: res.data.data.status };
      setMechanic(updatedMech);
      await AsyncStorage.setItem('@mechanic_details', JSON.stringify(updatedMech));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Status toggle failed.' };
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/mechanics/profile`);
      if (res.data.success) {
        const fullData = res.data.data;
        const updatedMech = {
          ...mechanic,
          kycStatus: fullData.kyc.status,
          status: fullData.status,
          averageRating: fullData.averageRating
        };
        setMechanic(updatedMech);
        await AsyncStorage.setItem('@mechanic_details', JSON.stringify(updatedMech));
      }
    } catch (err) {
      console.error('Refresh error:', err.message);
    }
  };

  return (
    <AuthContext.Provider value={{
      token,
      mechanic,
      loading,
      register,
      requestOTP,
      verifyOTP,
      logout,
      uploadKYCDocs,
      toggleAvailability,
      refreshProfile,
      activePhone
    }}>
      {children}
    </AuthContext.Provider>
  );
};
