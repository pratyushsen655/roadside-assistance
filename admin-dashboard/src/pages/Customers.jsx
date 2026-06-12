import React, { useEffect, useState } from 'react';
import api from '../config/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCust, setSelectedCust] = useState(null);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/api/admin/customers');
      if (response.data.success) {
        setCustomers(response.data.customers || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch customer directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleBlockToggle = async (id, currentStatus) => {
    try {
      const response = await api.put(`/api/admin/customers/${id}/block`);
      if (response.data.success) {
        setCustomers(prev =>
          prev.map(c => (c._id === id ? { ...c, isBlocked: response.data.isBlocked } : c))
        );
        if (selectedCust && selectedCust._id === id) {
          setSelectedCust(prev => ({ ...prev, isBlocked: response.data.isBlocked }));
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update block status.');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Actions Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-full md:w-96 relative">
          <span className="absolute left-4 top-3.5 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-center">
          {error}
        </div>
      ) : null}

      {/* Customers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/55 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Join Date</th>
                <th className="px-6 py-4 text-center">Total Jobs</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust._id}
                  className="hover:bg-gray-50/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedCust(cust)}
                >
                  <td className="px-6 py-4 font-semibold text-gray-800">{cust.name}</td>
                  <td className="px-6 py-4 text-gray-600">{cust.phone}</td>
                  <td className="px-6 py-4 text-gray-500">{cust.joinDate}</td>
                  <td className="px-6 py-4 text-center font-bold text-gray-700">{cust.totalJobs}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      cust.isBlocked ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {cust.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleBlockToggle(cust._id, cust.isBlocked)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                        cust.isBlocked
                          ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {cust.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCust && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-8 animate-fade-in relative border border-gray-100">
            {/* Close btn */}
            <button
              onClick={() => setSelectedCust(null)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>

            {/* Profile Overview */}
            <div className="flex items-center gap-5 border-b border-gray-100 pb-6 mb-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-bold">
                👤
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  {selectedCust.name}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedCust.isBlocked ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {selectedCust.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </h3>
                <p className="text-gray-500 mt-1">{selectedCust.phone} • {selectedCust.email}</p>
              </div>
            </div>

            {/* Grid Vehicle Details */}
            <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-5 rounded-2xl">
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Vehicle Make</span>
                <span className="text-sm font-bold text-gray-800 mt-1 block">{selectedCust.vehicleMake}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Vehicle Model</span>
                <span className="text-sm font-bold text-gray-800 mt-1 block">{selectedCust.vehicleModel}</span>
              </div>
            </div>

            {/* Request History */}
            <h4 className="text-md font-bold text-gray-800 mb-4">Job Booking History ({selectedCust.history.length})</h4>
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Issue</th>
                      <th className="px-5 py-3">Mechanic</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedCust.history.map(job => (
                      <tr key={job.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-500">{job.date}</td>
                        <td className="px-5 py-3 font-semibold text-gray-700">{job.issue}</td>
                        <td className="px-5 py-3 text-gray-600">{job.mechanicName}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            job.status === 'completed' ? 'bg-green-50 text-green-700' :
                            job.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-gray-700">{job.amount}</td>
                      </tr>
                    ))}
                    {selectedCust.history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-gray-400 italic">No request history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
