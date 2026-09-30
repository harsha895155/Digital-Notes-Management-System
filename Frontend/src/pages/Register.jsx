import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import diary from "./image.png";

function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await axios.post(
       "https://gnapika-backend.onrender.com/api/register",
        {
          fullName,
          email,
          password,
          confirmPassword,
        }
      );

      alert(res.data.message);

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      navigate("/");
    } catch (err) {
      alert(
        err.response?.data?.message || "Registration Failed"
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
          <h2 className="welcome">Create Account</h2>

          <p className="subtitle">
            Start organizing your notes today
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
          >
            Register
          </button>

          <p className="text-center mt-4">
            Already have an account?{" "}
            <Link
              to="/"
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