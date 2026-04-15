import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/navbar.css";

// ── Polls unread message count every 15s ──
function UnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const check = async () => {
      try {
        const r = await axios.get("http://localhost:5000/api/messages/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCount(r.data.count);
      } catch {}
    };

    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);

  if (count === 0) return null;

  return (
    <span style={{
      background: "#6c5ce7",
      color: "#fff",
      borderRadius: "50%",
      width: "18px",
      height: "18px",
      fontSize: "10px",
      fontWeight: "700",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: "4px",
      verticalAlign: "middle",
    }}>
      {count}
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const investorLinks = [
    { to: "/investor/dashboard?tab=dashboard", label: "Dashboard",    tab: "dashboard" },
    { to: "/investor/dashboard?tab=browse",    label: "Browse Ideas", tab: "browse"    },
    { to: "/investor/dashboard?tab=liked",     label: "Watchlist",    tab: "liked"     },
    { to: "/investor/dashboard?tab=trust",     label: "Why Innovest", tab: "trust"     },
  ];

  const innovatorLinks = [
    { to: "/innovator/dashboard",  label: "My Dashboard" },
    { to: "/innovator/post-idea",  label: "Post Idea"    },
    { to: "/innovator/my-ideas",   label: "My Ideas"     },
  ];

  const links =
    user?.role === "investor"  ? investorLinks  :
    user?.role === "innovator" ? innovatorLinks :
    [];

  const currentTab = new URLSearchParams(location.search).get("tab") || "dashboard";

  const isActive = (link) => {
    const basePath = link.to.split("?")[0];
    if (link.tab) {
      return location.pathname === basePath && currentTab === link.tab;
    }
    return location.pathname === basePath;
  };

  const isMessagesActive = location.pathname === "/messages";

  return (
    <nav className="navbar-unified">
      {/* LEFT */}
      <div className="nav-left">
        <div className="nav-logo-icon" />
        <Link to="/" className="navbar-logo">Innovest</Link>
        {user && <span className="portal-badge">{user.role} Portal</span>}
      </div>

      {/* CENTER */}
      <div className="nav-center">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${isActive(link) ? "active" : ""}`}
          >
            {link.label}
          </Link>
        ))}

        {/* Messages link — shown for both roles when logged in */}
        {user && (
          <Link
            to="/messages"
            className={`nav-link ${isMessagesActive ? "active" : ""}`}
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            💬 Messages
            <UnreadBadge />
          </Link>
        )}
      </div>

      {/* RIGHT */}
      <div className="nav-right">
        {user ? (
          <>
            <div className="nav-divider" />
            <span className="user-name">👤 {user.name}</span>
            <button onClick={handleLogout} className="logout-btn-unified">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-link">Login</Link>
        )}
      </div>
    </nav>
  );
}