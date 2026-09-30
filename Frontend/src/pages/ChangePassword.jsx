import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import diary from "./pswd.png";

function ChangePassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async () => {
    if (
      !email ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      alert("Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await axios.put(
        "https://gnapika-backend.onrender.com/api/change-password",
        {
          email,
          currentPassword,
          newPassword,
        }
      );

      alert(res.data.message);

      navigate("/");
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Password update failed"
      );
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
          <h2 className="welcome">Change Password</h2>

          <p className="subtitle">
            Update your account password securely
          </p>

          <div className="input-group custom-input mb-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-envelope"></i>
            </span>

            <input
              type="email"
              className="form-control border-0"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group custom-input mb-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-lock"></i>
            </span>

            <input
              type="password"
              className="form-control border-0"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) =>
                setCurrentPassword(e.target.value)
              }
            />
          </div>

          <div className="input-group custom-input mb-3">
            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-key"></i>
            </span>

            <input
              type="password"
              className="form-control border-0"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
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
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
            />
          </div>

          <button
            className="btn login-btn w-100"
            onClick={handleChangePassword}
          >
            Update Password
          </button>

          <p className="text-center mt-4">
            Remember your password?{" "}
            <Link
              to="/"
              className="signup-link text-decoration-none"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;