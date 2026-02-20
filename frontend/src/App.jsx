import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />

        <div className="page-container">
          <Routes>
            {/* Homepage */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/innovator/dashboard" element={<InnovatorDashboard/>}/>
            <Route path="/innovator/post-idea" element={<PostIdea />} />
            <Route path="/investor/dashboard" element={<InvestorDashboard/>}/>
            <Route path="/innovator/my-ideas" element={<MyIdeas />} />
            {/* <Route path="/admin" element={<AdminDashboard />} /> */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
