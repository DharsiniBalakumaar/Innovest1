// AuthContext.jsx
import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);

  const login = (userRole, token, userData) => {
    setIsLoggedIn(true);
    setRole(userRole);
    localStorage.setItem("token", token);
    localStorage.setItem("role", userRole);
    localStorage.setItem("isLoggedIn", "true");
  };

  // ✅ YOU WERE MISSING THIS FUNCTION:
  const logout = () => {
    setIsLoggedIn(false);
    setRole(null);
    localStorage.clear();
    window.location.href = "/login"; // Redirect on logout
  };

  return (
    // Make sure logout is included in the value object below
    <AuthContext.Provider value={{ isLoggedIn, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);