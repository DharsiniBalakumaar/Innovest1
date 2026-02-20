import axios from "axios";
import { useState } from "react";

export default function InnovatorDashboard() {
  const [form, setForm] = useState({
    title: "",
    domain: "",
    problem: "",
    solution: "",
    market: "",
    revenue: "",
    stage: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.domain || !form.title) {
      alert("Please fill required fields");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/innovator/upload-idea",
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Idea submitted successfully 🚀");
      setForm({
        title: "",
        domain: "",
        problem: "",
        solution: "",
        market: "",
        revenue: "",
        stage: "",
      });
    } catch (err) {
      // FIX: Look for the message sent by the server
      if (err.response && err.response.data && err.response.data.message) {
    const similarity = err.response.data.similarity;
    const similarityPercent = similarity ? (similarity * 100).toFixed(1) : null;
    
    const message = similarityPercent
      ? `${err.response.data.message}\n\nSimilarity Score: ${similarityPercent}%`
      : err.response.data.message;
    
    alert(message);
  } else {
    alert("Idea cannot be uploaded");
  }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Innovator Dashboard</h1>
        <p style={styles.subtext}>
          Share your idea and let investors discover its potential.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* IDEA TITLE */}
          <div>
            <label style={styles.label}>Idea Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Eg: AI-based Credit Scoring Platform"
              style={styles.input}
              required
            />
          </div>

          {/* DOMAIN */}
          <div>
            <label style={styles.label}>Domain *</label>
            <select
              name="domain"
              value={form.domain}
              onChange={handleChange}
              style={styles.input}
              required
            >
              <option value="">Select Domain</option>
              <option value="AI">AI</option>
              <option value="Fintech">Fintech</option>
              <option value="Edtech">Edtech</option>
              <option value="Healthcare">Healthcare</option>
            </select>
          </div>

          {/* PROBLEM */}
          <div>
            <label style={styles.label}>Problem Statement</label>
            <textarea
              name="problem"
              value={form.problem}
              onChange={handleChange}
              placeholder="What problem are you solving?"
              style={styles.textarea}
            />
          </div>

          {/* SOLUTION */}
          <div>
            <label style={styles.label}>Proposed Solution</label>
            <textarea
              name="solution"
              value={form.solution}
              onChange={handleChange}
              placeholder="How does your idea solve the problem?"
              style={styles.textarea}
            />
          </div>

          {/* MARKET */}
          <div>
            <label style={styles.label}>Target Market</label>
            <input
              name="market"
              value={form.market}
              onChange={handleChange}
              placeholder="Eg: SMEs, Students, Rural users"
              style={styles.input}
            />
          </div>

          {/* REVENUE */}
          <div>
            <label style={styles.label}>Revenue Model</label>
            <input
              name="revenue"
              value={form.revenue}
              onChange={handleChange}
              placeholder="Subscription, Commission, Ads, etc."
              style={styles.input}
            />
          </div>

          {/* STAGE */}
          <div>
            <label style={styles.label}>Current Stage</label>
            <select
              name="stage"
              value={form.stage}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">Select Stage</option>
              <option value="Idea">Idea</option>
              <option value="Prototype">Prototype</option>
              <option value="MVP">MVP</option>
              <option value="Live">Live Product</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Submitting..." : "Submit Idea"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "2rem",
  },
  card: {
    background: "#fff",
    padding: "2rem",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "700px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  heading: {
    fontSize: "26px",
    fontWeight: "700",
  },
  subtext: {
    color: "#666",
    marginBottom: "1.5rem",
  },
  form: {
    display: "grid",
    gap: "1.2rem",
  },
  label: {
    fontWeight: "600",
    marginBottom: "6px",
    display: "block",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    minHeight: "90px",
    resize: "vertical",
  },
  button: {
    padding: "14px",
    background: "#0066ff",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "10px",
  },
};
