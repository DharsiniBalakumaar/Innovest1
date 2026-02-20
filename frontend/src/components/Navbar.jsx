import { useAuth } from "../AuthContext";
import { useLocation, Link } from "react-router-dom";
import "../styles/navbar.css"; // Or the name of your stylesheet

export default function Navbar() {
  const { isLoggedIn, role, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">Innovest</Link>

      <div className="navbar-links">
        {!isLoggedIn && (
          <>
            <Link to="/login" className={isActive("/login")}>Login</Link>
            <Link to="/register" className={isActive("/register")}>Register</Link>
          </>
        )}

        {isLoggedIn && role === "innovator" && (
          <>
          {isLoggedIn && role === "innovator" && (
            <>
            {/* Add className={isActive(...)} to EVERY link below */}
            <Link to="/innovator/dashboard" className={isActive("/innovator/dashboard")}>Home</Link>
            <Link to="/innovator/my-ideas" className={isActive("/innovator/my-ideas")}>My Ideas</Link>
            <Link to="/innovator/post-idea" className={isActive("/innovator/post-idea")}>Post Idea</Link>
            <Link to="/innovator/feedback" className={isActive("/innovator/feedback")}>Feedback</Link>
            <button onClick={logout}>Logout</button>
            </>
          )}
          </>
        )}
        {/* ✅ ADD THIS: SHOW FOR LOGGED IN INVESTORS */}
        {isLoggedIn && role === "investor" && (
          <>
            <Link to="/investor/dashboard" className={isActive("/investor/dashboard")}>Home</Link>
            <Link to="/investor/browse-ideas" className={isActive("/investor/browse-ideas")}>Browse Ideas</Link>
            <button className="nav-link" onClick={logout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
