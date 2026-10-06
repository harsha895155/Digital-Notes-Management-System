import React, { useState } from 'react';
import api from '../api/config';

export default function AISummaryModal({ show, onClose, noteTitle, noteContent, onApplySummary }) {
  const [summaryType, setSummaryType] = useState('key_points');
  const [loading, setLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState('');
  const [error, setError] = useState('');

  if (!show) return null;

  const handleGenerate = async () => {
    if (!noteContent || noteContent.trim() === '' || noteContent === '<p></p>') {
      setError('Please add some content to your note before generating an AI summary.');
      return;
    }

    setLoading(true);
    setError('');
    setSummaryResult('');

    try {
      const res = await api.post('/api/ai/summarize', {
        content: noteContent,
        type: summaryType
      });
      if (res.data && res.data.summary) {
        setSummaryResult(res.data.summary);
      } else {
        setError('No summary could be generated.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate summary. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (summaryResult && onApplySummary) {
      onApplySummary(summaryResult);
      onClose();
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
                <i className="bi bi-stars me-1 text-warning"></i> AI Assistant
              </span>
              <h5 className="modal-title fw-bold mb-0" style={{ color: '#24160F' }}>
                Summarize: {noteTitle || 'Untitled Note'}
              </h5>
            </div>
            <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
          </div>

          <div className="modal-body p-4" style={{ backgroundColor: '#FAF6F0' }}>
            {/* Privacy Notice - Phase 16 requirement */}
            <div className="alert alert-light border d-flex align-items-start gap-2 mb-3 py-2 px-3" style={{ fontSize: '0.85rem', color: '#6A584D', borderColor: '#E8DFD8' }}>
              <i className="bi bi-shield-check text-primary fs-5 mt-n1"></i>
              <div>
                <strong>Privacy Notice:</strong> AI summary uses an external AI service. Your note content is processed securely only upon your explicit request and is not stored permanently.
              </div>
            </div>

            {/* Summary Format Selector */}
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ color: '#4A3B32', fontSize: '0.9rem' }}>
                Choose Summary Format:
              </label>
              <div className="d-flex flex-wrap gap-2">
                {[
                  { id: 'short', label: 'Short Summary', icon: 'bi-lightning' },
                  { id: 'detailed', label: 'Detailed Summary', icon: 'bi-file-text' },
                  { id: 'key_points', label: 'Key Points', icon: 'bi-list-stars' },
                  { id: 'action_items', label: 'Action Items', icon: 'bi-check2-square' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`btn btn-sm ${summaryType === item.id ? 'btn-dark' : 'btn-outline-secondary'}`}
                    style={{
                      borderRadius: '8px',
                      backgroundColor: summaryType === item.id ? '#4A3B32' : 'transparent',
                      borderColor: '#4A3B32',
                      color: summaryType === item.id ? '#FFF' : '#4A3B32'
                    }}
                    onClick={() => setSummaryType(item.id)}
                    disabled={loading}
                  >
                    <i className={`bi ${item.icon} me-1`}></i>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 small mb-3">
                <i className="bi bi-exclamation-triangle me-1"></i> {error}
              </div>
            )}

            {/* Output Display */}
            {loading ? (
              <div className="p-4 text-center rounded border bg-white my-3">
                <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                <div className="fw-medium text-muted">✨ Generating summary with AI...</div>
              </div>
            ) : summaryResult ? (
              <div className="p-3 rounded border bg-white my-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-1">
                  <span className="small text-muted fw-bold text-uppercase">Generated Result</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={() => navigator.clipboard.writeText(summaryResult)}
                    title="Copy to clipboard"
                  >
                    <i className="bi bi-clipboard me-1"></i> Copy
                  </button>
                </div>
                <div style={{ whiteSpace: 'pre-line', fontSize: '0.92rem', color: '#24160F' }}>
                  {summaryResult}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 pt-0" style={{ backgroundColor: '#FAF6F0' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-warning btn-sm fw-semibold text-dark"
              onClick={handleGenerate}
              disabled={loading}
            >
              <i className="bi bi-stars me-1"></i> {summaryResult ? 'Regenerate' : 'Generate Summary'}
            </button>
            {summaryResult && (
              <button
                type="button"
                className="btn btn-primary btn-sm fw-semibold"
                style={{ backgroundColor: '#8B4513', borderColor: '#8B4513' }}
                onClick={handleApply}
              >
                <i className="bi bi-box-arrow-in-down me-1"></i> Append to Note
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
