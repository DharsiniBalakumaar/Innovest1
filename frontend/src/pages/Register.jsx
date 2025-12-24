import axios from "axios";
import { useEffect, useRef, useState } from "react";
import "../styles/auth.css";

export default function Register() {
  const [role, setRole] = useState("");
  const [form, setForm] = useState({});
  const [activeStep, setActiveStep] = useState("profile");

  // ===== Section refs =====
  const profileRef = useRef(null);
  const innovationRef = useRef(null);
  const businessRef = useRef(null);
  const documentsRef = useRef(null);

  // ===== Step definitions =====
  const innovatorSteps = [
    { id: "profile", label: "Profile" },
    { id: "innovation", label: "Innovation" },
    { id: "business", label: "Business" },
    { id: "documents", label: "Documents" },
  ];

  const investorSteps = [
    { id: "profile", label: "Profile" },
    { id: "preferences", label: "Preferences" },
    { id: "documents", label: "Documents" },
  ];

  const steps =
  role === "innovator"
    ? innovatorSteps
    : role === "investor"
    ? investorSteps
    : [];


  // ===== Handle input =====
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm({ ...form, [name]: files ? files[0] : value });
  };

  // ===== Submit =====
  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(form).forEach((key) => data.append(key, form[key]));
      data.append("role", role);

      await axios.post("http://localhost:5000/api/auth/register", data);
      alert("Registered successfully. Waiting for admin approval.");
    } catch (err) {
      console.error(err);
      alert("Registration failed");
    }
  };

  // ===== Scroll spy =====
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
  }, [role]);

  // ===== Scroll to section =====
  const scrollTo = (step) => {
    document
      .querySelector(`[data-step="${step}"]`)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={submit}>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Register as an Innovator or Investor</p>

        {role && (
  <div className="step-bar">
    {steps.map((step) => (
      <div
        key={step.id}
        className={`step ${activeStep === step.id ? "active" : ""}`}
        onClick={() => scrollTo(step.id)}
      >
        {step.label}
      </div>
    ))}
  </div>
)}


        {/* ===== Profile ===== */}
        <div ref={profileRef} data-step="profile" className="section-card">
          <h3 className="section-title">Profile</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" required onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" required onChange={handleChange} />
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
              <label>Register As</label>
              <select required onChange={(e) => setRole(e.target.value)}>
                <option value="">Select Role</option>
                <option value="innovator">Innovator</option>
                <option value="investor">Investor</option>
              </select>
            </div>
          </div>
        </div>

        {/* ===== Innovator ===== */}
        {role === "innovator" && (
          <>
            <div
              ref={innovationRef}
              data-step="innovation"
              className="section-card"
            >
              <h3 className="section-title">Founder & Innovation</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Contact Number</label>
                  <input name="contactNumber" onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>LinkedIn Profile</label>
                  <input name="linkedin" onChange={handleChange} />
                </div>

                <div className="form-group full">
                  <label>Founder Bio</label>
                  <textarea name="bio" rows="3" onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Innovation Name</label>
                  <input name="innovationName" onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Industry / Sector</label>
                  <input name="sector" onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Current Stage</label>
                  <select name="stage" onChange={handleChange}>
                    <option>Ideation</option>
                    <option>MVP</option>
                    <option>Early Traction</option>
                    <option>Scaling</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Problem Statement</label>
                  <textarea name="problem" rows="3" onChange={handleChange} />
                </div>

                <div className="form-group full">
                  <label>Solution Overview</label>
                  <textarea name="solution" rows="3" onChange={handleChange} />
                </div>
              </div>
            </div>

            <div
              ref={businessRef}
              data-step="business"
              className="section-card"
            >
              <h3 className="section-title">Business & Legal</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Entity Type</label>
                  <input name="entityType" onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>Registration Number</label>
                  <input name="registrationNumber" onChange={handleChange} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== Investor ===== */}
        {role === "investor" && (
          <div
            ref={innovationRef}
            data-step="preferences"
            className="section-card"
          >
            <h3 className="section-title">Investment Preferences</h3>

            <div className="form-grid">
              <div className="form-group">
                <label>Investor Type</label>
                <select name="investorType" onChange={handleChange}>
                  <option>Angel</option>
                  <option>VC Firm</option>
                </select>
              </div>

              <div className="form-group">
                <label>Organization</label>
                <input name="organization" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Average Ticket Size</label>
                <input name="ticketSize" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Annual Investment Capacity</label>
                <input name="annualCapacity" onChange={handleChange} />
              </div>
            </div>
          </div>
        )}

        {/* ===== Documents ===== */}
        <div
          ref={documentsRef}
          data-step="documents"
          className="section-card"
        >
          <h3 className="section-title">KYC & Documents</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Identity Proof</label>
              <input type="file" name="identityProof" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Entity Proof</label>
              <input type="file" name="entityProof" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Pitch Deck</label>
              <input type="file" name="pitchDeck" onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Proof of Concept</label>
              <input type="file" name="poc" onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="action-row">
          <button type="button" className="secondary-button">
            Save as Draft
          </button>
          <button className="auth-button" type="submit">
            Submit Registration
          </button>
        </div>
      </form>
    </div>
  );
}
