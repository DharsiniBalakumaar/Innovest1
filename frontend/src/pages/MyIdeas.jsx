import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/myideas.css";

const FEATURE_INFO = {
  relationships: {
    name: "Network & Connections", icon: "🤝",
    positiveMsg: "Strong investor and partner network significantly boosts chances of acquisition and growth.",
    negativeMsg: "Limited network may slow down funding opportunities and strategic partnerships.",
  },
  funding_total_usd: {
    name: "Total Funding Raised", icon: "💰",
    positiveMsg: "Adequate funding provides runway to build, iterate, and scale the product.",
    negativeMsg: "Low funding is a risk — the startup may struggle to execute before running out of resources.",
  },
  funding_rounds: {
    name: "Number of Funding Rounds", icon: "📊",
    positiveMsg: "Multiple funding rounds indicate sustained investor confidence and business momentum.",
    negativeMsg: "Single or no funding rounds suggest the idea hasn't yet attracted repeat investor interest.",
  },
  milestones: {
    name: "Milestones Achieved", icon: "🏆",
    positiveMsg: "Achieved milestones demonstrate execution capability and reduce investor risk.",
    negativeMsg: "Fewer milestones mean the idea is still unproven — higher risk for investors.",
  },
  is_web: {
    name: "Digital / Web Product", icon: "🌐",
    positiveMsg: "Web-based products scale globally with lower marginal cost, attractive to investors.",
    negativeMsg: "Non-digital products face higher scaling costs and slower market penetration.",
  },
  is_CA: {
    name: "Silicon Valley Ecosystem", icon: "📍",
    positiveMsg: "California-based startups have better access to top VCs, talent, and accelerators.",
    negativeMsg: "Outside major startup hubs — may face limited access to top-tier investors and networks.",
  },
  age_first_funding_year: {
    name: "Time to First Funding", icon: "⚡",
    positiveMsg: "Quick initial funding shows strong early traction and investor interest.",
    negativeMsg: "Delayed first funding may indicate difficulty convincing early investors.",
  },
  age_last_funding_year: {
    name: "Funding Recency", icon: "📅",
    positiveMsg: "Recent funding rounds confirm the business is still actively growing.",
    negativeMsg: "Funding gap may suggest stalled growth or investor hesitation.",
  },
};

const STRATEGIC_ADVICE = {
  "Strong Growth Momentum": {
    color: "#1a7a3c", bg: "#f0fff4", border: "#b7ebc8", icon: "🚀",
    advice: "This startup shows strong execution with multiple milestones and funding rounds. High confidence for investors looking for growth-stage opportunities.",
  },
  "Strong Network Advantage": {
    color: "#1a4f7a", bg: "#f0f8ff", border: "#b8d8f8", icon: "🌟",
    advice: "Exceptional network strength. Well-connected founders attract better talent, partnerships, and follow-on funding.",
  },
  "Underfunded Risk": {
    color: "#cc2200", bg: "#fff5f5", border: "#ffc8c8", icon: "⚠️",
    advice: "Current funding level is below the threshold for sustainable execution. Investors should evaluate burn rate and milestones closely before committing.",
  },
  "Moderate Growth Potential": {
    color: "#7a5200", bg: "#fff9f0", border: "#ffdfa0", icon: "📈",
    advice: "Moderate outlook. Promising concept but needs stronger network, more funding rounds, or clearer milestones to de-risk the investment.",
  },
};

