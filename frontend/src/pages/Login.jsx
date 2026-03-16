import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "../styles/login.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const { login } = useAuth(); 
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        form
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("isLoggedIn", "true");              // ✅ ADD
      localStorage.setItem("role", res.data.user.role);        // ✅ ADD

      login(res.data.user.role, res.data.token, res.data.user); 

      // 🔑 ROLE BASED REDIRECT
      if (res.data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (res.data.user.role === "innovator") {
        navigate("/innovator/dashboard");
      }
      else if (res.data.user.role === "investor") {
        navigate("/investor/dashboard");
      }else
      {
        navigate("/dashboard");
      }

    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Login</h2>
        <p className="login-subtitle">Access your Innovest account</p>

        <form onSubmit={handleSubmit}>
          <div className="login-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="login-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button className="login-button" type="submit">
            Login
          </button>
        </form>
        {/* 🔗 NEW LINKS ADDED HERE */}
        <div className="login-footer">
          {/*<Link to="/forgot-password" title="Recover Account">Forgot Password?</Link>*/}
          <span>
            Don't have an account? <Link to="/register" title="Join Innovest">Register here</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
