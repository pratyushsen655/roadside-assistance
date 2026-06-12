import React, { useEffect, useState } from 'react';
import api from '../config/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Earnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEarnings = async () => {
    try {
      const response = await api.get('/api/admin/earnings');
      if (response.data.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch platform earnings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleMarkAsPaid = (mechanicName, amount) => {
    alert(`Payout of ₹${amount} successfully dispatched to ${mechanicName}!`);
    // Update local state dynamically to show paid status immediately
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        payouts: prev.payouts.map(p =>
          p.name === mechanicName ? { ...p, payoutStatus: 'paid', pendingPayout: 0, paidOut: p.paidOut + p.pendingPayout } : p
        )
      };
    });
  };

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

  const { totalRevenue, monthlyEarnings, payouts } = data || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Revenue Card */}
      <div className="bg-gradient-to-r from-accent to-orange-600 p-8 rounded-3xl shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-orange-100 text-sm font-semibold uppercase tracking-wider">Total Platform Revenue (All Time)</span>
          <h2 className="text-4xl font-extrabold mt-2">₹{totalRevenue}</h2>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
          <span className="text-xs text-orange-200 block font-semibold">Platform Fee (15%)</span>
          <span className="text-xl font-bold block mt-1">₹{Math.round(totalRevenue * 0.15)}</span>
        </div>
      </div>

      {/* Bar Chart 6 months */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Monthly Revenue Breakdown</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyEarnings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} />
              <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#00BFA5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mechanic Payouts Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Mechanic Payout Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/55 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Mechanic</th>
                <th className="px-6 py-4 text-right">Total Earned</th>
                <th className="px-6 py-4 text-right">Paid Out</th>
                <th className="px-6 py-4 text-right">Pending Payout (15%)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {payouts?.map((pay) => (
                <tr key={pay.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-800">{pay.name}</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-700">₹{pay.totalEarned}</td>
                  <td className="px-6 py-4 text-right text-gray-600">₹{pay.paidOut}</td>
                  <td className="px-6 py-4 text-right font-bold text-accent">₹{pay.pendingPayout}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      pay.payoutStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {pay.payoutStatus === 'paid' ? 'Settled' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {pay.payoutStatus === 'pending' && pay.pendingPayout > 0 ? (
                      <button
                        onClick={() => handleMarkAsPaid(pay.name, pay.pendingPayout)}
                        className="bg-accent text-white hover:bg-accent/90 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-accent/15"
                      >
                        Mark as Paid
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs italic">All Paid</span>
                    )}
                  </td>
                </tr>
              ))}
              {payouts?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">No payout records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
