import React, { useEffect, useState } from 'react';
import api from '../config/api';

// ── KYC status badge helper ────────────────────────────────────────────────────
function KycBadge({ status }) {
  const map = {
    approved:  'bg-green-50 text-green-700 border border-green-200',
    rejected:  'bg-red-50 text-red-700 border border-red-200',
    pending:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  };
  const label = {
    approved: '✓ Approved',
    rejected: '✕ Rejected',
    pending:  '⏳ Pending Review',
  };
  const cls = map[status] || map.pending;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>
      {label[status] || 'Pending Review'}
    </span>
  );
}

// ── KYC Panel (rendered inside the modal) ─────────────────────────────────────
function KycPanel({ mech, onUpdate }) {
  const kyc = mech.kyc || {};
  const docs = mech.documents || {};
  const legacyDoc = docs.identityProof || docs.licenseImage || (docs.certificationImages && docs.certificationImages[0]) || '';

  const [rejectionReason, setRejectionReason] = useState(kyc.rejectionReason || '');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const docUrl = kyc.docUrl || legacyDoc || '';
  const docType = kyc.docType || (docs.identityProof ? 'Identity Proof' : docs.licenseImage ? 'Driving License' : legacyDoc ? 'Registration Document' : '');
  const kycStatus = kyc.status || (docUrl ? 'pending' : 'unsubmitted');

  // Build full list of all uploaded documents (from KYC upload or registration)
  const documentList = [];
  if (kyc.docUrl) {
    documentList.push({ label: kyc.docType || 'KYC Document', url: kyc.docUrl });
  }
  if (docs.identityProof && docs.identityProof !== kyc.docUrl) {
    documentList.push({ label: 'ID Proof (Registration)', url: docs.identityProof });
  }
  if (docs.licenseImage && docs.licenseImage !== kyc.docUrl) {
    documentList.push({ label: 'Driving License (Registration)', url: docs.licenseImage });
  }
  if (docs.certificationImages && Array.isArray(docs.certificationImages)) {
    docs.certificationImages.forEach((url, idx) => {
      if (url && url !== kyc.docUrl) {
        documentList.push({ label: `Shop / Cert Photo ${idx + 1}`, url });
      }
    });
  }

  // Guess if the URL looks like an image or PDF
  const isPdf = docUrl && /\.pdf(\?|$)/i.test(docUrl);
  const isImage = docUrl && (!isPdf || /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(docUrl) || docUrl.startsWith('data:image/') || docUrl.includes('kyc-documents') || docUrl.includes('storage.googleapis.com'));

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      const res = await api.put(`/api/admin/mechanics/${mech._id}/kyc`, { action: 'approve' });
      if (res.data.success) {
        onUpdate({ kyc: { ...kyc, status: 'approved', rejectionReason: '' }, isVerified: true });
        setShowRejectBox(false);
      } else {
        alert(res.data.message || 'Failed to approve KYC.');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to approve KYC.');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    setActionLoading('reject');
    try {
      const res = await api.put(`/api/admin/mechanics/${mech._id}/kyc`, {
        action: 'reject',
        rejectionReason: rejectionReason.trim(),
      });
      if (res.data.success) {
        onUpdate({ kyc: { ...kyc, status: 'rejected', rejectionReason: rejectionReason.trim() }, isVerified: false });
        setShowRejectBox(false);
      } else {
        alert(res.data.message || 'Failed to reject KYC.');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to reject KYC.');
    } finally {
      setActionLoading('');
    }
  };

  const handleAttachSample = async () => {
    setActionLoading('attach');
    try {
      const sampleUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
      const res = await api.put(`/api/admin/mechanics/${mech._id}/kyc`, {
        action: 'approve',
        docUrl: sampleUrl,
        docType: 'Aadhaar Card',
        status: 'pending'
      });

      if (res.data.success) {
        onUpdate({
          kyc: {
            status: 'pending',
            docType: 'Aadhaar Card',
            docUrl: sampleUrl,
            rejectionReason: ''
          }
        });
      } else {
        alert(res.data.message || 'Failed to attach sample document.');
      }
    } catch (err) {
      console.error('Attach Sample Error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to attach sample document.';
      alert(`Error (${err.response?.status || 'network'}): ${errMsg}`);
    } finally {
      setActionLoading('');
    }
  };


  // No KYC or registration documents submitted at all
  if (!docUrl && documentList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-2xl text-accent">📂</div>
        <div>
          <p className="text-gray-700 text-sm font-bold">No KYC document submitted yet.</p>
          <p className="text-gray-400 text-xs mt-1 max-w-sm">
            The mechanic has not uploaded an identity document from the mobile app yet.
          </p>
        </div>
        <button
          onClick={handleAttachSample}
          disabled={actionLoading !== ''}
          className="mt-3 bg-accent hover:bg-accent/90 disabled:opacity-60 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
        >
          {actionLoading === 'attach' ? 'Attaching…' : '⚡ Attach Sample Aadhaar Document (Demo)'}
        </button>
      </div>
    );
  }



  return (
    <div className="space-y-5">
      {/* ── Status row ─────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">KYC Status</p>
          <KycBadge status={kycStatus} />
        </div>
        {docType && (
          <div className="text-right">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Document Type</p>
            <span className="text-sm font-bold text-gray-700 capitalize">{docType}</span>
          </div>
        )}
      </div>

      {/* ── Rejection reason display (if rejected) ──────────── */}
      {kycStatus === 'rejected' && kyc.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <p className="text-xs text-red-500 font-semibold uppercase tracking-wider mb-1">Rejection Reason</p>
          <p className="text-sm text-red-700">{kyc.rejectionReason}</p>
        </div>
      )}

      {/* ── Document viewer ────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Submitted Document</p>

        {isImage ? (
          <div className="relative border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
            {!imgLoaded && !imgError && (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading document…</div>
            )}
            {imgError ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2">
                <span className="text-3xl">🖼️</span>
                <span>Unable to preview. </span>
                <a href={docUrl} target="_blank" rel="noreferrer"
                  className="text-accent text-xs font-semibold underline underline-offset-2">
                  Open document in new tab →
                </a>
              </div>
            ) : (
              <img
                src={docUrl}
                alt="KYC Document"
                className={`w-full max-h-72 object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgError(true); setImgLoaded(true); }}
              />
            )}
            {imgLoaded && !imgError && (
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs text-accent font-semibold py-2 border-t border-gray-100 hover:bg-orange-50/40 transition-colors"
              >
                🔗 Open Full Image in New Tab
              </a>
            )}
          </div>
        ) : isPdf ? (
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <iframe
              src={docUrl}
              title="KYC Document PDF"
              className="w-full h-64 bg-gray-50"
            />
            <a
              href={docUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-accent font-semibold py-2 border-t border-gray-100 hover:bg-orange-50/40 transition-colors"
            >
              📄 Open PDF in New Tab
            </a>
          </div>
        ) : (
          // Unknown file type — just show a link
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
            <span className="text-2xl">📎</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 truncate">{docUrl}</p>
            </div>
            <a
              href={docUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-accent/90"
            >
              Open →
            </a>
          </div>
        )}
      </div>

      {/* ── Action buttons (only when pending or re-reviewing) ── */}
      {(kycStatus === 'pending' || kycStatus === 'rejected') && (
        <div className="space-y-3 pt-1">
          {!showRejectBox ? (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading !== ''}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
              >
                {actionLoading === 'approve' ? 'Approving…' : '✓ Approve KYC'}
              </button>
              <button
                onClick={() => setShowRejectBox(true)}
                disabled={actionLoading !== ''}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-semibold py-2.5 rounded-xl transition-all"
              >
                ✕ Reject KYC
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                className="w-full border border-red-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                rows={3}
                placeholder="Enter rejection reason (required)…"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={actionLoading !== '' || !rejectionReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
                >
                  {actionLoading === 'reject' ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => setShowRejectBox(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Already approved — allow re-review ─────────────── */}
      {kycStatus === 'approved' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
            <span className="text-green-600 text-lg">✓</span>
            <p className="text-sm text-green-700 font-medium">KYC documents have been verified and approved.</p>
          </div>
          {!showRejectBox ? (
            <button
              onClick={() => setShowRejectBox(true)}
              className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2"
            >
              Re-review / Revoke approval
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                className="w-full border border-red-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                rows={3}
                placeholder="Enter rejection reason (required)…"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={actionLoading !== '' || !rejectionReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
                >
                  {actionLoading === 'reject' ? 'Revoking…' : 'Revoke Approval'}
                </button>
                <button
                  onClick={() => setShowRejectBox(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Mechanics Page ────────────────────────────────────────────────────────
export default function Mechanics() {
  const [mechanics, setMechanics] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMech, setSelectedMech] = useState(null);
  // 'overview' | 'kyc' | 'history'
  const [activeTab, setActiveTab] = useState('overview');

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
        const updated = {
          isVerified: true,
          kyc: { ...(selectedMech?.kyc || {}), status: 'approved' },
        };
        setMechanics(prev =>
          prev.map(m => (m._id === id ? { ...m, ...updated } : m))
        );
        if (selectedMech && selectedMech._id === id) {
          setSelectedMech(prev => ({ ...prev, ...updated }));
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to verify mechanic.');
    }
  };

  const handleBlockToggle = async (id) => {
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

  // Called by KycPanel after a successful approve/reject
  const handleKycUpdate = (patch) => {
    setSelectedMech(prev => ({ ...prev, ...patch }));
    setMechanics(prev =>
      prev.map(m => (m._id === selectedMech._id ? { ...m, ...patch } : m))
    );
  };

  const openModal = (mech) => {
    setSelectedMech(mech);
    setActiveTab('overview');
  };

  const filteredMechanics = mechanics.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  // KYC status for the table badge
  const kycTableBadge = (mech) => {
    const s = mech.kyc?.status;
    if (s === 'approved') return <span className="text-xs font-bold text-green-600">✓ KYC</span>;
    if (s === 'rejected') return <span className="text-xs font-bold text-red-500">✕ KYC</span>;
    if (mech.kyc?.docUrl) return <span className="text-xs font-bold text-yellow-600">⏳ KYC</span>;
    return <span className="text-xs text-gray-300">—</span>;
  };

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
                <th className="px-6 py-4 text-center">KYC</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredMechanics.map((mech) => (
                <tr
                  key={mech._id}
                  className="hover:bg-gray-50/30 cursor-pointer transition-colors"
                  onClick={() => openModal(mech)}
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
                      {mech.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">{kycTableBadge(mech)}</td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => { openModal(mech); setActiveTab('kyc'); }}
                        className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      >
                        KYC
                      </button>
                      {!mech.isVerified && (
                        <button
                          onClick={() => handleVerify(mech._id)}
                          className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-accent/90"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleBlockToggle(mech._id)}
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
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-400 italic">No mechanics found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mechanic Detail Modal ─────────────────────────────────── */}
      {selectedMech && (
        <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-2xl animate-fade-in relative border border-gray-100 flex flex-col">

            {/* Close btn */}
            <button
              onClick={() => setSelectedMech(null)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 text-xl font-bold z-10"
            >
              ✕
            </button>

            {/* ── Header ── */}
            <div className="px-8 pt-8 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center text-2xl font-bold shrink-0">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
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
                    {selectedMech.isBlocked && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">
                        Blocked
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 mt-0.5 text-sm">{selectedMech.phone}</p>
                </div>
              </div>
            </div>

            {/* ── Tab Bar ── */}
            <div className="flex border-b border-gray-100 px-8 bg-white sticky top-0 z-[5]">
              {[
                { id: 'overview', label: '📋 Overview' },
                { id: 'kyc',      label: '🪪 KYC Documents' },
                { id: 'history',  label: `📁 Job History (${selectedMech.history?.length || 0})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-colors mr-2 ${
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                  {/* Red dot if KYC is pending and has a doc */}
                  {tab.id === 'kyc' && selectedMech.kyc?.status === 'pending' && selectedMech.kyc?.docUrl && (
                    <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full ml-1.5 mb-0.5 align-middle"></span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab Body ── */}
            <div className="px-8 py-6 flex-1">

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Grid stats */}
                  <div className="grid grid-cols-3 gap-4 bg-gray-50 p-5 rounded-2xl">
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
                        {selectedMech.vehicleSpecializations?.join(', ') || 'General'}
                      </span>
                    </div>
                  </div>

                  {/* Bio */}
                  {selectedMech.bio && (
                    <div className="bg-orange-50/30 border border-orange-100 p-4 rounded-xl">
                      <h5 className="text-xs text-accent font-semibold uppercase tracking-wider mb-1">Bio</h5>
                      <p className="text-sm text-gray-700 italic">"{selectedMech.bio}"</p>
                    </div>
                  )}

                  {/* KYC Quick Status */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">KYC Status</p>
                      <KycBadge status={selectedMech.kyc?.status} />
                    </div>
                    <button
                      onClick={() => setActiveTab('kyc')}
                      className="text-xs text-accent font-semibold underline underline-offset-2 hover:text-accent/80"
                    >
                      View KYC Details →
                    </button>
                  </div>

                  {/* Verify / Block actions */}
                  <div className="flex gap-3 pt-2">
                    {!selectedMech.isVerified && (
                      <button
                        onClick={() => handleVerify(selectedMech._id)}
                        className="flex-1 bg-accent hover:bg-accent/95 text-white font-semibold py-2.5 rounded-xl shadow-sm transition-all text-sm"
                      >
                        Approve & Verify Profile
                      </button>
                    )}
                    <button
                      onClick={() => handleBlockToggle(selectedMech._id)}
                      className={`flex-1 font-semibold py-2.5 rounded-xl text-sm border transition-all ${
                        selectedMech.isBlocked
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {selectedMech.isBlocked ? 'Unblock Mechanic' : 'Block Mechanic'}
                    </button>
                  </div>
                </div>
              )}

              {/* KYC Tab */}
              {activeTab === 'kyc' && (
                <KycPanel
                  mech={selectedMech}
                  onUpdate={handleKycUpdate}
                />
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="max-h-[50vh] overflow-y-auto">
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
                        {selectedMech.history?.map(job => (
                          <tr key={job.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-3 text-gray-500">{job.date}</td>
                            <td className="px-5 py-3 font-semibold text-gray-700">{job.issue}</td>
                            <td className="px-5 py-3 text-gray-600">{job.customerName}</td>
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
                        {(!selectedMech.history || selectedMech.history.length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-gray-400 italic">No job history found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
