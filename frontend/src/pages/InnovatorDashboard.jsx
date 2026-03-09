import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#6c5ce7", "#00b894", "#0984e3", "#e17055", "#fdcb6e", "#b2bec3"];

export default function InnovatorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "http://localhost:5000/api/innovator/dashboard-stats",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div style={S.loaderPage}>
      <div style={S.spinner} />
      <p style={{ color: "#666", marginTop: "16px" }}>Loading your dashboard...</p>
    </div>
  );

  if (error) return (
    <div style={S.loaderPage}>
      <p style={{ color: "#cc2200", fontSize: "16px" }}>{error}</p>
    </div>
  );

  const { total, stageCounts, ideasByDomain, ideaStatusData } = stats;

  return (
    <div style={S.page}>

      {/* ── HERO HEADER ── */}
      <div style={S.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800" }}>
            👨‍💻 Innovator Dashboard
          </h1>
          <p style={{ margin: "6px 0 0", opacity: 0.85, fontSize: "15px" }}>
            Track your ideas and attract investors visually
          </p>
        </div>
        <div style={S.headerBadge}>
          <span style={{ display: "block", fontSize: "36px", fontWeight: "800", lineHeight: 1 }}>
            {total}
          </span>
          <span style={{ fontSize: "12px", opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total Ideas
          </span>
        </div>
      </div>

      {/* ── ACTION CARDS ── */}
      <div style={S.grid}>
        <ActionCard title="Post New Idea"      desc="Submit innovation for AI & investor review" icon="🚀" color="#6c5ce7" onClick={() => navigate("/innovator/post-idea")} />
        <ActionCard title="My Ideas"           desc="Track progress of submitted ideas"           icon="📂" color="#00b894" onClick={() => navigate("/innovator/my-ideas")} />
        <ActionCard title="Investor Feedback"  desc="See interest & messages from investors"      icon="💬" color="#fdcb6e" onClick={() => navigate("/innovator/feedback")} />
      </div>

      {/* ── STAT STRIP ── */}
      <div style={S.stats}>
        <StatBox title="Total Ideas"   value={total}                      color="#0984e3" icon="💡" />
        <StatBox title="Idea Stage"    value={stageCounts.Idea || 0}      color="#e17055" icon="🌱" />
        <StatBox title="Prototype"     value={stageCounts.Prototype || 0} color="#6c5ce7" icon="🔧" />
        <StatBox title="MVP"           value={stageCounts.MVP || 0}       color="#00b894" icon="⚡" />
        <StatBox title="Live Product"  value={stageCounts.Live || 0}      color="#fdcb6e" icon="🚀" />
      </div>

      {/* ── CHARTS ── */}
      <div style={S.charts}>

        {/* Pie — Stage breakdown */}
        <div style={S.chartCard}>
          <h3 style={S.chartTitle}>📊 Ideas by Stage</h3>
          {ideaStatusData.length === 0 ? (
            <EmptyState msg="No ideas submitted yet" />
          ) : (
            <>
              <PieChart width={260} height={220} style={{ margin: "0 auto" }}>
                <Pie
                  data={ideaStatusData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  innerRadius={48}
                  paddingAngle={4}
                >
                  {ideaStatusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={S.tooltipStyle} />
              </PieChart>
              <div style={S.legend}>
                {ideaStatusData.map((item, i) => (
                  <div key={i} style={S.legendItem}>
                    <div style={{ ...S.legendDot, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={S.legendLabel}>{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar — Domain breakdown */}
        <div style={S.chartCard}>
          <h3 style={S.chartTitle}>📈 Ideas by Domain</h3>
          {ideasByDomain.length === 0 ? (
            <EmptyState msg="No domain data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ideasByDomain} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="domain" tick={{ fontSize: 13, fill: "#555" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#aaa" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={S.tooltipStyle} cursor={{ fill: "#f0eeff" }} />
                <Bar dataKey="count" name="Ideas" radius={[8, 8, 0, 0]}>
                  {ideasByDomain.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── TIPS ── */}
      <div style={S.tipsRow}>
        <TipCard icon="💡" title="Strengthen your idea"   tip="Ideas with a clear problem, defined target market, and a revenue model get 3x more investor interest." />
        <TipCard icon="🔍" title="Avoid duplicates"       tip="Our AI checks your idea for similarity before submission. Make your solution distinct to avoid rejection." />
        <TipCard icon="📈" title="Move to next stage"     tip="Ideas at MVP or Live stage have significantly higher AI success scores than Idea-stage submissions." />
      </div>

    </div>
  );
}

/* ── SUBCOMPONENTS ── */

const ActionCard = ({ title, desc, icon, color, onClick }) => (
  <div
    onClick={onClick}
    style={{ ...S.card, borderLeft: `6px solid ${color}` }}
    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
  >
    <div style={{ fontSize: "28px", marginBottom: "8px" }}>{icon}</div>
    <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#1a1a2e" }}>{title}</h3>
    <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>{desc}</p>
  </div>
);

const StatBox = ({ title, value, color, icon }) => (
  <div style={{ ...S.statBox, background: color }}>
    <div style={{ fontSize: "22px", marginBottom: "4px" }}>{icon}</div>
    <h2 style={{ margin: "4px 0", fontSize: "28px", fontWeight: "800" }}>{value}</h2>
    <span style={{ fontSize: "11px", opacity: 0.9, textTransform: "uppercase", letterSpacing: "0.4px" }}>{title}</span>
  </div>
);

const TipCard = ({ icon, title, tip }) => (
  <div style={S.tipCard}>
    <span style={{ fontSize: "24px", flexShrink: 0 }}>{icon}</span>
    <div>
      <p style={{ margin: "0 0 4px", fontWeight: "700", fontSize: "14px", color: "#1a1a2e" }}>{title}</p>
      <p style={{ margin: 0, fontSize: "13px", color: "#666", lineHeight: "1.5" }}>{tip}</p>
    </div>
  </div>
);

const EmptyState = ({ msg }) => (
  <div style={{ padding: "2rem", color: "#bbb", fontSize: "14px" }}>📭 {msg}</div>
);

/* ── STYLES ── */
const S = {
  page: { padding: "2.5rem", background: "#f4f6f8", minHeight: "100vh" },
  loaderPage: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#f4f6f8",
  },
  spinner: {
    width: "48px", height: "48px",
    border: "5px solid #eee", borderTop: "5px solid #6c5ce7",
    borderRadius: "50%", animation: "spin 1s linear infinite",
  },
  header: {
    background: "linear-gradient(135deg, #6c5ce7, #00b894)",
    color: "white", padding: "2rem 2.5rem", borderRadius: "20px",
    marginBottom: "2rem", display: "flex",
    justifyContent: "space-between", alignItems: "center",
  },
  headerBadge: {
    background: "rgba(255,255,255,0.2)", borderRadius: "14px",
    padding: "1rem 1.8rem", textAlign: "center",
    backdropFilter: "blur(8px)", color: "#fff",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem", marginBottom: "2rem",
  },
  card: {
    background: "#fff", padding: "1.6rem", borderRadius: "16px",
    cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    transition: "transform 0.2s ease",
  },
  stats: { display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" },
  statBox: {
    color: "#fff", padding: "1.2rem 1.8rem", borderRadius: "14px",
    textAlign: "center", flex: "1 1 130px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
  },
  charts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1.5rem", marginBottom: "2rem",
  },
  chartCard: {
    background: "#fff", padding: "1.8rem", borderRadius: "16px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  chartTitle: { margin: "0 0 1rem", fontSize: "16px", fontWeight: "700", color: "#1a1a2e" },
  tooltipStyle: { borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  legend: { display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "10px" },
  legendItem: { display: "flex", alignItems: "center", gap: "6px" },
  legendDot: { width: "10px", height: "10px", borderRadius: "50%" },
  legendLabel: { fontSize: "12px", color: "#555" },
  tipsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1rem",
  },
  tipCard: {
    background: "#fff", borderRadius: "14px", padding: "1.2rem 1.4rem",
    display: "flex", gap: "12px", alignItems: "flex-start",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
  },
};
