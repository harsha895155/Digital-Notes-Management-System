import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../api/config";
import { toast } from "../context/ToastContext";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.warning("Please enter your email and password.", "Missing Credentials");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/login`, { email, password });
      toast.success(res.data.message || "Welcome back!", "Login Successful");
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("loginTime", Date.now());
      setTimeout(() => { navigate("/dashboard"); }, 700);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Unable to log in. Please verify your credentials.",
        "Login Failed"
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
            Capture every idea, organize your knowledge, and never miss a deadline.
          </p>
          <div className="md-auth-features">
            <div className="md-auth-feature">
              <i className="bi bi-journal-text" />
              Smart Notes with Categories
            </div>
            <div className="md-auth-feature">
              <i className="bi bi-check2-square" />
              Daily To-Do List
            </div>
            <div className="md-auth-feature">
              <i className="bi bi-calendar3" />
              Deadline Calendar
            </div>
            <div className="md-auth-feature">
              <i className="bi bi-paperclip" />
              File Attachments
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="md-auth-right">
          <div className="md-auth-right-header">
            <div className="md-auth-title">Welcome back 👋</div>
            <div className="md-auth-subtitle">Sign in to continue to your workspace</div>
          </div>

          {/* Email */}
          <div className="md-form-group">
            <label className="md-form-label" htmlFor="login-email">Email address</label>
            <div className="md-form-control-icon">
              <i className="bi bi-envelope" />
              <input
                id="login-email"
                type="email"
                className="md-form-control"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="md-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label className="md-form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/change-password" className="md-auth-link" style={{ fontSize: "0.8rem" }}>
                Forgot password?
              </Link>
            </div>
            <div className="md-form-control-icon" style={{ position: "relative" }}>
              <i className="bi bi-lock" />
              <input
                id="login-password"
                type={showPw ? "text" : "password"}
                className="md-form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                style={{ paddingRight: "42px" }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "var(--md-text-muted)", padding: "0"
                }}
              >
                <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            className="md-btn md-btn-primary md-btn-lg"
            style={{ width: "100%", marginTop: "8px", marginBottom: "20px" }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="md-spinner" style={{ width: 18, height: 18 }} />
                Signing in...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right" />
                Sign In
              </>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.88rem", color: "var(--md-text-muted)" }}>
            Don't have an account?{" "}
            <Link to="/register" className="md-auth-link">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;