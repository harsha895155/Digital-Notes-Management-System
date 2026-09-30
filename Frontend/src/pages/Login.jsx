import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import diary from "./image.png";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill all fields");
      return;
    }

    try {
      const res = await axios.post(
        "https://gnapika-backend.onrender.com/api/login",
        {
          email,
          password,
        }
      );

      alert(res.data.message);

     localStorage.setItem(
  "token",
  res.data.token
);

localStorage.setItem(
  "user",
  JSON.stringify(res.data.user)
);

localStorage.setItem(
  "loginTime",
  Date.now()
);


      navigate("/dashboard");
    } catch (err) {
      alert(
        err.response?.data?.message || "Login Failed"
      );
    }
  };

  return (
    <div className="login-bg d-flex justify-content-center align-items-center">
      <div className="login-card">

        <div className="top-section">
          <img
            src={diary}
            alt="Diary"
            className="diary-img"
          />
        </div>

        <div className="form-section">
          <h2 className="welcome">Welcome Back!</h2>

          <p className="subtitle">
            Login to continue your notes
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

            <span className="input-group-text bg-transparent border-0">
              <i className="bi bi-eye"></i>
            </span>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4 small">

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="remember"
              />

              <label
                className="form-check-label"
                htmlFor="remember"
              >
                Remember Me
              </label>
            </div>

            <Link
              to="/change-password"
              className="forgot-link text-decoration-none"
            >
              Forgot Password?
            </Link>

          </div>

          <button
            className="btn login-btn w-100"
            onClick={handleLogin}
          >
            Login
          </button>

          <p className="text-center mt-4">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="signup text-decoration-none"
            >
              Sign Up
            </Link>
          </p>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <div className="social-icons">

            <button className="social-btn">
              <i className="bi bi-google"></i>
            </button>

            <button className="social-btn">
              <i className="bi bi-apple"></i>
            </button>

            <button className="social-btn">
              <i className="bi bi-facebook"></i>
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;