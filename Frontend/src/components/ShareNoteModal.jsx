import React, { useState } from 'react';
import api from '../api/config';

export default function ShareNoteModal({ show, onClose, note, onShareUpdated }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!show || !note) return null;

  const currentShares = note.shares || [];
  const currentActivity = note.activity || [];

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid user email.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/api/shares/${note._id}`, { email, permission });
      setSuccess(`Successfully shared note with ${email} as ${permission}!`);
      setEmail('');
      if (onShareUpdated && res.data.note) {
        onShareUpdated(res.data.note);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share note.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (targetEmail) => {
    if (!window.confirm(`Revoke access for ${targetEmail}?`)) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.delete(`/api/shares/${note._id}/${encodeURIComponent(targetEmail)}`);
      setSuccess(`Revoked access for ${targetEmail}.`);
      if (onShareUpdated && res.data.note) {
        onShareUpdated(res.data.note);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke access.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          {/* Header */}
          <div className="modal-header border-0 pb-0" style={{ backgroundColor: '#FAF6F0' }}>
            <div className="d-flex align-items-center gap-2">
              <span className="badge rounded-pill px-3 py-2" style={{ backgroundColor: '#4A3B32', color: '#FFF' }}>
                <i className="bi bi-people me-1"></i> Note Collaboration
              </span>
              <h5 className="modal-title fw-bold mb-0" style={{ color: '#24160F' }}>
                Share: {note.title}
              </h5>
            </div>
            <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
          </div>

          <div className="modal-body p-4" style={{ backgroundColor: '#FAF6F0' }}>
            {error && (
              <div className="alert alert-danger py-2 px-3 small mb-3">
                <i className="bi bi-exclamation-triangle me-1"></i> {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success py-2 px-3 small mb-3">
                <i className="bi bi-check-circle me-1"></i> {success}
              </div>
            )}

            {/* Share Form */}
            <form onSubmit={handleShare} className="mb-4">
              <label className="form-label fw-semibold small text-muted text-uppercase mb-2">
                Invite Collaborator
              </label>
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter collaborator email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    style={{ borderRadius: '8px' }}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <select
                    className="form-select"
                    value={permission}
                    onChange={(e) => setPermission(e.target.value)}
                    disabled={loading}
                    style={{ borderRadius: '8px' }}
                  >
                    <option value="viewer">Viewer (Read-only)</option>
                    <option value="editor">Editor (Can edit)</option>
                  </select>
                </div>
                <div className="col-6 col-md-3">
                  <button
                    type="submit"
                    className="btn btn-primary w-100 fw-semibold"
                    style={{ backgroundColor: '#8B4513', borderColor: '#8B4513', borderRadius: '8px' }}
                    disabled={loading}
                  >
                    {loading ? 'Sharing...' : 'Share Note'}
                  </button>
                </div>
              </div>
            </form>

            {/* Collaborators List */}
            <div className="mb-4">
              <label className="form-label fw-semibold small text-muted text-uppercase mb-2">
                People with Access ({currentShares.length + 1})
              </label>
              <div className="list-group shadow-sm border-0" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                {/* Note Owner */}
                <div className="list-group-item d-flex justify-content-between align-items-center py-2 px-3 bg-white">
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                      <i className="bi bi-person-fill"></i>
                    </div>
                    <div>
                      <div className="fw-semibold small">{note.userEmail}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Owner</div>
                    </div>
                  </div>
                  <span className="badge bg-secondary-subtle text-secondary border">Owner</span>
                </div>

                {/* Collaborators */}
                {currentShares.map((share, idx) => (
                  <div key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3 bg-white">
                    <div className="d-flex align-items-center gap-2">
                      <div className="avatar rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                        {share.userEmail.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="fw-semibold small">{share.userEmail}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Role: <span className="text-capitalize">{share.permission}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm py-1 px-2"
                      style={{ fontSize: '0.8rem' }}
                      onClick={() => handleRevoke(share.userEmail)}
                      disabled={loading}
                    >
                      <i className="bi bi-trash me-1"></i> Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity History */}
            {currentActivity.length > 0 && (
              <div>
                <label className="form-label fw-semibold small text-muted text-uppercase mb-2">
                  Recent Note Activity
                </label>
                <div className="bg-white p-3 rounded border" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  <ul className="list-unstyled mb-0" style={{ fontSize: '0.85rem' }}>
                    {currentActivity.slice(-10).reverse().map((act, i) => (
                      <li key={i} className="mb-2 d-flex align-items-baseline gap-2">
                        <i className="bi bi-clock-history text-muted"></i>
                        <div>
                          <strong>{act.userEmail}</strong>: {act.action}
                          <span className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>
                            {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 pt-0" style={{ backgroundColor: '#FAF6F0' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
