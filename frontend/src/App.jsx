import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import HomePage from "./pages/HomePage";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PostIdea from "./pages/PostIdea";
import MyIdeas from "./pages/MyIdeas";
import InnovatorDashboard from "./pages/InnovatorDashboard";
import InvestorDashboard from "./pages/InvestorDashboard";
import InnovatorFeedback from "./pages/InnovatorFeedback";
import ForgotPassword from "./pages/ForgotPassword";

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <div className="page-container">
          <Routes>
            <Route path="/"                      element={<HomePage />} />
            <Route path="/login"                 element={<Login />} />
            <Route path="/register"              element={<Register />} />
            <Route path="/dashboard"             element={<Dashboard />} />
            <Route path="/admin/dashboard"       element={<AdminDashboard />} />
            <Route path="/innovator/dashboard"   element={<InnovatorDashboard />} />
            <Route path="/innovator/post-idea"   element={<PostIdea />} />
            <Route path="/innovator/my-ideas"    element={<MyIdeas />} />
            <Route path="/investor/dashboard"    element={<InvestorDashboard />} />
            <Route path="/innovator/feedback"    element={<InnovatorFeedback />} />
            <Route path="/forgot-password"       element={<ForgotPassword />} />

            {/* Redirect stale /investor/* paths to the tab-based dashboard */}
            <Route path="/investor/browse"  element={<Navigate to="/investor/dashboard?tab=browse"  replace />} />
            <Route path="/investor/liked"   element={<Navigate to="/investor/dashboard?tab=liked"   replace />} />
            <Route path="/investor/trust"   element={<Navigate to="/investor/dashboard?tab=trust"   replace />} />

            {/* Catch-all: redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;