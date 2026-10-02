import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../api/config";
import { toast } from "../context/ToastContext";

function ChangePassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      toast.warning("Please fill in all required fields.", "Incomplete Fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match. Please verify and try again.", "Password Mismatch");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.put(`${API_BASE_URL}/api/change-password`, { email, currentPassword, newPassword });
      toast.success(res.data.message || "Password updated successfully!", "Success");
      setTimeout(() => { navigate("/login"); }, 1000);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Password update failed. Please check your current password.",
        "Update Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="md-auth-page">
      <div className="md-auth-container" style={{ maxWidth: 700 }}>
        {/* Left Panel */}
        <div className="md-auth-left" style={{ flex: "0 0 280px" }}>
          <div className="md-auth-brand-icon">🔐</div>
          <div className="md-auth-brand-name">Security</div>
          <div className="md-auth-brand-sub">Password Management</div>
          <p className="md-auth-tagline">
            Keep your account secure by using a strong, unique password that you don't use elsewhere.
          </p>
          <div className="md-auth-features" style={{ marginTop: "20px" }}>
            <div className="md-auth-feature">
              <i className="bi bi-shield-check" />
              Use 8+ characters
            </div>
            <div className="md-auth-feature">
              <i className="bi bi-key" />
              Mix letters, numbers & symbols
            </div>
            <div className="md-auth-feature">
              <i className="bi bi-incognito" />
              Never share your password
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="md-auth-right">
          <div className="md-auth-right-header">
            <div className="md-auth-title">Change Password 🔒</div>
            <div className="md-auth-subtitle">Update your account password securely</div>
          </div>

          <div className="md-form-group">
            <label className="md-form-label" htmlFor="cp-email">Email Address</label>
            <div className="md-form-control-icon">
              <i className="bi bi-envelope" />
              <input
                id="cp-email"
                type="email"
                className="md-form-control"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="md-form-group">
            <label className="md-form-label" htmlFor="cp-current">Current Password</label>
            <div className="md-form-control-icon">
              <i className="bi bi-lock" />
              <input
                id="cp-current"
                type="password"
                className="md-form-control"
                placeholder="Your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="md-form-group">
            <label className="md-form-label" htmlFor="cp-new">New Password</label>
            <div className="md-form-control-icon">
              <i className="bi bi-key" />
              <input
                id="cp-new"
                type="password"
                className="md-form-control"
                placeholder="Create a new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="md-form-group">
            <label className="md-form-label" htmlFor="cp-confirm">Confirm New Password</label>
            <div className="md-form-control-icon">
              <i className="bi bi-shield-lock" />
              <input
                id="cp-confirm"
                type="password"
                className="md-form-control"
                placeholder="Repeat the new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleChangePassword(); }}
              />
            </div>
          </div>

          <button
            className="md-btn md-btn-primary md-btn-lg"
            style={{ width: "100%", marginTop: "4px", marginBottom: "20px" }}
            onClick={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="md-spinner" style={{ width: 18, height: 18 }} />
                Updating...
              </>
            ) : (
              <>
                <i className="bi bi-shield-check" />
                Update Password
              </>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.88rem", color: "var(--md-text-muted)" }}>
            Remember your password?{" "}
            <Link to="/login" className="md-auth-link">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;