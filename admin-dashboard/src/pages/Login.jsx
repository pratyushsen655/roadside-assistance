import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, { email, password });
      if (response.data.success && response.data.token) {
        localStorage.setItem('adminToken', response.data.token);
        navigate('/');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8 border border-gray-100">
        <div className="text-center mb-8">
          <span className="text-4xl">🚗🔧</span>
          <h2 className="text-2xl font-bold text-gray-800 mt-4">Roadside Admin</h2>
          <p className="text-gray-500 text-sm mt-1">Management Portal</p>
        </div>

        {error ? (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mb-6 text-center">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm"
              placeholder="e.g. admin@roadside.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent/95 transition-all shadow-lg shadow-accent/25 flex items-center justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 bg-gray-50/50 p-4 rounded-xl text-center">
          <p className="text-xs font-semibold text-gray-500 mb-1">Default Credentials</p>
          <p className="text-xs text-gray-600">Email: <span className="font-mono text-accent">admin@roadside.com</span></p>
          <p className="text-xs text-gray-600">Password: <span className="font-mono text-accent">admin123</span></p>
        </div>
      </div>
    </div>
  );
}
