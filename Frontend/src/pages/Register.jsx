import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../api/config";
import { toast } from "../context/ToastContext";

function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      toast.warning("Please fill in all fields before registering.", "Incomplete Form");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please check and try again.", "Password Mismatch");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/register`, { fullName, email, password, confirmPassword });
      toast.success(res.data.message || "Registration Successful!", "Account Created");
      setFullName(""); setEmail(""); setPassword(""); setConfirmPassword("");
      setTimeout(() => { navigate("/login"); }, 1000);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Unable to complete registration.",
        "Registration Failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="md-auth-page">
      <div className="md-auth-container">
        {/* Left Panel */}
        <div className="md-auth-left">
          <div className="md-auth-brand-icon">📓</div>
          <div className="md-auth-brand-name">MindDesk</div>
          <div className="md-auth-brand-sub">Digital Notes System</div>
          <p className="md-auth-tagline">
            Join thousands of users who organize their ideas and boost productivity with MindDesk.
          </p>
          <div className="md-auth-features">
            <div className="md-auth-feature">
              <i className="bi bi-journal-text" />
              Organize notes in folders
            </div>
            <div className="md-auth-feature">
              <i className="bi bi-alarm" />
              Track deadlines effortlessly
            </div>
            <div className="md-auth-feature">
              <i className="bi bi-cloud-upload" />
              Attach files to notes & tasks
            </div>
            <div className="md-auth-feature">
              <i className="bi bi-shield-check" />
              Secure with JWT authentication
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="md-auth-right">
          <div className="md-auth-right-header">
            <div className="md-auth-title">Create account ✨</div>
            <div className="md-auth-subtitle">Start organizing your notes for free</div>
          </div>

          <div className="md-form-group">
            <label className="md-form-label" htmlFor="reg-name">Full Name</label>
            <div className="md-form-control-icon">
              <i className="bi bi-person" />
              <input
                id="reg-name"
                type="text"
                className="md-form-control"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="md-form-group">
            <label className="md-form-label" htmlFor="reg-email">Email address</label>
            <div className="md-form-control-icon">
              <i className="bi bi-envelope" />
              <input
                id="reg-email"
                type="email"
                className="md-form-control"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="md-form-group">
            <label className="md-form-label" htmlFor="reg-pw">Password</label>
            <div className="md-form-control-icon">
              <i className="bi bi-lock" />
              <input
                id="reg-pw"
                type="password"
                className="md-form-control"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="md-form-group">
            <label className="md-form-label" htmlFor="reg-cpw">Confirm Password</label>
            <div className="md-form-control-icon">
              <i className="bi bi-shield-lock" />
              <input
                id="reg-cpw"
                type="password"
                className="md-form-control"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRegister(); }}
              />
            </div>
          </div>

          <button
            className="md-btn md-btn-primary md-btn-lg"
            style={{ width: "100%", marginTop: "4px", marginBottom: "20px" }}
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="md-spinner" style={{ width: 18, height: 18 }} />
                Creating Account...
              </>
            ) : (
              <>
                <i className="bi bi-person-plus" />
                Create Account
              </>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.88rem", color: "var(--md-text-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" className="md-auth-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;