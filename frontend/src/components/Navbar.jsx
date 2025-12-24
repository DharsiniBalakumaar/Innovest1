import { Link, useLocation } from "react-router-dom";
import "../styles/navbar.css";

export default function Navbar() {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      {/* Left: Brand */}
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          Innovest
        </Link>
      </div>

      {/* Right: Links */}
      <div className="navbar-links">
        <Link to="/login" className={isActive("/login")}>
          Login
        </Link>
        <Link to="/register" className={isActive("/register")}>
          Register
        </Link>
      </div>
    </nav>
  );
}
