import React, { useEffect, useState } from 'react';
import api from '../config/api';

export default function Mechanics() {
  const [mechanics, setMechanics] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMech, setSelectedMech] = useState(null);

  const fetchMechanics = async () => {
    try {
      const response = await api.get('/api/admin/mechanics');
      if (response.data.success) {
        setMechanics(response.data.mechanics || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch mechanic network.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMechanics();
  }, []);

  const handleVerify = async (id) => {
    try {
      const response = await api.put(`/api/admin/mechanics/${id}/verify`);
      if (response.data.success) {
        setMechanics(prev =>
          prev.map(m => (m._id === id ? { ...m, isVerified: true } : m))
        );
        if (selectedMech && selectedMech._id === id) {
          setSelectedMech(prev => ({ ...prev, isVerified: true }));
        }
        Alert.alert('Success', 'Mechanic verified successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to verify mechanic.');
    }
  };

  const handleBlockToggle = async (id, currentStatus) => {
    try {
      const response = await api.put(`/api/admin/mechanics/${id}/block`);
      if (response.data.success) {
        setMechanics(prev =>
          prev.map(m => (m._id === id ? { ...m, isBlocked: response.data.isBlocked } : m))
        );
        if (selectedMech && selectedMech._id === id) {
          setSelectedMech(prev => ({ ...prev, isBlocked: response.data.isBlocked }));
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update block status.');
    }
  };

  const filteredMechanics = mechanics.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
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
      {/* Search Bar Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-full md:w-96 relative">
          <span className="absolute left-4 top-3.5 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            placeholder="Search mechanics by name or phone..."
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

      {/* Mechanics Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/55 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4 text-center">Total Jobs</th>
                <th className="px-6 py-4 text-right">Total Earnings</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Verified</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredMechanics.map((mech) => (
                <tr
                  key={mech._id}
                  className="hover:bg-gray-50/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedMech(mech)}
                >
                  <td className="px-6 py-4 font-semibold text-gray-800">{mech.name}</td>
                  <td className="px-6 py-4 text-gray-600">{mech.phone}</td>
                  <td className="px-6 py-4 font-bold text-yellow-600">★ {mech.rating.toFixed(1)}</td>
                  <td className="px-6 py-4 text-center font-bold text-gray-700">{mech.totalJobs}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">₹{mech.earnings}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      mech.isOnline ? 'bg-teal-50 text-tealAccent' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {mech.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      mech.isVerified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {mech.isVerified ? 'Verified' : 'Pending Approval'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 justify-center">
                      {!mech.isVerified && (
                        <button
                          onClick={() => handleVerify(mech._id)}
                          className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-accent/90"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleBlockToggle(mech._id, mech.isBlocked)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                          mech.isBlocked
                            ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {mech.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMechanics.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400 italic">No mechanics found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mechanic Detail Modal */}
      {selectedMech && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-8 animate-fade-in relative border border-gray-100">
            {/* Close btn */}
            <button
              onClick={() => setSelectedMech(null)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>

            {/* Profile Overview */}
            <div className="flex items-center gap-5 border-b border-gray-100 pb-6 mb-6">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-2xl font-bold">
                👤
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-800">{selectedMech.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedMech.isVerified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {selectedMech.isVerified ? 'Verified' : 'Pending Approval'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedMech.isOnline ? 'bg-teal-50 text-tealAccent' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {selectedMech.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className="text-gray-500 mt-1">{selectedMech.phone}</p>
              </div>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-3 gap-6 mb-8 bg-gray-50 p-5 rounded-2xl">
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Rating</span>
                <span className="text-sm font-bold text-yellow-600 mt-1 block">★ {selectedMech.rating.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Experience</span>
                <span className="text-sm font-bold text-gray-800 mt-1 block">{selectedMech.experience} Years</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Specializations</span>
                <span className="text-sm font-bold text-gray-800 mt-1 block truncate">
                  {selectedMech.vehicleSpecializations.join(', ') || 'General'}
                </span>
              </div>
            </div>

            {/* Bio text */}
            {selectedMech.bio && (
              <div className="mb-6 bg-orange-50/30 border border-orange-100 p-4 rounded-xl">
                <h5 className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">Bio</h5>
                <p className="text-sm text-gray-700 italic">"{selectedMech.bio}"</p>
              </div>
            )}

            {/* Job History */}
            <h4 className="text-md font-bold text-gray-800 mb-4">Completed Jobs ({selectedMech.history.length})</h4>
            <div className="border border-gray-100 rounded-2xl overflow-hidden mb-6">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Issue</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedMech.history.map(job => (
                      <tr key={job.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-500">{job.date}</td>
                        <td className="px-5 py-3 font-semibold text-gray-700">{job.issue}</td>
                        <td className="px-5 py-3 text-gray-600">{job.customerName}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            job.status === 'completed' ? 'bg-green-50 text-green-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-gray-700">{job.amount}</td>
                      </tr>
                    ))}
                    {selectedMech.history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-gray-400 italic">No job history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verification approval button */}
            {!selectedMech.isVerified && (
              <button
                onClick={() => handleVerify(selectedMech._id)}
                className="w-full bg-accent hover:bg-accent/95 text-white font-semibold py-3 rounded-xl shadow-lg transition-all"
              >
                Approve and Verify Mechanic Profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
