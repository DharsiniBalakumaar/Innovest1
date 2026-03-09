import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";

const COLORS = ["#4CAF50", "#FF9800", "#2196F3", "#E91E63", "#9C27B0", "#00BCD4"];

const FEATURE_INFO = {
  relationships:          { name: "Network & Connections", icon: "🤝", positiveMsg: "Strong investor/partner network boosts growth.", negativeMsg: "Limited network slows funding opportunities." },
  funding_total_usd:      { name: "Total Funding",         icon: "💰", positiveMsg: "Adequate funding provides runway to scale.",    negativeMsg: "Low funding — startup may run out of resources." },
  funding_rounds:         { name: "Funding Rounds",        icon: "📊", positiveMsg: "Multiple rounds signal investor confidence.",   negativeMsg: "Few rounds — hasn't attracted repeat investors." },
  milestones:             { name: "Milestones Achieved",   icon: "🏆", positiveMsg: "Milestones show real execution capability.",    negativeMsg: "No milestones — execution is unproven." },
  is_web:                 { name: "Digital Product",       icon: "🌐", positiveMsg: "Web products scale globally at low cost.",      negativeMsg: "Non-digital products have higher scaling costs." },
  is_CA:                  { name: "Startup Ecosystem",     icon: "📍", positiveMsg: "Strong ecosystem access for VC and talent.",    negativeMsg: "Outside major hubs — limited investor access." },
  age_first_funding_year: { name: "Time to First Funding", icon: "⚡", positiveMsg: "Quick funding shows early traction.",           negativeMsg: "Slow first funding — early conviction lacking." },
  age_last_funding_year:  { name: "Funding Recency",       icon: "📅", positiveMsg: "Recent funding confirms active growth.",        negativeMsg: "Funding gap — possible stalled growth." },
};

const STRATEGIC_ADVICE = {
  "Strong Growth Momentum":       { color: "#1a7a3c", bg: "#f0fff4", border: "#b7ebc8", icon: "🚀", advice: "Strong execution with multiple milestones and funding rounds. High confidence for growth-stage investors." },
  "Strong Network Advantage":     { color: "#1a4f7a", bg: "#f0f8ff", border: "#b8d8f8", icon: "🌟", advice: "Exceptional network strength — well-connected founders attract better talent and follow-on funding." },
  "Underfunded Risk":             { color: "#cc2200", bg: "#fff5f5", border: "#ffc8c8", icon: "⚠️", advice: "Funding below sustainable threshold. Evaluate burn rate and milestones before committing." },
  "Early Idea — High Risk":       { color: "#7a3a00", bg: "#fff5ee", border: "#ffcba0", icon: "🌱", advice: "Idea stage with no execution proven. High risk — monitor for traction before investing." },
  "High Risk — Needs Validation": { color: "#cc2200", bg: "#fff5f5", border: "#ffc8c8", icon: "🔴", advice: "Multiple risk signals detected. Needs significant validation before investment consideration." },
  "Moderate Growth Potential":    { color: "#7a5200", bg: "#fff9f0", border: "#ffdfa0", icon: "📈", advice: "Moderate outlook — promising concept but needs stronger network, funding, or milestones." },
};

