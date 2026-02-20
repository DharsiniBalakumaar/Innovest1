import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/myideas.css";

export default function MyIdeas() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(null);

  // AI Analysis state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState(null);
  // 1. Add these states at the top
const [aiLoading, setAiLoading] = useState(false);
const [analysisData, setAnalysisData] = useState(null);

  // ---------------- FETCH IDEAS ----------------
  const fetchIdeas = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "http://localhost:5000/api/innovator/my-ideas",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIdeas(res.data);
    } catch (err) {
      console.error("Failed to fetch ideas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  // ---------------- EDIT HANDLERS ----------------
  const handleEditClick = (idea) => {
    setForm({ ...idea });
    setIsEditing(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/innovator/update-idea/${form._id}`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Idea updated successfully ✨");
      setIsEditing(false);
      setForm(null);
      fetchIdeas();
    } catch (err) {
      alert("Failed to update idea");
    }
  };

  // ---------------- AI ANALYSIS HANDLER ----------------
  const handleViewAnalysis = async (idea) => {
  setSelectedIdea(idea);
  setShowAnalysis(true);
  setAiLoading(true);
  setAnalysisData(null); // Clear previous results

  try {
    const token = localStorage.getItem("token");
    // This calls your Node.js route which talks to the Python FastAPI
    const res = await axios.post(
      "http://localhost:5000/api/innovator/analyze-idea",
      { ideaId: idea._id },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setAnalysisData(res.data);
  } catch (err) {
    console.error("AI Analysis failed:", err);
    alert("AI service is currently offline. Please try again later.");
  } finally {
    setAiLoading(false);
  }
};

  if (loading) return <div className="loader">Loading...</div>;

  // ---------------- UI ----------------
  return (
    <div className="my-ideas-page">
      <header className="ideas-header">
        <h1>My Innovations</h1>
        <p>{ideas.length} active submissions</p>
      </header>

      {ideas.length === 0 ? (
        <p>No ideas posted yet.</p>
      ) : (
        <div className="ideas-feed">
          {ideas.map((idea) => (
            <div key={idea._id} className="idea-card">
              <span className="domain-pill">{idea.domain}</span>
              <h2>{idea.title}</h2>
              <p><b>Stage:</b> {idea.stage}</p>
              <p>{idea.problem}</p>

              <div className="idea-actions">
                <button
                  className="secondary-btn"
                  onClick={() => handleEditClick(idea)}
                >
                  Edit Idea
                </button>

                <button
                  className="ai-btn"
                  onClick={() => handleViewAnalysis(idea)}
                >
                  View AI Analysis
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- EDIT MODAL ---------------- */}
      {isEditing && form && (
        <div className="modal-overlay">
          <div className="edit-modal large">
            <h2>Edit Innovation</h2>

            <form onSubmit={handleUpdate} className="edit-form">
              <label>Idea Title *</label>
              <input name="title" value={form.title} onChange={handleChange} required />

              <label>Domain *</label>
              <select name="domain" value={form.domain} onChange={handleChange} required>
                <option value="">Select Domain</option>
                <option value="AI">AI</option>
                <option value="Fintech">Fintech</option>
                <option value="Edtech">Edtech</option>
                <option value="Healthcare">Healthcare</option>
              </select>

              <label>Problem Statement</label>
              <textarea name="problem" value={form.problem} onChange={handleChange} />

              <label>Proposed Solution</label>
              <textarea name="solution" value={form.solution} onChange={handleChange} />

              <label>Target Market</label>
              <input name="market" value={form.market} onChange={handleChange} />

              <label>Revenue Model</label>
              <input name="revenue" value={form.revenue} onChange={handleChange} />

              <label>Current Stage</label>
              <select name="stage" value={form.stage} onChange={handleChange}>
                <option value="">Select Stage</option>
                <option value="Idea">Idea</option>
                <option value="Prototype">Prototype</option>
                <option value="MVP">MVP</option>
                <option value="Live">Live Product</option>
              </select>

              <div className="modal-actions">
                <button type="submit" className="primary-btn">Save Changes</button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setIsEditing(false);
                    setForm(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* ---------------- AI ANALYSIS MODAL ---------------- */}
{showAnalysis && selectedIdea && (
  <div className="modal-overlay">
    <div className="edit-modal large ai-modal">
      <h2>AI Future Prediction</h2>
      <p className="idea-subtitle">
        Analyzing: <b>{selectedIdea.title}</b>
      </p>

      {aiLoading ? (
        <div className="ai-loader-container">
          <div className="ai-spinner"></div>
          <p>AI is analyzing market trends and forecasting growth...</p>
        </div>
      ) : analysisData ? (
        <div className="ai-analysis-box animated">

          {/* ✅ SUCCESS PROBABILITY */}
          <div className="score-circle">
            <span className="score">
              {analysisData.success_probability_percent}%
            </span>
            <span className="label">Success Probability</span>
          </div>

          {/* ✅ MARKET FORECAST */}
          <div className="analysis-stats">
            <p>
              <b>Valuation in 2 Years:</b>{" "}
              ${analysisData.market_forecast?.valuation_in_2_years}M
            </p>
            <p>
              <b>Valuation in 5 Years:</b>{" "}
              ${analysisData.market_forecast?.valuation_in_5_years}M
            </p>

            {/* ✅ TOP DRIVER */}
            <p>
              <b>Key Success Driver:</b>{" "}
              <span className="driver-tag">
                {analysisData.explanation_sorted_by_impact &&
                  Object.keys(analysisData.explanation_sorted_by_impact)[0]}
              </span>
            </p>
          </div>

          {/* ✅ FULL SHAP BREAKDOWN */}
          <div className="ai-explanation">
            <h4>Feature Impact Breakdown:</h4>
            <ul>
              {analysisData.explanation_sorted_by_impact &&
                Object.entries(
                  analysisData.explanation_sorted_by_impact
                ).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value.toFixed(4)}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      ) : (
        <p>Could not retrieve analysis.</p>
      )}

      <div className="modal-actions">
        <button
          className="secondary-btn"
          onClick={() => {
            setShowAnalysis(false);
            setSelectedIdea(null);
            setAnalysisData(null);
          }}
        >
          Close Analysis
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
