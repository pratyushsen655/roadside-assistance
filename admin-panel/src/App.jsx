import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, live-map, kyc, requests, payments

  // Data logs states
  const [analytics, setAnalytics] = useState(null);
  const [liveRequests, setLiveRequests] = useState([]);
  const [liveMechanics, setLiveMechanics] = useState([]);
  const [mechanicsList, setMechanicsList] = useState([]);
  const [paymentsLog, setPaymentsLog] = useState([]);
  const [loading, setLoading] = useState(false);

  // Manual dispatch override state
  const [selectedRequest, setSelectedRequest] = useState('');
  const [selectedMechanic, setSelectedMechanic] = useState('');

  // Socket
  const [socket, setSocket] = useState(null);

  // Simulate an admin login for testing ease
  const handleSimulatedLogin = () => {
    // Generate a developer token representing the administrator
    // In production, administrators obtain this via the OTP verification route
    const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NWNmYTYwMDBhYTAwMDAwMDAwMDAwMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxNzI4NjQwMCwiZXhwIjoxNzE3ODkxMjAwfQ.dummySignature';
    setAdminToken(dummyToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${dummyToken}`;
    setIsLoggedIn(true);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    // Load initial data
    fetchAnalytics();
    fetchLiveMapData();
    fetchMechanics();
    fetchPayments();

    // Setup Socket
    const socketInstance = io(SOCKET_URL, {
      query: { token: adminToken },
      transports: ['websocket']
    });

    socketInstance.on('connect', () => {
      console.log('[Socket Admin] Connected successfully.');
      socketInstance.emit('join_room', { role: 'admin' });
    });

    socketInstance.on('admin_mechanic_location_update', (data) => {
      console.log('[Socket Admin] Live location update from mechanic:', data);
      setLiveMechanics(prev => {
        const index = prev.findIndex(m => m._id === data.mechanicId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index].location.coordinates = [data.longitude, data.latitude];
          updated[index].status = data.status;
          return updated;
        }
        return prev;
      });
    });

    socketInstance.on('admin_new_request', () => {
      fetchLiveMapData();
      fetchAnalytics();
    });

    socketInstance.on('admin_request_accepted', () => {
      fetchLiveMapData();
      fetchAnalytics();
    });

    socketInstance.on('admin_request_status_update', () => {
      fetchLiveMapData();
      fetchAnalytics();
    });

    socketInstance.on('admin_sos_alert', (data) => {
      alert(`[EMERGENCY SOS ALERT]\nCustomer: ${data.customerName}\nPhone: ${data.customerPhone}\nCoordinates: ${data.latitude}, ${data.longitude}`);
      fetchLiveMapData();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isLoggedIn]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/analytics`);
      if (res.data.success) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed fetching analytics:', err.message);
    }
  };

  const fetchLiveMapData = async () => {
    try {
      const reqsRes = await axios.get(`${API_URL}/admin/requests/live`);
      const mechsRes = await axios.get(`${API_URL}/admin/mechanics/live`);
      if (reqsRes.data.success && mechsRes.data.success) {
        setLiveRequests(reqsRes.data.data);
        setLiveMechanics(mechsRes.data.data);
      }
    } catch (err) {
      console.error('Failed querying map feeds:', err.message);
    }
  };

  const fetchMechanics = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/mechanics`);
      if (res.data.success) {
        setMechanicsList(res.data.data);
      }
    } catch (err) {
      console.error('Failed listing mechanics:', err.message);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/payments`);
      if (res.data.success) {
        setPaymentsLog(res.data.data);
      }
    } catch (err) {
      console.error('Failed loading transactions ledger:', err.message);
    }
  };

  const handleVerifyKYC = async (id, status) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/admin/mechanics/${id}/kyc`, { status });
      if (res.data.success) {
        alert(`Mechanic KYC updated: ${status}`);
        fetchMechanics();
      }
    } catch (err) {
      alert('Failed to update KYC status.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAssign = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !selectedMechanic) {
      alert('Please select both a request and an online mechanic.');
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/admin/requests/assign`, {
        requestId: selectedRequest,
        mechanicId: selectedMechanic
      });

      if (res.data.success) {
        alert('Mechanic assigned manually. Awaiting response.');
        setSelectedRequest('');
        setSelectedMechanic('');
        fetchLiveMapData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Manual dispatch assignment failed.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0c'
      }}>
        <div style={{
          backgroundColor: '#121216', padding: '40px', borderRadius: '20px',
          border: '1px solid #26262f', textAlign: 'center', maxWidth: '420px', width: '100%'
        }}>
          <h2 style={{ color: '#ff9500', marginBottom: '8px', fontWeight: '900' }}>ADMIN PORTAL</h2>
          <p style={{ color: '#a0aec0', fontSize: '13px', marginBottom: '32px' }}>Operational dashboard & manual dispatching center</p>
          <button
            onClick={handleSimulatedLogin}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              backgroundColor: '#ff9500', color: '#000', fontWeight: '700', cursor: 'pointer'
            }}
          >
            Launch Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-brand">
          <span>⚙️</span> RESCUE ME
        </div>
        <ul className="sidebar-menu">
          <li className={`menu-item ${activeTab === 'dashboard' && 'active'}`} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard
          </li>
          <li className={`menu-item ${activeTab === 'live-map' && 'active'}`} onClick={() => setActiveTab('live-map')}>
            🗺️ Live Operations Map
          </li>
          <li className={`menu-item ${activeTab === 'kyc' && 'active'}`} onClick={() => setActiveTab('kyc')}>
            🆔 KYC Review Portal
          </li>
          <li className={`menu-item ${activeTab === 'requests' && 'active'}`} onClick={() => setActiveTab('requests')}>
            🛠️ Breakdown Logs
          </li>
          <li className={`menu-item ${activeTab === 'payments' && 'active'}`} onClick={() => setActiveTab('payments')}>
            💳 Transactions Ledger
          </li>
        </ul>
        <div style={{ marginTop: 'auto' }}>
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => setIsLoggedIn(false)}>
            Logout Admin
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="main-content">
        <div className="header">
          <div className="header-title">
            {activeTab === 'dashboard' && 'Metrics & Operations Analytics'}
            {activeTab === 'live-map' && 'Live Manual Dispatch Control Center'}
            {activeTab === 'kyc' && 'Mechanics KYC Verification Portal'}
            {activeTab === 'requests' && 'Breakdown Service Records'}
            {activeTab === 'payments' && 'Payments Audit Ledger'}
          </div>
          <div className="admin-profile">
            <span style={{ fontSize: '14px', color: '#a0aec0' }}>Administrator</span>
            <div className="profile-avatar">AD</div>
          </div>
        </div>

        <div className="page-body">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && analytics && (
            <div>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Active Breakdown Requests</span>
                  <span className="stat-value" style={{ color: '#007aff' }}>{analytics.activeRequests}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Online Partner Mechanics</span>
                  <span className="stat-value" style={{ color: '#34c759' }}>{analytics.totalMechanics}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Completed Repairs</span>
                  <span className="stat-value">{analytics.completedRequests}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Total Platform Revenue</span>
                  <span className="stat-value" style={{ color: '#ff9500' }}>₹{analytics.totalRevenue}</span>
                </div>
              </div>

              <div className="data-table-container">
                <div className="table-header-bar">Operational Overview Logs</div>
                <div style={{ padding: '24px', color: '#a0aec0', fontSize: '14px' }}>
                  <p style={{ marginBottom: '12px' }}>Total Car Breakdown Requests: <strong>{analytics.bookingsDistribution?.car || 0}</strong></p>
                  <p>Total Bike Breakdown Requests: <strong>{analytics.bookingsDistribution?.bike || 0}</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE DISPATCH MAP */}
          {activeTab === 'live-map' && (
            <div className="live-map-container">
              {/* Manual Override assignment Form */}
              <div className="data-table-container" style={{ padding: '24px' }}>
                <form onSubmit={handleManualAssign} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>Select Unassigned Breakdown Request</label>
                    <select
                      value={selectedRequest}
                      onChange={(e) => setSelectedRequest(e.target.value)}
                      style={{ width: '100%', padding: '10px', backgroundColor: '#1a1a22', border: '1px solid #26262f', color: '#fff', borderRadius: '8px' }}
                    >
                      <option value="">-- Choose Pending Request --</option>
                      {liveRequests.filter(r => r.status === 'pending').map(r => (
                        <option key={r._id} value={r._id}>
                          {r.vehicleType.toUpperCase()} - {r.customer?.name} ({r.issueDescription.substring(0,25)}...)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a0aec0', marginBottom: '8px' }}>Select Available Online Mechanic</label>
                    <select
                      value={selectedMechanic}
                      onChange={(e) => setSelectedMechanic(e.target.value)}
                      style={{ width: '100%', padding: '10px', backgroundColor: '#1a1a22', border: '1px solid #26262f', color: '#fff', borderRadius: '8px' }}
                    >
                      <option value="">-- Choose Free Mechanic --</option>
                      {liveMechanics.filter(m => m.status === 'online').map(m => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.vehicleSpecializations.join(', ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button className="btn btn-primary" type="submit" style={{ height: '40px', padding: '0 24px' }}>
                    Dispatch Mechanic Manually
                  </button>
                </form>
              </div>

              {/* Graphic Plotting Grid Map */}
              <div className="map-wrapper">
                <div className="map-overlay-legend">
                  <div className="legend-item"><span className="dot dot-red"></span> Customer (Breakdown Point)</div>
                  <div className="legend-item"><span className="dot dot-green"></span> Online Mechanic</div>
                  <div className="legend-item"><span className="dot dot-orange"></span> Busy Mechanic</div>
                </div>

                <div style={{ textAlign: 'center', color: '#a0aec0', maxWidth: '400px' }}>
                  <span style={{ fontSize: '48px' }}>🗺️</span>
                  <h3 style={{ color: '#fff', marginTop: '16px', marginBottom: '8px' }}>Simulated Realtime Map</h3>
                  <p style={{ fontSize: '13px', lineHeight: '20px' }}>
                    Active breakdown requests online: <strong>{liveRequests.length}</strong>. Active mechanics online: <strong>{liveMechanics.length}</strong>. Dispatch alarms and location changes sync here in real time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KYC APPRAISALS */}
          {activeTab === 'kyc' && (
            <div className="data-table-container">
              <div className="table-header-bar">Mechanic Verification Queue</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Specializations</th>
                    <th>KYC Document URL</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mechanicsList.filter(m => m.kyc.status === 'pending').length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#a0aec0', padding: '32px' }}>
                        KYC Queue is empty. No pending documents to verify.
                      </td>
                    </tr>
                  ) : (
                    mechanicsList.filter(m => m.kyc.status === 'pending').map(m => (
                      <tr key={m._id}>
                        <td><strong>{m.name}</strong></td>
                        <td>{m.email}</td>
                        <td>{m.phone}</td>
                        <td>{m.vehicleSpecializations.join(', ').toUpperCase()}</td>
                        <td>
                          <a href={m.kyc.docUrl} target="_blank" rel="noreferrer" style={{ color: '#ff9500' }}>
                            View License File
                          </a>
                        </td>
                        <td><span className="badge badge-pending">PENDING</span></td>
                        <td>
                          <div className="action-row">
                            <button className="btn btn-primary" onClick={() => handleVerifyKYC(m._id, 'approved')}>Approve</button>
                            <button className="btn btn-danger" onClick={() => handleVerifyKYC(m._id, 'rejected')}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: SERVICE LOGS */}
          {activeTab === 'requests' && (
            <div className="data-table-container">
              <div className="table-header-bar">Breakdown History Logs</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Description</th>
                    <th>Estimated Price</th>
                    <th>Workflow Status</th>
                    <th>Payment Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {liveRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#a0aec0', padding: '32px' }}>
                        No active breakdowns currently logged.
                      </td>
                    </tr>
                  ) : (
                    liveRequests.map(r => (
                      <tr key={r._id}>
                        <td><strong>{r.customer?.name || 'User'}</strong></td>
                        <td>{r.vehicleType.toUpperCase()} ({r.vehicleModel || 'unspecified'})</td>
                        <td>{r.issueDescription}</td>
                        <td>₹{r.pricing?.totalAmount}</td>
                        <td>
                          <span className={`badge badge-${r.status}`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${r.paymentStatus}`}>
                            {r.paymentStatus}
                          </span>
                        </td>
                        <td>
                          {['completed', 'cancelled'].includes(r.status) ? (
                            <span style={{ color: '#4a5568' }}>Locked</span>
                          ) : (
                            <button
                              className="btn btn-danger"
                              onClick={async () => {
                                if (window.confirm('Cancel this service request?')) {
                                  await axios.put(`${API_URL}/requests/${r._id}/cancel`, { cancellationReason: 'Cancelled by administrator override' });
                                  fetchLiveMapData();
                                }
                              }}
                            >
                              Cancel Override
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: PAYMENTS AUDIT */}
          {activeTab === 'payments' && (
            <div className="data-table-container">
              <div className="table-header-bar">Transactions History Log</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Mechanic Partner</th>
                    <th>Amount</th>
                    <th>Settlement Mode</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsLog.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#a0aec0', padding: '32px' }}>
                        No transactions registered in the ledger.
                      </td>
                    </tr>
                  ) : (
                    paymentsLog.map(p => (
                      <tr key={p._id}>
                        <td><code>{p.transactionId || 'CASH_SETTLED'}</code></td>
                        <td>{p.customer?.name} ({p.customer?.phone})</td>
                        <td>{p.mechanic?.name || 'Unassigned'}</td>
                        <td><strong>₹{p.amount}</strong></td>
                        <td>{p.paymentMethod.toUpperCase()}</td>
                        <td><span className={`badge badge-${p.paymentStatus}`}>{p.paymentStatus}</span></td>
                        <td>{new Date(p.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
