import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../api/config";
import { toast } from "../context/ToastContext";

function ChangePassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!email || !newPassword || !confirmPassword) {
      toast.warning("Please fill in all required fields.", "Incomplete Fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.warning("New password must be at least 6 characters long.", "Password Too Short");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match. Please verify and try again.", "Password Mismatch");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.put(`${API_BASE_URL}/api/change-password`, { email, newPassword });
      toast.success(res.data.message || "Password updated successfully!", "Success");
      setTimeout(() => { navigate("/login"); }, 1000);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Password update failed. Please try again.",
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
          <div className="md-auth-brand-sub">Password Reset</div>
          <p className="md-auth-tagline">
            Keep your account secure by choosing a strong, unique password for your MindDesk workspace.
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
            <div className="md-auth-title">Reset Password 🔒</div>
            <div className="md-auth-subtitle">Enter your email and create a new password</div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} autoComplete="off" noValidate>
            {/* Dummy hidden inputs to prevent automatic browser autofill */}
            <input type="text" name="fake_cp_email" style={{ display: "none" }} tabIndex="-1" autoComplete="off" />
            <input type="password" name="fake_cp_pw" style={{ display: "none" }} tabIndex="-1" autoComplete="new-password" />

            <div className="md-form-group">
              <label className="md-form-label" htmlFor="cp-email">Email Address</label>
              <div className="md-form-control-icon">
                <i className="bi bi-envelope" />
                <input
                  id="cp-email"
                  name="user_cp_email"
                  type="email"
                  className="md-form-control"
                  placeholder="your@email.com"
                  autoComplete="off"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute("readOnly")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="md-form-group">
              <label className="md-form-label" htmlFor="cp-new">New Password</label>
              <div className="md-form-control-icon">
                <i className="bi bi-key" />
                <input
                  id="cp-new"
                  name="user_cp_new"
                  type={showNew ? "text" : "password"}
                  className="md-form-control"
                  placeholder="Create a new strong password"
                  autoComplete="new-password"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute("readOnly")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight: "46px" }}
                />
                <button
                  type="button"
                  className="md-pw-toggle-btn"
                  onClick={() => setShowNew(!showNew)}
                  title={showNew ? "Hide password" : "Show password"}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showNew ? "bi-eye-slash-fill" : "bi-eye-fill"}`} />
                </button>
              </div>
            </div>

            <div className="md-form-group">
              <label className="md-form-label" htmlFor="cp-confirm">Confirm New Password</label>
              <div className="md-form-control-icon">
                <i className="bi bi-shield-lock" />
                <input
                  id="cp-confirm"
                  name="user_cp_confirm"
                  type={showConfirm ? "text" : "password"}
                  className="md-form-control"
                  placeholder="Repeat the new password"
                  autoComplete="new-password"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute("readOnly")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleChangePassword(); }}
                  style={{ paddingRight: "46px" }}
                />
                <button
                  type="button"
                  className="md-pw-toggle-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                  title={showConfirm ? "Hide password" : "Show password"}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showConfirm ? "bi-eye-slash-fill" : "bi-eye-fill"}`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="md-btn md-btn-primary md-btn-lg"
              style={{ width: "100%", marginTop: "4px", marginBottom: "20px" }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="md-spinner" style={{ width: 18, height: 18 }} />
                  Updating...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle" />
                  Update Password
                </>
              )}
            </button>
          </form>

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