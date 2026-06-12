import React, { useEffect, useState } from 'react';
import api from '../config/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#FBC02D', '#1E88E5', '#2E7D32', '#C62828']; // Yellow (Pending), Blue (Accepted), Green (Completed), Red (Cancelled)

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/stats');
      if (response.data.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-center">
        {error}
      </div>
    );
  }

  const { stats, revenueData, jobsByStatus, recentJobs } = data || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-sm font-semibold">Total Customers</span>
            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats?.totalCustomers}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-accent text-2xl font-bold">
            👥
          </div>
        </div>

        {/* Total Mechanics */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-sm font-semibold">Total Mechanics</span>
            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats?.totalMechanics}</h3>
            <p className="text-xs text-tealAccent font-semibold mt-1">⚡ {stats?.onlineMechanics} Online Now</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-tealAccent text-2xl font-bold">
            🔧
          </div>
        </div>

        {/* Total Jobs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-sm font-semibold">Total Jobs</span>
            <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats?.totalJobs}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl font-bold">
            📋
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-gray-500 text-sm font-semibold">Total Revenue</span>
            <h3 className="text-3xl font-bold text-gray-800 mt-2">₹{stats?.totalRevenue}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 text-2xl font-bold">
            💰
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Line Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue Trend (Last 7 Days)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Earnings']} />
                <Line type="monotone" dataKey="earnings" stroke="#B34700" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Jobs Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Job Status Distribution</h3>
          <div className="h-80 flex flex-col justify-center items-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={jobsByStatus?.filter(j => j.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {jobsByStatus?.filter(j => j.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Custom Legend */}
            <div className="flex flex-wrap gap-4 mt-2 justify-center">
              {jobsByStatus?.map((status, index) => (
                <div key={status.name} className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  {status.name} ({status.value})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Recent Service Bookings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/55 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Mechanic</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {recentJobs?.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{job.id.substring(18)}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{job.customer}</td>
                  <td className="px-6 py-4 text-gray-600">{job.mechanic}</td>
                  <td className="px-6 py-4 text-gray-500">{job.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      job.status === 'completed' ? 'bg-green-50 text-green-700' :
                      job.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      job.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">{job.amount}</td>
                </tr>
              ))}
              {recentJobs?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">No recent jobs available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