// ══════════════════════════════════════════════════════
// ── Reusable Modal shell with built-in maximize ──
// Every floating window uses this — just pass title,
// onClose, optional maxWidth, and children.
// ══════════════════════════════════════════════════════
function Modal({ title, onClose, maxWidth = "640px", children }) {
  const [maximized, setMaximized] = useState(false);

  return (
    <div style={S.overlay} onClick={onClose}>
      <div
        style={{
          ...S.modal,
          maxWidth:     maximized ? "100vw" : maxWidth,
          width:        maximized ? "100vw" : "100%",
          height:       maximized ? "100vh" : "auto",
          maxHeight:    maximized ? "100vh" : "88vh",
          borderRadius: maximized ? "0"     : "18px",
          margin:       maximized ? "0"     : undefined,
          transition:   "all 0.22s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={S.modalHeader}>
          <h2 style={S.modalHeading}>{title}</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              style={S.iconBtn}
              title={maximized ? "Restore window" : "Maximize window"}
              onClick={() => setMaximized(p => !p)}
            >
              {maximized ? "⊡" : "⛶"}
            </button>
            <button style={S.iconBtn} title="Close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={S.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════
// ── Main Dashboard Component ──
// ══════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [stats, setStats]                         = useState(null);
  const [pendingUsers, setPendingUsers]           = useState([]);
  const [approvedUsers, setApprovedUsers]         = useState([]);
  const [ideas, setIdeas]                         = useState([]);
  const [pendingInvestors, setPendingInvestors]   = useState([]);
  const [approvedInvestors, setApprovedInvestors] = useState([]);

  const [activeSection, setActiveSection]         = useState("pendingInnovators");
  const [selectedUser, setSelectedUser]           = useState(null);
  const [selectedIdea, setSelectedIdea]           = useState(null);
  const [ideaAnalysis, setIdeaAnalysis]           = useState(null);
  const [analysisLoading, setAnalysisLoading]     = useState(false);

  useEffect(() => {
    if (!token) return navigate("/login");
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        axios.get("http://localhost:5000/api/admin/dashboard-stats", { headers }),
        axios.get("http://localhost:5000/api/admin/pending-users", { headers }),
      ]);
      setStats(statsRes.data);
      setPendingUsers(pendingRes.data);
    } catch (err) {
      console.error("Dashboard load failed", err);
    }
  };

  const fetchApprovedUsers     = async () => { const r = await axios.get("http://localhost:5000/api/admin/approved-users",     { headers }); setApprovedUsers(r.data); };
  const fetchIdeas             = async () => { const r = await axios.get("http://localhost:5000/api/admin/ideas",              { headers }); setIdeas(r.data); };
  const fetchPendingInvestors  = async () => { const r = await axios.get("http://localhost:5000/api/admin/pending-investors",  { headers }); setPendingInvestors(r.data); };
  const fetchApprovedInvestors = async () => { const r = await axios.get("http://localhost:5000/api/admin/approved-investors", { headers }); setApprovedInvestors(r.data); };

  const approveUser = async (id) => {
    await axios.put(`http://localhost:5000/api/admin/approve/${id}`, {}, { headers });
    loadDashboard(); fetchApprovedUsers(); setSelectedUser(null);
  };

  const rejectUser = async (id) => {
    await axios.put(`http://localhost:5000/api/admin/reject/${id}`, {}, { headers });
    loadDashboard(); setSelectedUser(null);
  };

  const handleViewIdea = async (idea) => {
    setSelectedIdea(idea);
    setIdeaAnalysis(null);
    setAnalysisLoading(true);
    try {
      const milestoneMap = { Idea: 1, Prototype: 2, MVP: 3, Live: 4 };
      const fundingMap   = { Idea: 50000, Prototype: 200000, MVP: 500000, Live: 1500000 };
      const aiInput = {
        age_first_funding_year: 1.0, age_last_funding_year: 2.0,
        relationships: 5,
        funding_rounds: idea.stage === "Live" ? 2 : 1,
        funding_total_usd: fundingMap[idea.stage] || 50000,
        milestones: milestoneMap[idea.stage] || 1,
        is_CA: 0,
        is_web: ["AI", "Edtech", "Fintech", "Healthcare"].includes(idea.domain) ? 1 : 0,
        founded_year: new Date().getFullYear(),
        stage: idea.stage || "Idea",
        domain: idea.domain || "General",
      };
      const res = await axios.post(
        "http://localhost:5000/api/admin/analyze-idea",
        { aiInput },
        { headers }
      );
      setIdeaAnalysis(res.data);
    } catch (err) {
      console.error("AI analysis failed", err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return { stroke: "#1a7a3c", text: "#1a7a3c", label: "High Potential" };
    if (score >= 50) return { stroke: "#e67300", text: "#e67300", label: "Moderate Potential" };
    return { stroke: "#cc2200", text: "#cc2200", label: "Needs Improvement" };
  };

  const getReasons = (explanation) => {
    if (!explanation) return { pros: [], cons: [] };
    const pros = [], cons = [];
    Object.entries(explanation).forEach(([key, val]) => {
      const info = FEATURE_INFO[key]; if (!info) return;
      if (val >= 0) pros.push({ ...info, key }); else cons.push({ ...info, key });
    });
    return { pros, cons };
  };

  if (!stats) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <p style={{ fontSize: "18px", color: "#666" }}>Loading dashboard...</p>
    </div>
  );

  const sectionMap = {
    pendingInnovators:  { title: "Pending Innovators",  list: pendingUsers },
    approvedInnovators: { title: "Approved Innovators", list: approvedUsers },
    pendingInvestors:   { title: "Pending Investors",   list: pendingInvestors },
    approvedInvestors:  { title: "Approved Investors",  list: approvedInvestors },
    ideas:              { title: "All Submitted Ideas", list: ideas },
  };

  return (
    <div style={S.page}>
      <h1 style={S.pageTitle}>🛡️ Admin Dashboard</h1>

      {/* ── TABS ── */}
      <div style={S.tabs}>
        {[
          { key: "pendingInnovators",  label: "⏳ Pending Innovators",  action: loadDashboard },
          { key: "approvedInnovators", label: "✅ Approved Innovators", action: fetchApprovedUsers },
          { key: "pendingInvestors",   label: "🔔 Pending Investors",   action: fetchPendingInvestors },
          { key: "approvedInvestors",  label: "💼 Approved Investors",  action: fetchApprovedInvestors },
          { key: "ideas",              label: "💡 All Ideas",           action: fetchIdeas },
        ].map(({ key, label, action }) => (
          <button
            key={key}
            style={{ ...S.tab, ...(activeSection === key ? S.tabActive : {}) }}
            onClick={() => { action(); setActiveSection(key); }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── STAT CARDS ── */}
      <div style={S.statGrid}>
        <StatCard label="Pending Innovators"  value={stats.pending}              color="#FF9800" onClick={() => setActiveSection("pendingInnovators")} />
        <StatCard label="Approved Innovators" value={stats.approved}             color="#4CAF50" onClick={() => { fetchApprovedUsers(); setActiveSection("approvedInnovators"); }} />
        <StatCard label="Pending Investors"   value={stats.pendingInvestors}     color="#E91E63" onClick={() => { fetchPendingInvestors(); setActiveSection("pendingInvestors"); }} />
        <StatCard label="Approved Investors"  value={stats.approvedInvestors}    color="#009688" onClick={() => { fetchApprovedInvestors(); setActiveSection("approvedInvestors"); }} />
        <StatCard label="Total Ideas"         value={stats.totalIdeas}           color="#2196F3" onClick={() => { fetchIdeas(); setActiveSection("ideas"); }} />
        <StatCard label="Domains"             value={stats.ideasByDomain.length} color="#9C27B0" />
      </div>

      {/* ── CHARTS ── */}
      <div style={S.chartsRow}>
        <div style={S.chartCard}>
          <h3 style={S.chartTitle}>📈 Ideas by Domain</h3>
          {stats.ideasByDomain.length === 0 ? (
            <p style={{ color: "#bbb" }}>No domain data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.ideasByDomain} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="_id" tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#aaa" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "none" }} />
                <Bar dataKey="count" name="Ideas" radius={[8, 8, 0, 0]}>
                  {stats.ideasByDomain.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={S.chartCard}>
          <h3 style={S.chartTitle}>📊 Approval Status</h3>
          <PieChart width={260} height={260}>
            <Pie
              data={[
                { name: "Approved Innovators", value: stats.approved },
                { name: "Pending Innovators",  value: stats.pending },
                { name: "Approved Investors",  value: stats.approvedInvestors },
                { name: "Pending Investors",   value: stats.pendingInvestors },
              ].filter(d => d.value > 0)}
              dataKey="value" outerRadius={100} innerRadius={50} paddingAngle={3}
            >
              {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: "10px", border: "none" }} />
          </PieChart>
        </div>
      </div>

      {/* ── LIST SECTION ── */}
      <div style={S.sectionCard}>
        <h2 style={S.sectionTitle}>{sectionMap[activeSection]?.title}</h2>

        {activeSection !== "ideas" && (() => {
          const list = sectionMap[activeSection]?.list || [];
          return list.length === 0
            ? <p style={{ color: "#aaa" }}>No users found.</p>
            : list.map(u => (
              <div key={u._id} style={S.userRow}>
                <div>
                  <div style={S.userName}>{u.name}</div>
                  <div style={S.userEmail}>{u.email}</div>
                  <span style={S.badge}>{u.role} • {u.status}</span>
                </div>
                <button style={S.viewBtn} onClick={() => setSelectedUser(u)}>View KYC</button>
              </div>
            ));
        })()}

        {activeSection === "ideas" && (() => {
          return ideas.length === 0
            ? <p style={{ color: "#aaa" }}>No ideas found.</p>
            : ideas.map(idea => (
              <div key={idea._id} style={S.ideaRow}>
                <div style={{ flex: 1 }}>
                  <div style={S.ideaTitle}>{idea.title}</div>
                  <div style={S.ideaMeta}>{idea.domain} • {idea.stage} • by {idea.innovatorId?.name || "Unknown"}</div>
                  <div style={S.ideaSnippet}>{idea.problem?.substring(0, 120)}...</div>
                </div>
                <button style={S.viewBtn} onClick={() => handleViewIdea(idea)}>View + AI Analysis</button>
              </div>
            ));
        })()}
      </div>

      {/* ══════════════════════════════════════
          KYC MODAL — maximize via <Modal />
      ══════════════════════════════════════ */}
      {selectedUser && (
        <Modal
          title={`👤 KYC — ${selectedUser.name}`}
          onClose={() => setSelectedUser(null)}
          maxWidth="640px"
        >
          <DetailRow label="Name"     value={selectedUser.name} />
          <DetailRow label="Email"    value={selectedUser.email} />
          <DetailRow label="Role"     value={selectedUser.role} />
          <DetailRow label="Status"   value={selectedUser.status} />
          <DetailRow label="Phone"    value={selectedUser.phone || "N/A"} />
          <DetailRow label="LinkedIn" value={selectedUser.linkedin || "N/A"} />

          {selectedUser.documents?.identityProof && (
            <a
              href={`http://localhost:5000/uploads/${selectedUser.documents.identityProof}`}
              target="_blank" rel="noreferrer"
              style={{ color: "#2196F3", fontWeight: "600", display: "block", margin: "12px 0" }}
            >
              📄 Download Identity Document
            </a>
          )}

          {selectedUser.status === "pending" && (
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button style={S.approveBtn} onClick={() => approveUser(selectedUser._id)}>✅ Approve</button>
              <button style={S.rejectBtn}  onClick={() => rejectUser(selectedUser._id)}>❌ Reject</button>
            </div>
          )}
        </Modal>
      )}

      {/* ══════════════════════════════════════════════
          IDEA + AI MODAL — maximize via <Modal />
      ══════════════════════════════════════════════ */}
      {selectedIdea && (
        <Modal
          title={`💡 ${selectedIdea.title}`}
          onClose={() => { setSelectedIdea(null); setIdeaAnalysis(null); }}
          maxWidth="860px"
        >
          {/* Idea detail grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem", marginBottom: "8px" }}>
            <DetailRow label="Domain"    value={selectedIdea.domain} />
            <DetailRow label="Stage"     value={selectedIdea.stage} />
            <DetailRow label="Innovator" value={selectedIdea.innovatorId?.name || "N/A"} />
            <DetailRow label="Email"     value={selectedIdea.innovatorId?.email || "N/A"} />
          </div>
          <DetailRow label="Problem"  value={selectedIdea.problem} />
          <DetailRow label="Solution" value={selectedIdea.solution} />
          <DetailRow label="Market"   value={selectedIdea.market} />
          <DetailRow label="Revenue"  value={selectedIdea.revenue} />

          <hr style={{ margin: "20px 0", borderColor: "#eee" }} />
          <h3 style={{ margin: "0 0 14px", color: "#1a1a2e", fontSize: "17px" }}>🤖 AI Investment Analysis</h3>

          {analysisLoading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <div style={S.spinner} />
              <p style={{ color: "#888", marginTop: "12px" }}>Analyzing with AI...</p>
            </div>
          ) : ideaAnalysis ? (() => {
            const score = ideaAnalysis.success_probability_percent;
            const scoreColor = getScoreColor(score);
            const { pros, cons } = getReasons(ideaAnalysis.explanation_sorted_by_impact);
            const strategic = STRATEGIC_ADVICE[ideaAnalysis.strategic_assessment] || STRATEGIC_ADVICE["Moderate Growth Potential"];
            const svgSize = 130, svgR = 54, svgCenter = 65;
            const circumference = 2 * Math.PI * svgR;
            const offset = circumference - (score / 100) * circumference;

            return (
              <div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {/* Score circle */}
                  <div style={S.aiCard}>
                    <p style={S.aiLabel}>Success Probability</p>
                    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ display: "block", margin: "0 auto" }}>
                      <circle cx={svgCenter} cy={svgCenter} r={svgR} fill="none" stroke="#eee" strokeWidth="10" />
                      <circle cx={svgCenter} cy={svgCenter} r={svgR} fill="none"
                        stroke={scoreColor.stroke} strokeWidth="10"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round" transform={`rotate(-90 ${svgCenter} ${svgCenter})`}
                        style={{ transition: "stroke-dashoffset 1s ease" }}
                      />
                      <text x={svgCenter} y={svgCenter - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill={scoreColor.text}>{score}%</text>
                      <text x={svgCenter} y={svgCenter + 12} textAnchor="middle" fontSize="10" fill="#999">{scoreColor.label}</text>
                    </svg>
                    {ideaAnalysis.raw_model_score && (
                      <p style={{ fontSize: "11px", color: "#aaa", textAlign: "center", marginTop: "6px" }}>
                        Raw: {ideaAnalysis.raw_model_score}% (adjusted)
                      </p>
                    )}
                  </div>

                  {/* Forecast */}
                  <div style={{ ...S.aiCard, flex: "1 1 150px" }}>
                    <p style={S.aiLabel}>Market Forecast</p>
                    {[
                      { label: "In 2 Years", value: `₹${(ideaAnalysis.market_forecast?.valuation_in_2_years * 83.5 * 1e6 / 1e7).toFixed(1)} Cr` },
                      { label: "In 5 Years", value: `₹${(ideaAnalysis.market_forecast?.valuation_in_5_years * 83.5 * 1e6 / 1e7).toFixed(1)} Cr` },
                    ].map((item, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                          <span style={{ fontSize: "13px", color: "#555" }}>{item.label}</span>
                          <span style={{ fontSize: "15px", fontWeight: "700", color: "#1a1a2e" }}>{item.value}</span>
                        </div>
                        {i === 0 && <div style={{ height: "1px", background: "#eee" }} />}
                      </div>
                    ))}
                  </div>

                  {/* Strategic */}
                  <div style={{ ...S.aiCard, flex: "2 1 180px", background: strategic.bg, border: `1px solid ${strategic.border}` }}>
                    <p style={{ fontSize: "13px", fontWeight: "800", color: strategic.color, margin: "0 0 8px" }}>{strategic.icon} {ideaAnalysis.strategic_assessment}</p>
                    <p style={{ fontSize: "13px", color: "#444", lineHeight: "1.6", margin: 0 }}>{strategic.advice}</p>
                  </div>
                </div>

                {/* Warnings */}
                {ideaAnalysis.model_warnings?.length > 0 && (
                  <div style={{ background: "#fffbea", border: "1px solid #f5c518", borderRadius: "10px", padding: "12px 16px", marginBottom: "12px" }}>
                    <p style={{ fontWeight: "800", color: "#7a5200", fontSize: "13px", margin: "0 0 6px" }}>
                      🔍 Score adjusted from {ideaAnalysis.raw_model_score}% because:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                      {ideaAnalysis.model_warnings.map((w, i) => (
                        <li key={i} style={{ fontSize: "12px", color: "#7a5200", marginBottom: "4px", lineHeight: "1.5" }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pros & Cons */}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {pros.length > 0 && (
                    <div style={{ flex: "1 1 220px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#1a7a3c", margin: "0 0 8px" }}>✅ Why Invest</h4>
                      {pros.map((p, i) => (
                        <div key={i} style={{ background: "#f0fff4", border: "1px solid #b7ebc8", borderRadius: "8px", padding: "8px 12px", marginBottom: "6px" }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#1a7a3c" }}>{p.icon} {p.name}</div>
                          <p style={{ fontSize: "12px", color: "#333", margin: "3px 0 0", lineHeight: "1.5" }}>{p.positiveMsg}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {cons.length > 0 && (
                    <div style={{ flex: "1 1 220px" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#cc2200", margin: "0 0 8px" }}>⚠️ Risk Factors</h4>
                      {cons.map((c, i) => (
                        <div key={i} style={{ background: "#fff5f5", border: "1px solid #ffc8c8", borderRadius: "8px", padding: "8px 12px", marginBottom: "6px" }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#cc2200" }}>{c.icon} {c.name}</div>
                          <p style={{ fontSize: "12px", color: "#333", margin: "3px 0 0", lineHeight: "1.5" }}>{c.negativeMsg}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p style={{ fontSize: "11px", color: "#aaa", background: "#f5f5f5", borderRadius: "8px", padding: "8px 12px", marginTop: "12px", lineHeight: "1.5" }}>
                  ℹ️ AI-generated analysis based on historical startup success patterns. For decision-support only, not financial advice.
                </p>
              </div>
            );
          })() : (
            <p style={{ color: "#888", fontSize: "14px" }}>
              AI analysis unavailable — make sure the predictor service is running on port 8000.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ── SUBCOMPONENTS ── */
const StatCard = ({ label, value, color, onClick }) => (
  <div
    onClick={onClick}
    style={{ background: color, color: "#fff", padding: "20px 24px", borderRadius: "14px", cursor: onClick ? "pointer" : "default", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", transition: "transform 0.15s" }}
    onMouseEnter={e => onClick && (e.currentTarget.style.transform = "translateY(-3px)")}
    onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
  >
    <h1 style={{ fontSize: "2rem", fontWeight: "800", margin: "0 0 6px" }}>{value}</h1>
    <p style={{ fontSize: "13px", opacity: 0.9, margin: 0 }}>{label}</p>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div style={{ marginBottom: "10px" }}>
    <span style={{ fontWeight: "700", color: "#555", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}: </span>
    <span style={{ color: "#222", fontSize: "14px" }}>{value || "N/A"}</span>
  </div>
);

/* ── STYLES ── */
const S = {
  page:        { padding: "2rem", background: "#eef2f7", minHeight: "100vh" },
  pageTitle:   { fontSize: "24px", fontWeight: "800", color: "#1a1a2e", marginBottom: "1.2rem" },
  tabs:        { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.5rem" },
  tab:         { background: "#fff", border: "1px solid #ddd", color: "#555", padding: "8px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "600", transition: "all 0.15s" },
  tabActive:   { background: "#1a1a2e", color: "#fff", border: "1px solid #1a1a2e" },
  statGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" },
  chartsRow:   { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" },
  chartCard:   { background: "#fff", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" },
  chartTitle:  { margin: "0 0 1rem", fontSize: "16px", fontWeight: "700", color: "#1a1a2e" },
  sectionCard: { background: "#fff", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" },
  sectionTitle:{ margin: "0 0 1.2rem", fontSize: "18px", fontWeight: "800", color: "#1a1a2e" },

  userRow:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#f9fafc", marginBottom: "10px", borderRadius: "12px", border: "1px solid #eee" },
  userName:    { fontWeight: "700", fontSize: "15px", color: "#1a1a2e" },
  userEmail:   { fontSize: "13px", color: "#666", margin: "2px 0" },
  badge:       { fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.4px" },

  ideaRow:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#f9fbff", marginBottom: "10px", borderRadius: "12px", borderLeft: "5px solid #2196F3" },
  ideaTitle:   { fontWeight: "700", fontSize: "15px", color: "#1a1a2e", marginBottom: "4px" },
  ideaMeta:    { fontSize: "12px", color: "#666", marginBottom: "4px" },
  ideaSnippet: { fontSize: "12px", color: "#999", lineHeight: "1.4" },

  viewBtn:     { background: "linear-gradient(135deg, #6c5ce7, #5a4bdc)", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "13px", whiteSpace: "nowrap", flexShrink: 0 },
  approveBtn:  { background: "#4CAF50", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  rejectBtn:   { background: "#E53935", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },

  // ── Modal shell (used by <Modal> component) ──
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem", overflowY: "auto" },
  modal:       { background: "#fff", borderRadius: "18px", width: "100%", maxWidth: "640px", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 1.5rem", borderBottom: "1px solid #eee", flexShrink: 0, borderRadius: "18px 18px 0 0" },
  modalHeading:{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#1a1a2e" },
  modalBody:   { padding: "1.5rem", overflowY: "auto", flex: 1 },

  // Shared button for maximize + close
  iconBtn:     { background: "#f0f0f0", border: "none", borderRadius: "8px", width: "34px", height: "34px", cursor: "pointer", fontSize: "16px", color: "#555", display: "flex", alignItems: "center", justifyContent: "center" },

  aiCard:  { flex: "0 0 auto", background: "#f7f7ff", borderRadius: "12px", padding: "1rem", border: "1px solid #e0e0ff", minWidth: "130px" },
  aiLabel: { fontSize: "11px", fontWeight: "700", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" },
  spinner: { width: "40px", height: "40px", margin: "0 auto", border: "4px solid #eee", borderTop: "4px solid #6c5ce7", borderRadius: "50%", animation: "spin 1s linear infinite" },
};
