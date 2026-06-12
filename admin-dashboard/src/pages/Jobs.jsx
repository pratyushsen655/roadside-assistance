import React, { useEffect, useState } from 'react';
import api from '../config/api';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/api/admin/jobs');
      if (response.data.success) {
        setJobs(response.data.jobs || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this job?')) return;
    try {
      const response = await api.put(`/api/admin/jobs/${id}/cancel`);
      if (response.data.success) {
        setJobs(prev =>
          prev.map(j => (j.id === id ? { ...j, status: 'cancelled' } : j))
        );
        if (selectedJob && selectedJob.id === id) {
          setSelectedJob(prev => ({ ...prev, status: 'cancelled' }));
        }
        alert('Job cancelled successfully.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to cancel job.');
    }
  };

  const getFilteredJobs = () => {
    if (filter === 'All') return jobs;
    if (filter === 'Pending') return jobs.filter(j => j.status === 'pending');
    if (filter === 'Active') return jobs.filter(j => ['accepted', 'on_the_way', 'arrived', 'work_in_progress', 'assigned'].includes(j.status));
    if (filter === 'Completed') return jobs.filter(j => j.status === 'completed');
    if (filter === 'Cancelled') return jobs.filter(j => j.status === 'cancelled');
    return jobs;
  };

  const isActiveJob = (status) => {
    return ['accepted', 'on_the_way', 'arrived', 'work_in_progress', 'assigned', 'pending'].includes(status);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredJobs = getFilteredJobs();

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        {['All', 'Pending', 'Active', 'Completed', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              filter === tab
                ? 'bg-accent text-white shadow-md shadow-accent/25'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-center">
          {error}
        </div>
      ) : null}

      {/* Jobs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/55 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Mechanic</th>
                <th className="px-6 py-4">Issue Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-gray-50/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedJob(job)}
                >
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{job.id.substring(18)}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">{job.customer}</td>
                  <td className="px-6 py-4 text-gray-600">{job.mechanic}</td>
                  <td className="px-6 py-4 text-gray-600 uppercase text-xs font-bold">{job.issueType.replace('_', ' ')}</td>
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
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      job.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' :
                      job.paymentStatus === 'failed' ? 'bg-red-50 text-red-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>
                      {job.paymentStatus || 'pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{job.date}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">{job.amount}</td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {isActiveJob(job.status) && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-400 italic">No service requests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl p-8 animate-fade-in relative border border-gray-100">
            {/* Close btn */}
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              Job Booking Detail
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                selectedJob.status === 'completed' ? 'bg-green-50 text-green-700' :
                selectedJob.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                selectedJob.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                {selectedJob.status.replace('_', ' ')}
              </span>
            </h3>

            {/* Grid */}
            <div className="space-y-4 bg-gray-50 p-6 rounded-2xl mb-6 text-sm">
              <div className="flex justify-between border-b border-gray-200/50 pb-2">
                <span className="text-gray-400 font-medium">Job ID:</span>
                <span className="font-mono text-gray-700 font-bold">{selectedJob.id}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/50 pb-2">
                <span className="text-gray-400 font-medium">Customer:</span>
                <span className="font-semibold text-gray-800">{selectedJob.customer} ({selectedJob.customerPhone})</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/50 pb-2">
                <span className="text-gray-400 font-medium">Mechanic Assigned:</span>
                <span className="font-semibold text-gray-800">{selectedJob.mechanic} ({selectedJob.mechanicPhone || 'N/A'})</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/50 pb-2">
                <span className="text-gray-400 font-medium">Service Type:</span>
                <span className="font-bold text-gray-800 uppercase text-xs">{selectedJob.issueType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/50 pb-2">
                <span className="text-gray-400 font-medium">Payment Status:</span>
                <span className={`font-bold text-xs uppercase ${selectedJob.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-500'}`}>{selectedJob.paymentStatus || 'pending'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/50 pb-2">
                <span className="text-gray-400 font-medium">Description:</span>
                <span className="text-gray-700 italic">"{selectedJob.description || 'No description provided.'}"</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/50 pb-2">
                <span className="text-gray-400 font-medium">Booking Date:</span>
                <span className="text-gray-700 font-semibold">{selectedJob.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-medium">Total Cost:</span>
                <span className="font-extrabold text-accent text-lg">{selectedJob.amount}</span>
              </div>
            </div>

            {/* Cancel Button inside Modal */}
            {isActiveJob(selectedJob.status) && (
              <button
                onClick={() => handleCancel(selectedJob.id)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-red-600/20"
              >
                Cancel Active Job
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
