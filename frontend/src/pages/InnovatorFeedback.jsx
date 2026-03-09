import axios from "axios";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const COLORS = ["#6c5ce7", "#00b894", "#0984e3", "#e17055", "#fdcb6e", "#fd79a8"];
const STAGE_COLORS = { Idea: "#fdcb6e", Prototype: "#0984e3", MVP: "#00b894", Live: "#6c5ce7" };

export default function InnovatorFeedback() {
  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [expanded, setExpanded] = useState({}); // which idea cards are expanded

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/innovator/feedback",
          { headers }
        );
        setData(res.data);
      } catch (err) {
        setError("Failed to load feedback data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <div style={S.loaderPage}>
      <div style={S.spinner} />
      <p style={{ color: "#888", marginTop: "16px" }}>Loading your feedback...</p>
    </div>
  );

  if (error) return (
    <div style={S.loaderPage}>
      <p style={{ color: "#cc2200", fontSize: "16px" }}>{error}</p>
    </div>
  );

  const { feedback, stats } = data;

  // Radar data — show likes per idea (top 6)
  const radarData = feedback
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 6)
    .map(f => ({
      idea:  f.ideaTitle.length > 16 ? f.ideaTitle.substring(0, 16) + "…" : f.ideaTitle,
      likes: f.likeCount,
    }));

  return (
    <div style={S.page}>

      {/* ── HERO ── */}
      <div style={S.hero}>
        <div>
          <div style={S.heroBadge}>💬 Investor Feedback</div>
          <h1 style={S.heroTitle}>Who's Interested in Your Ideas?</h1>
          <p style={S.heroSub}>Track investor likes, engagement trends, and idea performance</p>
        </div>
        <div style={S.heroStats}>
          <HeroStat label="Total Likes"       value={stats.totalLikes} />
          <HeroStat label="Unique Investors"  value={stats.uniqueInvestors} accent />
          <HeroStat label="Ideas Submitted"   value={feedback.length} />
        </div>
      </div>

      <div style={S.content}>

        {/* ── KPI CARDS ── */}
        <div style={S.kpiRow}>
          <KpiCard icon="❤️"  label="Total Likes"      value={stats.totalLikes}      color="#e17055" />
          <KpiCard icon="👥"  label="Unique Investors"  value={stats.uniqueInvestors}  color="#6c5ce7" />
          <KpiCard icon="💡"  label="Ideas Posted"      value={feedback.length}        color="#0984e3" />
          <KpiCard
            icon="🏆"
            label="Most Liked Idea"
            value={stats.mostLikedIdea?.likes ?? 0}
            sub={stats.mostLikedIdea?.title ?? "—"}
            color="#00b894"
          />
        </div>

        {/* ── CHARTS ROW ── */}
        {stats.totalLikes > 0 ? (
          <div style={S.chartsGrid}>

            {/* Likes by Domain */}
            <div style={S.chartCard}>
              <h3 style={S.chartTitle}>❤️ Likes by Domain</h3>
              {stats.likesByDomain.length === 0
                ? <EmptyChart />
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.likesByDomain} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="domain" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={S.tooltip} />
                      <Bar dataKey="likes" name="Likes" radius={[8, 8, 0, 0]}>
                        {stats.likesByDomain.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>

            {/* Likes by Stage Pie */}
            <div style={S.chartCard}>
              <h3 style={S.chartTitle}>🎯 Likes by Stage</h3>
              {stats.likesByStage.length === 0
                ? <EmptyChart />
                : (
                  <PieChart width={260} height={220} style={{ margin: "0 auto" }}>
                    <Pie
                      data={stats.likesByStage}
                      dataKey="likes"
                      nameKey="stage"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={3}
                    >
                      {stats.likesByStage.map((entry, i) => (
                        <Cell key={i} fill={STAGE_COLORS[entry.stage] || COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={S.tooltip} />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                )}
            </div>

            {/* Radar — per-idea likes */}
            {radarData.length > 1 && (
              <div style={{ ...S.chartCard, gridColumn: "1 / -1" }}>
                <h3 style={S.chartTitle}>📡 Idea Engagement Overview</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#eee" />
                    <PolarAngleAxis dataKey="idea" tick={{ fontSize: 12, fill: "#555" }} />
                    <PolarRadiusAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#aaa" }} />
                    <Radar name="Likes" dataKey="likes" stroke="#6c5ce7" fill="#6c5ce7" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={S.tooltip} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Like leaderboard */}
            <div style={{ ...S.chartCard, gridColumn: "1 / -1" }}>
              <h3 style={S.chartTitle}>🏅 Idea Leaderboard</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {[...feedback]
                  .sort((a, b) => b.likeCount - a.likeCount)
                  .map((f, i) => (
                    <div key={f.ideaId} style={S.leaderRow}>
                      <span style={{
                        ...S.rankBadge,
                        background: i === 0 ? "#fdcb6e" : i === 1 ? "#b2bec3" : i === 2 ? "#cd7f32" : "#f0f0f0",
                        color:      i < 3 ? "#fff" : "#aaa",
                      }}>
                        #{i + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "#1a1a2e" }}>{f.ideaTitle}</div>
                        <div style={{ fontSize: "12px", color: "#aaa" }}>{f.domain} • {f.stage}</div>
                      </div>
                      <span style={S.likeBadge}>❤️ {f.likeCount}</span>
                      <div style={{ width: "150px", height: "8px", background: "#f0f0f0", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          borderRadius: "999px",
                          background: "linear-gradient(90deg, #6c5ce7, #a29bfe)",
                          width: `${feedback[0]?.likeCount > 0 ? (f.likeCount / feedback[0].likeCount) * 100 : 0}%`,
                          transition: "width 0.7s ease",
                        }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={S.noLikesBox}>
            <div style={{ fontSize: "52px", marginBottom: "12px" }}>💤</div>
            <h3 style={{ margin: "0 0 8px", color: "#1a1a2e", fontSize: "18px" }}>No likes yet</h3>
            <p style={{ color: "#888", fontSize: "14px", maxWidth: "380px", lineHeight: "1.6" }}>
              Once investors browse your ideas and click ❤️, you'll see their names and engagement analytics here.
            </p>
          </div>
        )}

        {/* ── PER-IDEA INVESTOR LIST ── */}
        <div style={{ marginTop: "2rem" }}>
          <h2 style={S.sectionTitle}>👥 Investor Interest — Per Idea</h2>

          {feedback.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: "14px" }}>No ideas submitted yet.</p>
          ) : (
            feedback.map(f => (
              <div key={f.ideaId} style={S.ideaBlock}>
                {/* Idea header */}
                <div
                  style={S.ideaBlockHeader}
                  onClick={() => setExpanded(p => ({ ...p, [f.ideaId]: !p[f.ideaId] }))}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "10px",
                      background: STAGE_COLORS[f.stage] || "#6c5ce7",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "18px", flexShrink: 0,
                    }}>
                      💡
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "15px", color: "#1a1a2e" }}>{f.ideaTitle}</div>
                      <div style={{ fontSize: "12px", color: "#aaa" }}>{f.domain} • {f.stage}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{
                      background: f.likeCount > 0 ? "#fff0ed" : "#f5f5f5",
                      color:      f.likeCount > 0 ? "#e17055" : "#aaa",
                      border:     f.likeCount > 0 ? "1.5px solid #ffccc0" : "1.5px solid #eee",
                      borderRadius: "20px", padding: "4px 14px",
                      fontSize: "13px", fontWeight: "700",
                    }}>
                      ❤️ {f.likeCount} {f.likeCount === 1 ? "like" : "likes"}
                    </span>
                    <span style={{ color: "#aaa", fontSize: "18px" }}>
                      {expanded[f.ideaId] ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Expanded investor list */}
                {expanded[f.ideaId] && (
                  <div style={S.ideaBlockBody}>
                    {f.likedBy.length === 0 ? (
                      <p style={{ color: "#aaa", fontSize: "13px", padding: "12px 0" }}>
                        No investors have liked this idea yet.
                      </p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                        {f.likedBy.map((inv, i) => (
                          <div key={i} style={S.investorCard}>
                            <div style={S.investorAvatar}>
                              {inv.investorName?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "14px", color: "#1a1a2e" }}>
                                {inv.investorName}
                              </div>
                              <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                                {inv.investorEmail}
                              </div>
                              <div style={{ fontSize: "11px", color: "#6c5ce7", marginTop: "4px", fontWeight: "600" }}>
                                ✅ Interested Investor
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

/* ── Subcomponents ── */
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

const KpiCard = ({ icon, label, value, color, sub }) => (
  <div style={{ background: "#fff", borderRadius: "14px", padding: "20px 24px", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", borderLeft: `5px solid ${color}`, flex: "1 1 160px" }}>
    <div style={{ fontSize: "24px", marginBottom: "6px" }}>{icon}</div>
    <div style={{ fontSize: "28px", fontWeight: "800", color }}>{value}</div>
    <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{label}</div>
    {sub && <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>{sub}</div>}
  </div>
);

const EmptyChart = () => (
  <div style={{ textAlign: "center", padding: "2rem", color: "#ddd", fontSize: "14px" }}>
    📭 No data yet
  </div>
);

/* ── STYLES ── */
const S = {
  page:     { background: "#f4f6f8", minHeight: "100vh" },

  loaderPage: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f4f6f8" },
  spinner:    { width: "40px", height: "40px", margin: "0 auto", border: "4px solid #eee", borderTop: "4px solid #6c5ce7", borderRadius: "50%", animation: "spin 1s linear infinite" },

  hero:      { background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d4e 100%)", padding: "2.5rem 2.5rem 3rem" },
  heroInner: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" },
  heroBadge: { display: "inline-block", background: "rgba(108,92,231,0.25)", color: "#a29bfe", fontSize: "12px", fontWeight: "700", padding: "5px 14px", borderRadius: "20px", marginBottom: "12px", letterSpacing: "0.5px" },
  heroTitle: { margin: "0 0 8px", fontSize: "28px", fontWeight: "800", color: "#fff" },
  heroSub:   { margin: 0, fontSize: "15px", color: "rgba(255,255,255,0.5)" },
  heroStats: { display: "flex", gap: "12px", flexWrap: "wrap" },

  content:   { padding: "2rem 2.5rem", maxWidth: "1400px", margin: "0 auto" },

  kpiRow:    { display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" },

  chartsGrid:{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "2rem" },
  chartCard: { background: "#fff", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" },
  chartTitle:{ margin: "0 0 1rem", fontSize: "15px", fontWeight: "800", color: "#1a1a2e" },
  tooltip:   { borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "13px" },

  leaderRow:  { display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "#f9fafc", borderRadius: "10px" },
  rankBadge:  { width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", flexShrink: 0 },
  likeBadge:  { fontSize: "13px", fontWeight: "700", color: "#e17055", flexShrink: 0, minWidth: "50px", textAlign: "right" },

  noLikesBox: { background: "#fff", borderRadius: "16px", padding: "3rem 2rem", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", marginBottom: "2rem" },

  sectionTitle:{ fontSize: "20px", fontWeight: "800", color: "#1a1a2e", marginBottom: "1rem" },

  ideaBlock:  { background: "#fff", borderRadius: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.07)", marginBottom: "12px", overflow: "hidden" },
  ideaBlockHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", cursor: "pointer", transition: "background 0.15s" },
  ideaBlockBody:   { padding: "0 20px 20px", borderTop: "1px solid #f0f0f0" },

  investorCard:   { display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "#f9fafc", borderRadius: "12px", border: "1px solid #eee" },
  investorAvatar: { width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #6c5ce7, #a29bfe)", color: "#fff", fontWeight: "800", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};
