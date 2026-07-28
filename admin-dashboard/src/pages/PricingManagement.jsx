import React, { useEffect, useState } from 'react';
import api from '../config/api';

export default function PricingManagement() {
  const [configs, setConfigs] = useState([]);
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('car');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingConfig, setEditingConfig] = useState(null); // holds the config being edited
  const [isSaving, setIsSaving] = useState(false);

  // Form states for the modal
  const [baseFareInput, setBaseFareInput] = useState('');
  const [perKmRateInput, setPerKmRateInput] = useState('');
  const [minChargeInput, setMinChargeInput] = useState('');

  const fetchConfigs = async () => {
    try {
      const response = await api.get('/api/pricing');
      if (response.data.success) {
        setConfigs(response.data.configs || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch pricing configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleEditClick = (config) => {
    setEditingConfig(config);
    setBaseFareInput(config.baseFare);
    setPerKmRateInput(config.perKmRate);
    setMinChargeInput(config.minCharge || 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingConfig) return;

    if (Number(baseFareInput) < 0 || Number(perKmRateInput) < 0 || Number(minChargeInput) < 0) {
      setError('Base Fare, Per-Km Rate, and Min Charge cannot be negative numbers.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.put(`/api/pricing/${editingConfig.serviceType}/${editingConfig.vehicleType}`, {
        baseFare: Number(baseFareInput),
        perKmRate: Number(perKmRateInput),
        minCharge: Number(minChargeInput),
      });

      if (response.data.success) {
        // Update local state
        setConfigs(prev =>
          prev.map(c => (c.serviceType === editingConfig.serviceType && c.vehicleType === editingConfig.vehicleType ? response.data.config : c))
        );
        
        // Show success notification
        setSuccessMessage(`Pricing configuration for '${formatServiceType(editingConfig.serviceType)}' updated successfully!`);
        
        // Close modal
        setEditingConfig(null);

        // Auto dismiss success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        setError(response.data.message || 'Failed to update pricing configuration.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatServiceType = (type) => {
    if (!type) return '';
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Dynamic Pricing Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Configure base fares, per-kilometer rates, and minimum service charges for all roadside services.</p>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMessage && (
        <div className="bg-green-50 text-green-700 border border-green-200 p-4 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span className="font-semibold text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-green-500 hover:text-green-700 font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="font-semibold text-sm">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}

      {/* Vehicle Type Tabs Filter */}
      <div className="flex flex-wrap gap-2 bg-gray-100/60 p-1.5 rounded-xl border border-gray-200/50 max-w-max">
        {['car', 'bike', 'ev', 'auto', 'truck', 'tractor', 'bus'].map((vType) => (
          <button
            key={vType}
            onClick={() => setSelectedVehicleFilter(vType)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
              selectedVehicleFilter === vType
                ? 'bg-accent text-white shadow-md shadow-accent/15'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {vType === 'ev' ? 'EV' : vType}
          </button>
        ))}
      </div>

      {/* Pricing Configurations Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/55 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Service Type</th>
                <th className="px-6 py-4">Vehicle Type</th>
                <th className="px-6 py-4">Base Fare</th>
                <th className="px-6 py-4">Per Km Rate</th>
                <th className="px-6 py-4">Min Charge</th>
                <th className="px-6 py-4">Last Updated By</th>
                <th className="px-6 py-4">Last Updated Time</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {configs
                .filter(config => config.vehicleType === selectedVehicleFilter)
                .map((config) => (
                  <tr key={config._id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🛠️</span>
                        <span>{formatServiceType(config.serviceType)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                        {config.vehicleType === 'ev' ? 'EV' : config.vehicleType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-700">₹{config.baseFare}</td>
                    <td className="px-6 py-4 text-gray-600">₹{config.perKmRate}/km</td>
                    <td className="px-6 py-4 text-gray-600">₹{config.minCharge}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{config.updatedBy || 'System'}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{formatDate(config.updatedAt)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleEditClick(config)}
                        className="bg-accent text-white hover:bg-accent/90 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-accent/15 transition-all"
                      >
                        ✏️ Edit Config
                      </button>
                    </td>
                  </tr>
                ))}
              {configs.filter(config => config.vehicleType === selectedVehicleFilter).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400 italic">No pricing configurations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Config Modal */}
      {editingConfig && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-8 animate-fade-in relative border border-gray-100">
            {/* Close btn */}
            <button
              onClick={() => setEditingConfig(null)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
              <span className="text-2xl">🏷️</span>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Edit Pricing: {formatServiceType(editingConfig.serviceType)} ({editingConfig.vehicleType === 'ev' ? 'EV' : editingConfig.vehicleType.toUpperCase()})
                </h3>
                <p className="text-xs text-gray-500">Update pricing parameters for this service type.</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Base Fare (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  placeholder="e.g. 350"
                  value={baseFareInput}
                  onChange={(e) => setBaseFareInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Per Km Rate (₹/km)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  placeholder="e.g. 30"
                  value={perKmRateInput}
                  onChange={(e) => setPerKmRateInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Minimum Charge (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  placeholder="e.g. 400"
                  value={minChargeInput}
                  onChange={(e) => setMinChargeInput(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingConfig(null)}
                  className="w-1/2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-all text-sm text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 bg-accent hover:bg-accent/95 text-white font-semibold py-3 rounded-xl shadow-lg shadow-accent/25 transition-all flex items-center justify-center text-sm"
                >
                  {isSaving ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    '💾 Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