export default function MyIdeas() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  const fetchIdeas = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/innovator/my-ideas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIdeas(res.data);
    } catch (err) {
      console.error("Failed to fetch ideas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIdeas(); }, []);

  const handleEditClick = (idea) => { setForm({ ...idea }); setIsEditing(true); };
  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/innovator/update-idea/${form._id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Idea updated successfully ✨");
      setIsEditing(false);
      setForm(null);
      fetchIdeas();
    } catch (err) {
      alert("Failed to update idea");
    }
  };

  const handleViewAnalysis = async (idea) => {
    setSelectedIdea(idea);
    setShowAnalysis(true);
    setIsFullscreen(false);
    setAiLoading(true);
    setAnalysisData(null);
    try {
      const token = localStorage.getItem("token");
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

  const closeAnalysis = () => {
    setShowAnalysis(false);
    setIsFullscreen(false);
    setSelectedIdea(null);
    setAnalysisData(null);
  };

  const getInvestReasons = (explanation) => {
    if (!explanation) return { pros: [], cons: [] };
    const pros = [], cons = [];
    Object.entries(explanation).forEach(([key, val]) => {
      const info = FEATURE_INFO[key];
      if (!info) return;
      if (val >= 0) pros.push({ ...info, key, value: val });
      else cons.push({ ...info, key, value: val });
    });
    return { pros, cons };
  };

  const getScoreColor = (score) => {
    if (score >= 70) return { stroke: "#1a7a3c", text: "#1a7a3c", label: "High Potential" };
    if (score >= 50) return { stroke: "#e67300", text: "#e67300", label: "Moderate Potential" };
    return { stroke: "#cc2200", text: "#cc2200", label: "Needs Improvement" };
  };

  if (loading) return <div className="loader">Loading...</div>;

  const fs = isFullscreen;
  const svgSize = fs ? 200 : 140;
  const svgR = fs ? 86 : 58;
  const svgCenter = svgSize / 2;
  const circumference = 2 * Math.PI * svgR;

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
                <button className="secondary-btn" onClick={() => handleEditClick(idea)}>Edit Idea</button>
                <button className="ai-btn" onClick={() => handleViewAnalysis(idea)}>View AI Analysis</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EDIT MODAL ── */}
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
                <button type="button" className="secondary-btn" onClick={() => { setIsEditing(false); setForm(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AI ANALYSIS MODAL ── */}
      {showAnalysis && selectedIdea && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: fs ? "flex-start" : "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: fs ? 0 : "1rem",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: fs ? 0 : "18px",
            width: fs ? "100%" : "min(860px, 100%)",
            maxWidth: "100%",
            height: fs ? "100vh" : "auto",
            maxHeight: fs ? "100vh" : "92vh",
            overflowY: "auto",
            boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
            transition: "all 0.25s ease",
            display: "flex",
            flexDirection: "column",
          }}>

            {/* ── STICKY HEADER ── */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: fs ? "1.4rem 2.5rem" : "1.2rem 1.8rem",
              borderBottom: "1px solid #eee",
              position: "sticky", top: 0, background: "#fff", zIndex: 10,
              flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: fs ? "26px" : "20px", fontWeight: "800", margin: 0, color: "#1a1a2e" }}>
                  🤖 AI Investment Analysis
                </h2>
                <p style={{ fontSize: fs ? "16px" : "13px", color: "#666", margin: "5px 0 0" }}>
                  Analyzing: <b>{selectedIdea.title}</b>
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setIsFullscreen(!fs)}
                  title={fs ? "Exit Fullscreen" : "Maximize"}
                  style={{
                    background: "#f0f0f0", border: "1px solid #ddd",
                    borderRadius: "8px", cursor: "pointer",
                    fontSize: "20px", width: "40px", height: "40px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#444", fontWeight: "bold",
                  }}
                >
                  {fs ? "🗗" : "⛶"}
                </button>
                <button
                  onClick={closeAnalysis}
                  style={{
                    background: "#f0f0f0", border: "1px solid #ddd",
                    borderRadius: "8px", cursor: "pointer",
                    fontSize: "18px", width: "40px", height: "40px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#444",
                  }}
                >✕</button>
              </div>
            </div>

            {/* ── BODY ── */}
            {aiLoading ? (
              <div style={{ padding: "5rem", textAlign: "center", flex: 1 }}>
                <div style={{
                  width: "60px", height: "60px", margin: "0 auto",
                  border: "6px solid #eee", borderTop: "6px solid #6c63ff",
                  borderRadius: "50%", animation: "spin 1s linear infinite",
                }} />
                <p style={{ color: "#666", marginTop: "20px", fontSize: "16px" }}>
                  AI is analyzing market trends and forecasting growth...
                </p>
              </div>
            ) : analysisData ? (() => {
              const score = analysisData.success_probability_percent;
              const scoreColor = getScoreColor(score);
              const { pros, cons } = getInvestReasons(analysisData.explanation_sorted_by_impact);
              const strategic = STRATEGIC_ADVICE[analysisData.strategic_assessment] || STRATEGIC_ADVICE["Moderate Growth Potential"];
              const offset = circumference - (score / 100) * circumference;
              const pad = fs ? "2.5rem" : "1.8rem";

              return (
                <div style={{ padding: pad, flex: 1 }}>

                  {/* ── TOP ROW: Score + Forecast + Strategic ── */}
                  <div style={{ display: "flex", gap: "1.2rem", marginBottom: "1.8rem", flexWrap: "wrap" }}>

                    {/* Score */}
                    <div style={{
                      flex: "0 0 auto", background: "#f7f7ff",
                      borderRadius: "16px", padding: fs ? "1.8rem" : "1.2rem",
                      border: "1px solid #e0e0ff", textAlign: "center",
                      minWidth: fs ? "220px" : "160px",
                    }}>
                      <p style={{ fontSize: fs ? "14px" : "12px", fontWeight: "700", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 14px" }}>
                        Success Probability
                      </p>
                      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ display: "block", margin: "0 auto" }}>
                        <circle cx={svgCenter} cy={svgCenter} r={svgR} fill="none" stroke="#eee" strokeWidth={fs ? 14 : 10} />
                        <circle
                          cx={svgCenter} cy={svgCenter} r={svgR} fill="none"
                          stroke={scoreColor.stroke} strokeWidth={fs ? 14 : 10}
                          strokeDasharray={circumference} strokeDashoffset={offset}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${svgCenter} ${svgCenter})`}
                          style={{ transition: "stroke-dashoffset 1.2s ease" }}
                        />
                        <text x={svgCenter} y={svgCenter - 6} textAnchor="middle" fontSize={fs ? 30 : 20} fontWeight="800" fill={scoreColor.text}>
                          {score}%
                        </text>
                        <text x={svgCenter} y={svgCenter + (fs ? 18 : 14)} textAnchor="middle" fontSize={fs ? 13 : 10} fill="#999">
                          {scoreColor.label}
                        </text>
                      </svg>
                    </div>

                    {/* Forecast */}
                    <div style={{
                      flex: "1 1 200px", background: "#f7f7ff",
                      borderRadius: "16px", padding: fs ? "1.8rem" : "1.2rem",
                      border: "1px solid #e0e0ff",
                    }}>
                      <p style={{ fontSize: fs ? "14px" : "12px", fontWeight: "700", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 14px" }}>
                        Market Forecast
                      </p>
                      {[
                        { label: "Valuation in 2 Years", value: `₹${(analysisData.market_forecast?.valuation_in_2_years * 83.5 * 1000000 / 10000000).toFixed(1)} Cr` },
{ label: "Valuation in 5 Years", value: `₹${(analysisData.market_forecast?.valuation_in_5_years * 83.5 * 1000000 / 10000000).toFixed(1)} Cr` },
                        { label: "AI Assessment", value: `${strategic.icon} ${analysisData.strategic_assessment}`, color: strategic.color },
                      ].map((item, i) => (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                            <span style={{ fontSize: fs ? "16px" : "13px", color: "#555" }}>{item.label}</span>
                            <span style={{ fontSize: fs ? "20px" : "15px", fontWeight: "700", color: item.color || "#1a1a2e" }}>{item.value}</span>
                          </div>
                          {i < 2 && <div style={{ height: "1px", background: "#eee" }} />}
                        </div>
                      ))}
                    </div>

                    {/* Strategic */}
                    <div style={{
                      flex: "2 1 260px", background: strategic.bg,
                      borderRadius: "16px", padding: fs ? "1.8rem" : "1.2rem",
                      border: `1px solid ${strategic.border}`,
                    }}>
                      <p style={{ fontSize: fs ? "17px" : "14px", fontWeight: "800", color: strategic.color, margin: "0 0 10px" }}>
                        {strategic.icon} Strategic Assessment
                      </p>
                      <p style={{ fontSize: fs ? "16px" : "13px", color: "#444", lineHeight: "1.7", margin: 0 }}>
                        {strategic.advice}
                      </p>
                    </div>
                  </div>

                  {/* ── BOTTOM ROW: Pros + Cons ── */}
                  <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>

                    {/* Why Invest */}
                    {pros.length > 0 && (
                      <div style={{ flex: "1 1 300px" }}>
                        <h4 style={{ fontSize: fs ? "18px" : "15px", fontWeight: "800", color: "#1a7a3c", margin: "0 0 14px" }}>
                          ✅ Why Investors Should Consider This
                        </h4>
                        {pros.map((p, i) => (
                          <div key={i} style={{
                            background: "#f0fff4", border: "1px solid #b7ebc8",
                            borderRadius: "12px", padding: fs ? "16px 20px" : "12px 14px",
                            marginBottom: "10px",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                              <span style={{ fontSize: fs ? "22px" : "18px" }}>{p.icon}</span>
                              <span style={{ fontSize: fs ? "16px" : "13px", fontWeight: "700", color: "#1a7a3c" }}>{p.name}</span>
                            </div>
                            <p style={{ fontSize: fs ? "15px" : "13px", color: "#333", lineHeight: "1.6", margin: 0 }}>{p.positiveMsg}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Risk Factors */}
                    {cons.length > 0 && (
                      <div style={{ flex: "1 1 300px" }}>
                        <h4 style={{ fontSize: fs ? "18px" : "15px", fontWeight: "800", color: "#cc2200", margin: "0 0 14px" }}>
                          ⚠️ Risk Factors to Consider
                        </h4>
                        {cons.map((c, i) => (
                          <div key={i} style={{
                            background: "#fff5f5", border: "1px solid #ffc8c8",
                            borderRadius: "12px", padding: fs ? "16px 20px" : "12px 14px",
                            marginBottom: "10px",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                              <span style={{ fontSize: fs ? "22px" : "18px" }}>{c.icon}</span>
                              <span style={{ fontSize: fs ? "16px" : "13px", fontWeight: "700", color: "#cc2200" }}>{c.name}</span>
                            </div>
                            <p style={{ fontSize: fs ? "15px" : "13px", color: "#333", lineHeight: "1.6", margin: 0 }}>{c.negativeMsg}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Disclaimer */}
                  <p style={{
                    fontSize: fs ? "14px" : "12px", color: "#999",
                    background: "#f5f5f5", borderRadius: "10px",
                    padding: fs ? "14px 18px" : "10px 14px",
                    margin: "1.5rem 0 0", lineHeight: "1.6",
                  }}>
                    ℹ️ This analysis is AI-generated based on startup success patterns from historical data.
                    It is intended as a decision-support tool, not financial advice.
                  </p>
                </div>
              );
            })() : (
              <p style={{ textAlign: "center", color: "#888", padding: "3rem", fontSize: "16px" }}>
                Could not retrieve analysis.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
