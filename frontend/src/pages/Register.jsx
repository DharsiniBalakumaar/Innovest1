import axios from "axios";
import { useEffect, useRef, useState } from "react";
import "../styles/auth.css";

export default function Register() {
  const [role, setRole] = useState("");
  const [form, setForm] = useState({});
  const [activeStep, setActiveStep] = useState("profile");

  const profileRef = useRef(null);
  const documentsRef = useRef(null);

  // ✅ Only 2 steps for MVP
  const steps = [
    { id: "profile", label: "Profile" },
    { id: "documents", label: "Verification" },
  ];

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm({ ...form, [name]: files ? files[0] : value });
  };

  // Submit form
  const submit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.keys(form).forEach((key) => data.append(key, form[key]));
    data.append("role", role);

    // DEBUG: Check if identityProof is present in the FormData
    for (var pair of data.entries()) {
      console.log(pair[0]+ ', ' + pair[1]); 
    }

    try {
      await axios.post(
        "http://localhost:5000/api/auth/register",
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      alert("Registered successfully. Waiting for admin approval.");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Registration failed";
      alert(errorMsg); 
      console.error(err);
    }
  };

  // Scroll spy
  useEffect(() => {
    const sections = document.querySelectorAll("[data-step]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveStep(entry.target.dataset.step);
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (step) => {
    document
      .querySelector(`[data-step="${step}"]`)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={submit}>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">
          Register as an Innovator or Investor
        </p>

        {/* STEP NAV */}
        {role && (
          <div className="step-bar">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`step ${
                  activeStep === step.id ? "active" : ""
                }`}
                onClick={() => scrollTo(step.id)}
              >
                {step.label}
              </div>
            ))}
          </div>
        )}

        {/* PROFILE */}
        <div ref={profileRef} data-step="profile" className="section-card">
          <h3 className="section-title">Basic Information</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                name="name"
                required
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                required
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                required
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                name="phone"
                required
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>LinkedIn Profile</label>
              <input
                name="linkedin"
                placeholder="https://linkedin.com/in/username"
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Register As</label>
              <select
                required
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">Select Role</option>
                <option value="innovator">Innovator</option>
                <option value="investor">Investor</option>
              </select>
            </div>
          </div>
        </div>

        {/* DOCUMENTS */}
        <div ref={documentsRef} data-step="documents" className="section-card">
          <h3 className="section-title">Identity Verification</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Identity Proof (ID / Aadhaar / Passport)</label>
              <input
                type="file"
                name="identityProof"
                required
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <button className="auth-button" type="submit">
          Submit Registration
        </button>
      </form>
    </div>
  );
}
