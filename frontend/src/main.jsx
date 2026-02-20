import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext"; // ✅ ADD

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
      <AuthProvider>   {/* ✅ WRAP HERE */}
        <App />
      </AuthProvider>
  </React.StrictMode>
);
