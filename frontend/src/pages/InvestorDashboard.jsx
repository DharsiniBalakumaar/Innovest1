import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend,
} from "recharts";

const DOMAIN_COLORS = ["#6c5ce7", "#00b894", "#0984e3", "#e17055", "#fdcb6e", "#fd79a8", "#00cec9"];
const STAGE_COLORS  = { Idea: "#fdcb6e", Prototype: "#0984e3", MVP: "#00b894", Live: "#6c5ce7" };

const FEATURE_INFO = {
  relationships:          { name: "Network",         icon: "🤝", pos: "Strong investor/partner network boosts growth.",    neg: "Limited network slows funding opportunities." },
  funding_total_usd:      { name: "Funding",         icon: "💰", pos: "Adequate funding provides runway to scale.",        neg: "Low funding — startup may run out of resources." },
  funding_rounds:         { name: "Funding Rounds",  icon: "📊", pos: "Multiple rounds signal investor confidence.",       neg: "Few rounds — hasn't attracted repeat investors." },
  milestones:             { name: "Milestones",      icon: "🏆", pos: "Milestones show real execution capability.",        neg: "No milestones — execution is unproven." },
  is_web:                 { name: "Digital Product", icon: "🌐", pos: "Web products scale globally at low cost.",          neg: "Non-digital products have higher scaling costs." },
  is_CA:                  { name: "Ecosystem",       icon: "📍", pos: "Strong ecosystem access for VC and talent.",        neg: "Outside major hubs — limited investor access." },
  age_first_funding_year: { name: "Speed to Fund",  icon: "⚡", pos: "Quick funding shows early traction.",               neg: "Slow first funding — early conviction lacking." },
  age_last_funding_year:  { name: "Recency",         icon: "📅", pos: "Recent funding confirms active growth.",            neg: "Funding gap — possible stalled growth." },
};

const STRATEGIC_ADVICE = {
  "Strong Growth Momentum":       { color: "#1a7a3c", bg: "#f0fff4", border: "#b7ebc8", icon: "🚀", advice: "Strong execution. High confidence for growth-stage investors." },
  "Strong Network Advantage":     { color: "#1a4f7a", bg: "#f0f8ff", border: "#b8d8f8", icon: "🌟", advice: "Well-connected founders attract better talent and follow-on funding." },
  "Underfunded Risk":             { color: "#cc2200", bg: "#fff5f5", border: "#ffc8c8", icon: "⚠️", advice: "Funding below sustainable threshold. Evaluate burn rate." },
  "Early Idea — High Risk":       { color: "#7a3a00", bg: "#fff5ee", border: "#ffcba0", icon: "🌱", advice: "Idea stage — high risk. Monitor for traction before investing." },
  "High Risk — Needs Validation": { color: "#cc2200", bg: "#fff5f5", border: "#ffc8c8", icon: "🔴", advice: "Multiple risk signals. Needs significant validation." },
  "Moderate Growth Potential":    { color: "#7a5200", bg: "#fff9f0", border: "#ffdfa0", icon: "📈", advice: "Promising concept but needs stronger network or milestones." },
};

