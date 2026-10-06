import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/config';
import logo from './logo.png';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Password reset token is missing or invalid.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/reset-password', {
        token,
        newPassword
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ backgroundColor: '#FAF6F0' }}>
      <div className="card shadow-lg border-0 p-4 p-md-5" style={{ maxWidth: '440px', width: '100%', borderRadius: '16px' }}>
        <div className="text-center mb-4">
          <img src={logo} alt="MindDesk" style={{ height: '48px' }} className="mb-2" />
          <h4 className="fw-bold text-dark">Reset Password</h4>
          <p className="text-muted small">Choose a strong new password for your MindDesk account.</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 small mb-3">
            <i className="bi bi-exclamation-triangle me-1"></i> {error}
          </div>
        )}

        {success ? (
          <div className="text-center py-3">
            <div className="mb-3 text-success">
              <i className="bi bi-check-circle-fill" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5 className="fw-bold text-dark mb-2">Password Successfully Changed!</h5>
            <p className="text-muted small mb-4">
              Your password has been updated securely. Redirecting to login in 3 seconds...
            </p>
            <Link to="/login" className="btn btn-primary w-100 py-2 fw-semibold" style={{ backgroundColor: '#8B4513', borderColor: '#8B4513', borderRadius: '8px' }}>
              Login Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {!searchParams.get('token') && (
              <div className="mb-3">
                <label className="form-label fw-semibold text-muted small">Reset Token</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Paste your reset token..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label fw-semibold text-muted small">New Password</label>
              <div className="input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold text-muted small">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
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
                  Updating Password...
                </>
              ) : (
                'Set New Password'
              )}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-decoration-none small text-muted">
                Cancel and return to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
