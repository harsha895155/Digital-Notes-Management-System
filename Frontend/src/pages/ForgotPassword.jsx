import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/config';
import logo from './logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetLinkDemo, setResetLinkDemo] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
      // In development mode, backend returns resetUrl for quick testing
      if (res.data && res.data.resetUrl) {
        setResetLinkDemo(res.data.resetUrl);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ backgroundColor: '#FAF6F0' }}>
      <div className="card shadow-lg border-0 p-4 p-md-5" style={{ maxWidth: '440px', width: '100%', borderRadius: '16px' }}>
        <div className="text-center mb-4">
          <img src={logo} alt="MindDesk" style={{ height: '48px' }} className="mb-2" />
          <h4 className="fw-bold text-dark">Password Recovery</h4>
          <p className="text-muted small">
            Enter your account email and we'll send you instructions to reset your password.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 small mb-3">
            <i className="bi bi-exclamation-triangle me-1"></i> {error}
          </div>
        )}

        {submitted ? (
          <div className="text-center py-3">
            <div className="mb-3 text-success">
              <i className="bi bi-envelope-check-fill" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5 className="fw-bold text-dark mb-2">Check Your Email</h5>
            <p className="text-muted small mb-4">
              If an account with that email exists, we have sent instructions to reset your password. The link will expire in 1 hour.
            </p>

            {resetLinkDemo && (
              <div className="alert alert-warning text-start small p-3 mb-3">
                <strong>Development Reset Link:</strong>
                <div className="text-truncate my-1">
                  <a href={resetLinkDemo} className="text-primary text-break small">
                    {resetLinkDemo}
                  </a>
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  (This link is provided in development when an email provider is not configured).
                </div>
              </div>
            )}

            <Link to="/login" className="btn btn-outline-dark w-100 py-2 fw-semibold" style={{ borderRadius: '8px' }}>
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label fw-semibold text-muted small">Email Address</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-envelope text-muted"></i>
                </span>
                <input
                  type="email"
                  className="form-control border-start-0"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-semibold mb-3"
              style={{ backgroundColor: '#8B4513', borderColor: '#8B4513', borderRadius: '8px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Instructions'
              )}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-decoration-none small text-muted">
                <i className="bi bi-arrow-left me-1"></i> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
