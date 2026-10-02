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
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
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

          <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} autoComplete="off" noValidate>
            {/* Dummy hidden inputs to prevent automatic browser autofill */}
            <input type="text" name="fake_reg_email" style={{ display: "none" }} tabIndex="-1" autoComplete="off" />
            <input type="password" name="fake_reg_pw" style={{ display: "none" }} tabIndex="-1" autoComplete="new-password" />

            <div className="md-form-group">
              <label className="md-form-label" htmlFor="reg-name">Full Name</label>
              <div className="md-form-control-icon">
                <i className="bi bi-person" />
                <input
                  id="reg-name"
                  name="user_reg_fullname"
                  type="text"
                  className="md-form-control"
                  placeholder="John Doe"
                  autoComplete="off"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute("readOnly")}
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
                  name="user_reg_email"
                  type="email"
                  className="md-form-control"
                  placeholder="you@example.com"
                  autoComplete="off"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute("readOnly")}
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
                  name="user_reg_password"
                  type={showPw ? "text" : "password"}
                  className="md-form-control"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute("readOnly")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: "46px" }}
                />
                <button
                  type="button"
                  className="md-pw-toggle-btn"
                  onClick={() => setShowPw(!showPw)}
                  title={showPw ? "Hide password" : "Show password"}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showPw ? "bi-eye-slash-fill" : "bi-eye-fill"}`} />
                </button>
              </div>
            </div>

            <div className="md-form-group">
              <label className="md-form-label" htmlFor="reg-cpw">Confirm Password</label>
              <div className="md-form-control-icon">
                <i className="bi bi-shield-lock" />
                <input
                  id="reg-cpw"
                  name="user_reg_cpassword"
                  type={showCpw ? "text" : "password"}
                  className="md-form-control"
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute("readOnly")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRegister(); }}
                  style={{ paddingRight: "46px" }}
                />
                <button
                  type="button"
                  className="md-pw-toggle-btn"
                  onClick={() => setShowCpw(!showCpw)}
                  title={showCpw ? "Hide password" : "Show password"}
                  aria-label={showCpw ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showCpw ? "bi-eye-slash-fill" : "bi-eye-fill"}`} />
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
                  Creating Account...
                </>
              ) : (
                <>
                  <i className="bi bi-person-check" />
                  Create Account
                </>
              )}
            </button>
          </form>

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