/* ── Reusable maximizable modal ── */
function Modal({ title, onClose, maxWidth = "700px", children }) {
  const [maximized, setMaximized] = useState(false);
  return (
    <div style={S.overlay} onClick={onClose}>
      <div
        style={{
          ...S.modal,
          maxWidth:     maximized ? "100vw" : maxWidth,
          width:        maximized ? "100vw" : "100%",
          height:       maximized ? "100vh" : "auto",
          maxHeight:    maximized ? "100vh" : "90vh",
          borderRadius: maximized ? "0"     : "20px",
          margin:       maximized ? "0"     : undefined,
          transition:   "all 0.22s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={S.modalHeader}>
          <h2 style={S.modalHeading}>{title}</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={S.iconBtn} title={maximized ? "Restore" : "Maximize"} onClick={() => setMaximized(p => !p)}>
              {maximized ? "⊡" : "⛶"}
            </button>
            <button style={S.iconBtn} onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={S.modalBody}>{children}</div>
      </div>
    </div>
  );
}

/* ── AI Score ring ── */
function ScoreRing({ score }) {
  const color = score >= 70 ? "#00b894" : score >= 50 ? "#e67300" : "#e17055";
  const label = score >= 70 ? "High Potential" : score >= 50 ? "Moderate" : "Needs Work";
  const r = 54, cx = 65, size = 130;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#eee" strokeWidth="11" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="11"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x={cx} y={cx - 6} textAnchor="middle" fontSize="19" fontWeight="800" fill={color}>{score}%</text>
      <text x={cx} y={cx + 13} textAnchor="middle" fontSize="10" fill="#999">{label}</text>
    </svg>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function InvestorDashboard() {
  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [ideas,           setIdeas]           = useState([]);
  const [stats,           setStats]           = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [activeView,      setActiveView]      = useState("browse");
  const [selectedIdea,    setSelectedIdea]    = useState(null);
  const [ideaAnalysis,    setIdeaAnalysis]    = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [likeLoading,     setLikeLoading]     = useState({});

  // Filters
  const [search,       setSearch]       = useState("");
  const [filterDomain, setFilterDomain] = useState("All");
  const [filterStage,  setFilterStage]  = useState("All");

  // Load everything on mount
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ideasRes, statsRes] = await Promise.all([
        axios.get("http://localhost:5000/api/investor/ideas", { headers }),
        axios.get("http://localhost:5000/api/investor/dashboard-stats", { headers }),
      ]);
      setIdeas(ideasRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Dashboard load failed:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch ideas whenever filters change
  const fetchIdeas = useCallback(async () => {
    try {
      const params = {};
      if (filterDomain !== "All") params.domain = filterDomain;
      if (filterStage  !== "All") params.stage  = filterStage;
      if (search.trim())          params.search  = search.trim();
      const r = await axios.get("http://localhost:5000/api/investor/ideas", { headers, params });
      setIdeas(r.data);
    } catch (err) {
      console.error("Filter fetch failed:", err.message);
    }
  }, [filterDomain, filterStage, search]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const handleLike = async (ideaId, e) => {
    e.stopPropagation();
    setLikeLoading(p => ({ ...p, [ideaId]: true }));
    try {
      const r = await axios.post(
        `http://localhost:5000/api/investor/like/${ideaId}`,
        {},
        { headers }
      );
      setIdeas(prev => prev.map(i =>
        i._id === ideaId
          ? { ...i, likedByMe: r.data.liked, likeCount: r.data.likeCount }
          : i
      ));
      if (selectedIdea?._id === ideaId) {
        setSelectedIdea(p => ({ ...p, likedByMe: r.data.liked, likeCount: r.data.likeCount }));
      }
      // Refresh stats so "Liked by You" counter updates
      const statsRes = await axios.get("http://localhost:5000/api/investor/dashboard-stats", { headers });
      setStats(statsRes.data);
    } catch (err) {
      console.error("Like failed:", err.message);
    } finally {
      setLikeLoading(p => ({ ...p, [ideaId]: false }));
    }
  };

  const handleViewIdea = async (idea) => {
    setSelectedIdea(idea);
    setIdeaAnalysis(null);
    setAnalysisLoading(true);
    try {
      const r = await axios.post(
        "http://localhost:5000/api/investor/analyze-idea",
        { ideaId: idea._id },
        { headers }
      );
      setIdeaAnalysis(r.data);
    } catch (err) {
      console.error("AI analysis failed:", err.message);
    } finally {
      setAnalysisLoading(false);
    }
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

  const displayIdeas = activeView === "liked"
    ? ideas.filter(i => i.likedByMe)
    : ideas;

  /* ── Loading screen ── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh", background: "#f4f6f8" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ ...S.spinner, borderTopColor: "#6c5ce7" }} />
        <p style={{ marginTop: "16px", color: "#888" }}>Loading investor portal...</p>
      </div>
    </div>
  );

  return (
    <div style={S.page}>

      {/* ══════════ HERO — clean white/light style ══════════ */}
      <div style={S.hero}>
        <div style={S.heroInner}>
          <div>
            <div style={S.heroBadge}>💼 Investor Portal</div>
            <h1 style={S.heroTitle}>Discover Breakthrough Ideas</h1>
            <p style={S.heroSub}>AI-powered analysis · Live opportunity feed · Smart filtering</p>
          </div>
          <div style={S.heroStats}>
            <HeroStat label="Total Ideas"  value={stats?.total     ?? 0} />
            <HeroStat label="Liked by You" value={stats?.likedByMe ?? 0} accent />
            <HeroStat label="Domains"      value={stats?.ideasByDomain?.length ?? 0} />
          </div>
        </div>
      </div>

      {/* ══════════ NAV TABS ══════════ */}
      <div style={S.navBar}>
        {[
          { key: "browse", label: "🔍 Browse Ideas" },
          { key: "liked",  label: "❤️ My Liked Ideas" },
          { key: "stats",  label: "📊 Analytics" },
        ].map(({ key, label }) => (
          <button
            key={key}
            style={{ ...S.navTab, ...(activeView === key ? S.navTabActive : {}) }}
            onClick={() => setActiveView(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={S.content}>

        {/* ══════════ ANALYTICS ══════════ */}
        {activeView === "stats" && stats && (
          <div>
            <div style={S.kpiRow}>
              <KpiCard icon="💡" label="Total Ideas"    value={stats.total}                    color="#6c5ce7" />
              <KpiCard icon="❤️" label="You Liked"       value={stats.likedByMe}                color="#e17055" />
              <KpiCard icon="🏷️" label="Domains"        value={stats.ideasByDomain?.length}    color="#0984e3" />
              <KpiCard icon="📈" label="Stages Tracked"  value={stats.ideasByStage?.length}     color="#00b894" />
            </div>

            <div style={S.chartsGrid}>
              {/* Domain bar */}
              <div style={S.chartCard}>
                <h3 style={S.chartTitle}>💡 Ideas by Domain</h3>
                {stats.ideasByDomain?.length === 0
                  ? <p style={{ color: "#bbb", fontSize: "14px" }}>No data yet.</p>
                  : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats.ideasByDomain} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <XAxis dataKey="domain" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={S.tooltip} />
                        <Bar dataKey="count" name="Ideas" radius={[8, 8, 0, 0]}>
                          {stats.ideasByDomain.map((_, i) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </div>

              {/* Stage pie */}
              <div style={S.chartCard}>
                <h3 style={S.chartTitle}>🎯 Stage Distribution</h3>
                {stats.ideasByStage?.length === 0
                  ? <p style={{ color: "#bbb", fontSize: "14px" }}>No data yet.</p>
                  : (
                    <PieChart width={260} height={220} style={{ margin: "0 auto" }}>
                      <Pie data={stats.ideasByStage} dataKey="count" nameKey="stage"
                        outerRadius={90} innerRadius={50} paddingAngle={3}
                      >
                        {stats.ideasByStage.map((entry, i) => (
                          <Cell key={i} fill={STAGE_COLORS[entry.stage] || DOMAIN_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={S.tooltip} />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  )}
              </div>

              {/* Top liked leaderboard */}
              <div style={{ ...S.chartCard, gridColumn: "1 / -1" }}>
                <h3 style={S.chartTitle}>🔥 Most Liked Ideas</h3>
                {!stats.topLiked?.length
                  ? <p style={{ color: "#bbb", fontSize: "14px" }}>No likes recorded yet.</p>
                  : stats.topLiked.map((idea, i) => (
                    <div key={i} style={S.topLikedRow}>
                      <span style={{
                        ...S.topLikedRank,
                        background: i === 0 ? "#fdcb6e" : i === 1 ? "#b2bec3" : "#cd7f32",
                      }}>
                        #{i + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#1a1a2e" }}>{idea.title}</div>
                        <div style={{ fontSize: "12px", color: "#888" }}>{idea.domain}</div>
                      </div>
                      <span style={S.topLikedBadge}>❤️ {idea.likes}</span>
                      <div style={{ width: "120px", height: "8px", background: "#eee", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: "999px", background: "#e17055",
                          width: `${Math.min(100, (idea.likes / (stats.topLiked[0]?.likes || 1)) * 100)}%`,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ BROWSE / LIKED ══════════ */}
        {(activeView === "browse" || activeView === "liked") && (
          <div>
            {/* Filter bar */}
            <div style={S.filterBar}>
              <div style={S.searchWrap}>
                <span style={{ fontSize: "15px", flexShrink: 0 }}>🔍</span>
                <input
                  style={S.searchInput}
                  placeholder="Search ideas by title, problem or solution..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "14px" }}
                    onClick={() => setSearch("")}>✕</button>
                )}
              </div>

              <select style={S.select} value={filterDomain} onChange={e => setFilterDomain(e.target.value)}>
                <option value="All">All Domains</option>
                {["AI", "Fintech", "Edtech", "Healthcare"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <select style={S.select} value={filterStage} onChange={e => setFilterStage(e.target.value)}>
                <option value="All">All Stages</option>
                {["Idea", "Prototype", "MVP", "Live"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <span style={{ fontSize: "13px", color: "#aaa", fontWeight: "600", marginLeft: "auto" }}>
                {displayIdeas.length} idea{displayIdeas.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Cards */}
            {displayIdeas.length === 0 ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: "52px", marginBottom: "14px" }}>
                  {activeView === "liked" ? "💔" : "🔍"}
                </div>
                <p style={{ color: "#888", fontSize: "16px" }}>
                  {activeView === "liked"
                    ? "You haven't liked any ideas yet. Browse ideas and hit ❤️!"
                    : "No ideas match your filters. Try adjusting the search."}
                </p>
              </div>
            ) : (
              <div style={S.cardGrid}>
                {displayIdeas.map(idea => (
                  <IdeaCard
                    key={idea._id}
                    idea={idea}
                    likeLoading={likeLoading[idea._id]}
                    onView={() => handleViewIdea(idea)}
                    onLike={(e) => handleLike(idea._id, e)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════ IDEA DETAIL + AI MODAL ══════════ */}
      {selectedIdea && (
        <Modal
          title={`💡 ${selectedIdea.title}`}
          onClose={() => { setSelectedIdea(null); setIdeaAnalysis(null); }}
          maxWidth="900px"
        >
          <div style={S.ideaMetaGrid}>
            <MetaRow label="Domain"    value={selectedIdea.domain} />
            <MetaRow label="Stage"     value={selectedIdea.stage} />
            <MetaRow label="Innovator" value={selectedIdea.innovatorId?.name || "N/A"} />
            <MetaRow label="Email"     value={selectedIdea.innovatorId?.email || "N/A"} />
          </div>
          <MetaRow label="Problem"  value={selectedIdea.problem} />
          <MetaRow label="Solution" value={selectedIdea.solution} />
          <MetaRow label="Market"   value={selectedIdea.market} />
          <MetaRow label="Revenue"  value={selectedIdea.revenue} />

          {/* Like button inside modal */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "20px 0 0", padding: "16px", background: "#f9f9f9", borderRadius: "12px" }}>
            <button
              style={{
                ...S.likeBtn,
                background: selectedIdea.likedByMe
                  ? "linear-gradient(135deg, #e17055, #d63031)"
                  : "linear-gradient(135deg, #636e72, #2d3436)",
              }}
              onClick={(e) => handleLike(selectedIdea._id, e)}
              disabled={likeLoading[selectedIdea._id]}
            >
              {likeLoading[selectedIdea._id]
                ? "..."
                : selectedIdea.likedByMe ? "❤️ Liked" : "🤍 Like this Idea"}
            </button>
            <div>
              <div style={{ fontWeight: "700", fontSize: "14px", color: "#1a1a2e" }}>
                {selectedIdea.likeCount || 0} investor{(selectedIdea.likeCount || 0) !== 1 ? "s" : ""} liked this
              </div>
              <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>
                Your like helps innovators get discovered
              </div>
            </div>
          </div>

          <hr style={{ margin: "24px 0", borderColor: "#eee" }} />
          <h3 style={{ margin: "0 0 16px", color: "#1a1a2e", fontSize: "18px", fontWeight: "800" }}>
            🤖 AI Investment Analysis
          </h3>

          {analysisLoading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ ...S.spinner, borderTopColor: "#6c5ce7" }} />
              <p style={{ color: "#888", marginTop: "14px" }}>Running AI prediction engine...</p>
            </div>
          ) : ideaAnalysis ? (() => {
            const score     = ideaAnalysis.success_probability_percent;
            const { pros, cons } = getReasons(ideaAnalysis.explanation_sorted_by_impact);
            const strategic = STRATEGIC_ADVICE[ideaAnalysis.strategic_assessment] || STRATEGIC_ADVICE["Moderate Growth Potential"];

            return (
              <div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
                  <div style={S.aiCard}>
                    <p style={S.aiLabel}>Success Probability</p>
                    <ScoreRing score={score} />
                    {ideaAnalysis.raw_model_score && (
                      <p style={{ fontSize: "11px", color: "#aaa", textAlign: "center", marginTop: "6px" }}>
                        Raw: {ideaAnalysis.raw_model_score}% (adjusted)
                      </p>
                    )}
                  </div>

                  <div style={{ ...S.aiCard, flex: "1 1 160px" }}>
                    <p style={S.aiLabel}>Market Forecast</p>
                    {[
                      { label: "In 2 Years", value: `₹${(ideaAnalysis.market_forecast?.valuation_in_2_years * 83.5 * 1e6 / 1e7).toFixed(1)} Cr` },
                      { label: "In 5 Years", value: `₹${(ideaAnalysis.market_forecast?.valuation_in_5_years * 83.5 * 1e6 / 1e7).toFixed(1)} Cr` },
                    ].map((item, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                          <span style={{ fontSize: "13px", color: "#666" }}>{item.label}</span>
                          <span style={{ fontSize: "15px", fontWeight: "800", color: "#1a1a2e" }}>{item.value}</span>
                        </div>
                        {i === 0 && <div style={{ height: "1px", background: "#eee" }} />}
                      </div>
                    ))}
                  </div>

                  <div style={{ ...S.aiCard, flex: "2 1 200px", background: strategic.bg, border: `1px solid ${strategic.border}` }}>
                    <p style={{ fontSize: "14px", fontWeight: "800", color: strategic.color, margin: "0 0 8px" }}>
                      {strategic.icon} {ideaAnalysis.strategic_assessment}
                    </p>
                    <p style={{ fontSize: "13px", color: "#444", lineHeight: "1.7", margin: 0 }}>{strategic.advice}</p>
                  </div>
                </div>

                {ideaAnalysis.model_warnings?.length > 0 && (
                  <div style={{ background: "#fffbea", border: "1px solid #f5c518", borderRadius: "12px", padding: "14px 18px", marginBottom: "14px" }}>
                    <p style={{ fontWeight: "800", color: "#7a5200", fontSize: "13px", margin: "0 0 8px" }}>
                      🔍 Score adjusted from {ideaAnalysis.raw_model_score}%:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                      {ideaAnalysis.model_warnings.map((w, i) => (
                        <li key={i} style={{ fontSize: "13px", color: "#7a5200", marginBottom: "4px", lineHeight: "1.6" }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {pros.length > 0 && (
                    <div style={{ flex: "1 1 240px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#1a7a3c", margin: "0 0 10px" }}>✅ Why Invest</h4>
                      {pros.map((p, i) => (
                        <div key={i} style={{ background: "#f0fff4", border: "1px solid #b7ebc8", borderRadius: "10px", padding: "10px 14px", marginBottom: "8px" }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#1a7a3c" }}>{p.icon} {p.name}</div>
                          <p style={{ fontSize: "12px", color: "#333", margin: "4px 0 0", lineHeight: "1.5" }}>{p.pos}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {cons.length > 0 && (
                    <div style={{ flex: "1 1 240px" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#cc2200", margin: "0 0 10px" }}>⚠️ Risk Factors</h4>
                      {cons.map((c, i) => (
                        <div key={i} style={{ background: "#fff5f5", border: "1px solid #ffc8c8", borderRadius: "10px", padding: "10px 14px", marginBottom: "8px" }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#cc2200" }}>{c.icon} {c.name}</div>
                          <p style={{ fontSize: "12px", color: "#333", margin: "4px 0 0", lineHeight: "1.5" }}>{c.neg}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p style={{ fontSize: "11px", color: "#aaa", background: "#f9f9f9", borderRadius: "8px", padding: "10px 14px", marginTop: "14px", lineHeight: "1.5" }}>
                  ℹ️ AI-generated analysis for decision-support only. Not financial advice.
                </p>
              </div>
            );
          })() : (
            <p style={{ color: "#e17055", fontSize: "14px", padding: "1rem", background: "#fff5f5", borderRadius: "10px" }}>
              ⚠️ AI service unavailable — ensure predictor is running on port 8000.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════
   IDEA CARD
══════════════════════════════ */
function IdeaCard({ idea, onView, onLike, likeLoading }) {
  const stageColor = STAGE_COLORS[idea.stage] || "#6c5ce7";
  return (
    <div
      style={S.card}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"; }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ ...S.domainTag, background: `${stageColor}18`, color: stageColor }}>
          {idea.domain}
        </span>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.4px" }}>
          {idea.stage}
        </span>
      </div>

      <h3 style={S.cardTitle}>{idea.title}</h3>
      <p style={S.cardSnippet}>{idea.problem?.substring(0, 100) || "No description provided."}...</p>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "10px" }}>
        <span style={{ fontSize: "12px", color: "#aaa" }}>👤 {idea.innovatorId?.name || "Unknown"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#aaa" }}>{idea.likeCount || 0}</span>
          <button
            style={{
              padding: "5px 10px", borderRadius: "8px", cursor: "pointer",
              fontSize: "14px", fontWeight: "700", transition: "all 0.15s",
              background: idea.likedByMe ? "#fff0ed" : "#f5f5f5",
              color:      idea.likedByMe ? "#e17055" : "#aaa",
              border:     idea.likedByMe ? "1.5px solid #e17055" : "1.5px solid #eee",
            }}
            onClick={onLike}
            disabled={likeLoading}
            title={idea.likedByMe ? "Unlike" : "Like"}
          >
            {likeLoading ? "..." : idea.likedByMe ? "❤️" : "🤍"}
          </button>
        </div>
      </div>

      <button style={S.analyzeBtn} onClick={onView}>
        🤖 View + AI Analysis
      </button>
    </div>
  );
}

/* ── Small helpers ── */
const HeroStat = ({ label, value, accent }) => (
  <div style={{
    textAlign: "center", padding: "16px 22px",
    background: accent ? "#fff3f0" : "#f0f2f8",
    borderRadius: "12px", minWidth: "110px",
    border: accent ? "1.5px solid #ffccc0" : "1.5px solid #e8edf5",
  }}>
    <div style={{ fontSize: "28px", fontWeight: "800", color: accent ? "#e17055" : "#1a1a2e" }}>{value}</div>
    <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>{label}</div>
  </div>
);

const KpiCard = ({ icon, label, value, color }) => (
  <div style={{ background: "#fff", borderRadius: "14px", padding: "20px 24px", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", borderLeft: `5px solid ${color}`, flex: "1 1 160px" }}>
    <div style={{ fontSize: "24px", marginBottom: "6px" }}>{icon}</div>
    <div style={{ fontSize: "28px", fontWeight: "800", color }}>{value ?? 0}</div>
    <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{label}</div>
  </div>
);

const MetaRow = ({ label, value }) => (
  <div style={{ marginBottom: "10px" }}>
    <span style={{ fontWeight: "700", color: "#888", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}: </span>
    <span style={{ color: "#1a1a2e", fontSize: "14px" }}>{value || "N/A"}</span>
  </div>
);

/* ── STYLES ── */
const S = {
  page:     { background: "#f4f6f8", minHeight: "100vh" },

  // ── Hero — clean light style (no blue) ──
  hero:     {
    background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d4e 100%)",
    padding: "2.5rem 2.5rem 3rem",
  },
  heroInner:{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem", maxWidth: "1400px", margin: "0 auto" },
  heroBadge:{ display: "inline-block", background: "rgba(108,92,231,0.25)", color: "#a29bfe", fontSize: "12px", fontWeight: "700", padding: "5px 14px", borderRadius: "20px", marginBottom: "12px", letterSpacing: "0.5px" },
  heroTitle:{ margin: "0 0 8px", fontSize: "32px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" },
  heroSub:  { margin: 0, fontSize: "15px", color: "rgba(255,255,255,0.5)" },
  heroStats:{ display: "flex", gap: "12px", flexWrap: "wrap" },

  navBar:      { background: "#fff", borderBottom: "2px solid #f0f2f8", display: "flex", gap: "4px", padding: "0 2.5rem" },
  navTab:      { background: "none", border: "none", padding: "16px 22px", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#888", borderBottom: "3px solid transparent", transition: "all 0.15s" },
  navTabActive:{ color: "#6c5ce7", borderBottom: "3px solid #6c5ce7" },

  content:  { padding: "2rem 2.5rem", maxWidth: "1400px", margin: "0 auto" },

  kpiRow:   { display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" },
  chartsGrid:{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" },
  chartCard: { background: "#fff", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" },
  chartTitle:{ margin: "0 0 1rem", fontSize: "15px", fontWeight: "800", color: "#1a1a2e" },
  tooltip:   { borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "13px" },

  topLikedRow:  { display: "flex", alignItems: "center", gap: "14px", padding: "10px 14px", background: "#f9fafc", borderRadius: "10px", marginBottom: "8px" },
  topLikedRank: { width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: "#fff", flexShrink: 0 },
  topLikedBadge:{ fontSize: "13px", fontWeight: "700", color: "#e17055", flexShrink: 0 },

  filterBar: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "1.5rem", background: "#fff", padding: "16px 20px", borderRadius: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  searchWrap:{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 260px", background: "#f5f7fa", borderRadius: "10px", padding: "10px 14px", border: "1.5px solid #eee" },
  searchInput:{ border: "none", background: "none", outline: "none", fontSize: "14px", color: "#1a1a2e", width: "100%" },
  select:    { padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #eee", fontSize: "14px", color: "#555", background: "#f5f7fa", cursor: "pointer", outline: "none" },

  cardGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.2rem" },
  card:      { background: "#fff", borderRadius: "16px", padding: "1.4rem", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", cursor: "default", transition: "transform 0.15s, box-shadow 0.15s", display: "flex", flexDirection: "column", gap: "10px" },
  domainTag: { fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.4px" },
  cardTitle: { margin: 0, fontSize: "15px", fontWeight: "800", color: "#1a1a2e", lineHeight: "1.4" },
  cardSnippet:{ margin: 0, fontSize: "13px", color: "#888", lineHeight: "1.6", flex: 1 },
  analyzeBtn:{ width: "100%", padding: "11px", background: "linear-gradient(135deg, #6c5ce7, #5a4bdc)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "13px", marginTop: "4px" },

  likeBtn:   { padding: "12px 24px", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  emptyState:{ textAlign: "center", padding: "4rem 2rem", background: "#fff", borderRadius: "16px", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" },

  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "1rem", overflowY: "auto" },
  modal:      { background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "700px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px rgba(0,0,0,0.3)" },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.4rem 1.8rem", borderBottom: "1px solid #eee", flexShrink: 0 },
  modalHeading:{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#1a1a2e" },
  modalBody:  { padding: "1.8rem", overflowY: "auto", flex: 1 },
  iconBtn:    { background: "#f0f0f0", border: "none", borderRadius: "8px", width: "34px", height: "34px", cursor: "pointer", fontSize: "16px", color: "#555", display: "flex", alignItems: "center", justifyContent: "center" },

  ideaMetaGrid:{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1.5rem", marginBottom: "10px" },
  aiCard:     { flex: "0 0 auto", background: "#f7f7ff", borderRadius: "14px", padding: "1.2rem", border: "1px solid #e0e0ff", minWidth: "140px" },
  aiLabel:    { fontSize: "11px", fontWeight: "700", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" },

  spinner:    { width: "40px", height: "40px", margin: "0 auto", border: "4px solid #eee", borderTopColor: "#6c5ce7", borderRadius: "50%", animation: "spin 1s linear infinite" },
};
