import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import diary from "./image.png";
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
      const res = await axios.post(
       `${API_BASE_URL}/api/register`,
        {
          fullName,
          email,
          password,
          confirmPassword,
        }
      );

      toast.success(res.data.message || "Registration Successful!", "Account Created");

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
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
    <div className="login-bg d-flex justify-content-center align-items-center">
      <div className="login-card">
        <div
          className="top-section"
          style={{
            background:
              "linear-gradient(135deg, #f7f2eb 0%, #efe3d5 50%, #f5ece3 100%)",
          }}
        >
          <img
            src={diary}
            alt="Diary"
            className="diary-img"
          />
        </div>

        <div className="form-section">
          <div className="text-center mb-2">
            <span className="badge rounded-pill" style={{ background: '#f5ede4', color: '#5c4033', padding: '6px 14px', fontSize: '0.82rem', letterSpacing: '0.04em' }}>
              <i className="bi bi-journal-text me-1 text-warning"></i> MindDesk
            </span>
          </div>

          <h2 className="welcome">Create Account</h2>

          <p className="subtitle">
            Start organizing your notes today with MindDesk
          </p>

          <div className="input-group custom-input mb-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-person"></i>
            </span>

            <input
              type="text"
              className="form-control border-0"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
            />
          </div>

          <div className="input-group custom-input mb-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-envelope"></i>
            </span>

            <input
              type="email"
              className="form-control border-0"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </div>

          <div className="input-group custom-input mb-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-lock"></i>
            </span>

            <input
              type="password"
              className="form-control border-0"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          <div className="input-group custom-input mb-4">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-shield-lock"></i>
            </span>

            <input
              type="password"
              className="form-control border-0"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />
          </div>

          <button
            className="btn login-btn w-100"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <span>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating Account...
              </span>
            ) : (
              "Register"
            )}
          </button>

          <p className="text-center mt-4">
            Already have an account?{" "}
            <Link
              to="/login"
              className="signup-link text-decoration-none"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;