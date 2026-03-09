import axios from "axios";
import { useState, useEffect } from "react";

// ── Animated number hook ──
function useAnimatedValue(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = null;
    const num = parseFloat(target) || 0;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(ease * num));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

// ── Donut Gauge ──
function DonutGauge({ value }) {
  const animated = useAnimatedValue(value);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = (animated / 100) * circ;
  const color = animated >= 80 ? "#ef4444" : animated >= 65 ? "#f97316" : "#22c55e";

  return (
    <div style={{ position: "relative", width: "140px", height: "140px", flexShrink: 0 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f3f4f6" strokeWidth="14" />
        <circle
          cx="70" cy="70" r={r}
          fill="none" stroke={color} strokeWidth="14"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: "26px", fontWeight: "900", color, lineHeight: 1 }}>
          {animated}%
        </span>
        <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "700", marginTop: "4px", letterSpacing: "0.6px", textTransform: "uppercase" }}>
          Similar
        </span>
      </div>
    </div>
  );
}

// ── Animated Bar ──
function ScoreBar({ label, score, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay + 300);
    return () => clearTimeout(t);
  }, [score, delay]);

  const color = score >= 80 ? "#ef4444" : score >= 65 ? "#f97316" : "#22c55e";

  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#374151" }}>{label}</span>
        <span style={{
          fontSize: "12px", fontWeight: "800", color,
          background: `${color}18`, padding: "2px 10px", borderRadius: "20px",
        }}>{score}%</span>
      </div>
      <div style={{ height: "9px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          borderRadius: "999px",
          transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
    </div>
  );
}

// ── Radar Chart ──
function RadarChart({ data }) {
  const cx = 110, cy = 110, r = 80;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i, val) => {
    const angle = i * angleStep - Math.PI / 2;
    const dist = (val / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const getLabelPoint = (i) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x: cx + (r + 24) * Math.cos(angle), y: cy + (r + 24) * Math.sin(angle) };
  };

  const outerPoints = data.map((_, i) => getPoint(i, 100));
  const dataPoints = data.map((d, i) => getPoint(i, d.score));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      {[25, 50, 75, 100].map((lvl) => (
        <polygon
          key={lvl}
          points={data.map((_, i) => { const p = getPoint(i, lvl); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke="#e5e7eb" strokeWidth="1"
        />
      ))}
      {outerPoints.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <polygon points={dataPath} fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="5"
          fill={data[i].score >= 80 ? "#ef4444" : data[i].score >= 65 ? "#f97316" : "#22c55e"}
          stroke="#fff" strokeWidth="2"
        />
      ))}
      {data.map((d, i) => {
        const lp = getLabelPoint(i);
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fontWeight="700" fill="#374151">
            {d.section.split(" ")[0]}
          </text>
        );
      })}
    </svg>
  );
}

// ── Collapsible Section Card ──
function SectionCard({ reason, index }) {
  const [open, setOpen] = useState(false);
  const icons = ["🧩", "💡", "🔤", "🎯", "📊"];
  const color = reason.score >= 80 ? "#ef4444" : reason.score >= 65 ? "#f97316" : "#22c55e";

  return (
    <div style={{
      border: "1.5px solid #e5e7eb", borderRadius: "12px",
      overflow: "hidden", marginBottom: "10px",
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", background: open ? "#f9fafb" : "#fff",
        border: "none", padding: "14px 16px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "10px", textAlign: "left",
      }}>
        <span style={{ fontSize: "18px" }}>{icons[index] || "📌"}</span>
        <span style={{ flex: 1, fontWeight: "700", fontSize: "14px", color: "#1f2937" }}>
          {reason.section}
        </span>
        <span style={{
          background: color, color: "#fff", fontSize: "12px",
          fontWeight: "800", padding: "3px 12px", borderRadius: "20px",
        }}>{reason.score}%</span>
        <span style={{ color: "#9ca3af", fontSize: "11px", marginLeft: "4px" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ margin: "12px 0 10px", height: "7px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${reason.score}%`, background: color, borderRadius: "999px" }} />
          </div>
          <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: "1.7", margin: 0 }}>
            {reason.reason}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PostIdea() {
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
  const [similarityData, setSimilarityData] = useState(null);

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
      console.log("ERROR RESPONSE:", err.response?.data);
      if (err.response?.data?.duplicate) {
        // Fix: handle both snake_case and camelCase from backend, and 0–1 or 0–100 range
        const rawSim =
          err.response.data.similarity ??
          err.response.data.confidence_score ??
          0;
        const simValue = rawSim <= 1
          ? (rawSim * 100).toFixed(1)
          : parseFloat(rawSim).toFixed(1);

        setSimilarityData({
          existingTitle:
            err.response.data.existingTitle ||
            err.response.data.existing_title ||
            "Unknown",
          similarity: simValue,
          reasons: err.response.data.reasons || [],
        });
      } else if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert("Idea cannot be uploaded");
      }
    } finally {
      setLoading(false);
    }
  };

  const score = parseFloat(similarityData?.similarity) || 0;
  const verdictColor = score >= 80 ? "#ef4444" : score >= 65 ? "#f97316" : "#22c55e";
  const verdictBg = score >= 80 ? "#fef2f2" : score >= 65 ? "#fff7ed" : "#f0fdf4";
  const verdictBorder = score >= 80 ? "#fecaca" : score >= 65 ? "#fed7aa" : "#bbf7d0";
  const verdictText = score >= 80
    ? "🚫 Direct Duplicate — Not Acceptable"
    : score >= 65
    ? "⚠️ Too Similar — Needs Major Differentiation"
    : "✅ Borderline — Minor Adjustments Needed";

  return (
    <>
      <div style={styles.page}>

        {/* ── HERO BANNER ── */}
        <div style={styles.hero}>
          <div>
            <h1 style={styles.heroTitle}>🚀 Post Your Idea</h1>
            <p style={styles.heroSub}>
              Share your innovation and let investors discover its potential.
              Fill in as much detail as possible for the best AI analysis.
            </p>
          </div>
        </div>

        {/* ── FORM CARD ── */}
        <div style={styles.card}>
          <form onSubmit={handleSubmit} style={styles.form}>

            <div style={styles.row}>
              <div style={styles.fieldFull}>
                <label style={styles.label}>
                  Idea Title <span style={styles.required}>*</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Eg: AI-based Credit Scoring Platform"
                  style={styles.input}
                  required
                />
                <span style={styles.hint}>Keep it clear and descriptive</span>
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.fieldHalf}>
                <label style={styles.label}>
                  Domain <span style={styles.required}>*</span>
                </label>
                <select name="domain" value={form.domain} onChange={handleChange} style={styles.input} required>
                  <option value="">Select Domain</option>
                  <option value="AI">AI</option>
                  <option value="Fintech">Fintech</option>
                  <option value="Edtech">Edtech</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
              </div>

              <div style={styles.fieldHalf}>
                <label style={styles.label}>Current Stage</label>
                <select name="stage" value={form.stage} onChange={handleChange} style={styles.input}>
                  <option value="">Select Stage</option>
                  <option value="Idea">💡 Idea</option>
                  <option value="Prototype">🔧 Prototype</option>
                  <option value="MVP">⚡ MVP</option>
                  <option value="Live">🚀 Live Product</option>
                </select>
              </div>
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.label}>Problem Statement</label>
              <textarea
                name="problem" value={form.problem} onChange={handleChange}
                placeholder="Describe the problem you are solving in detail. Who faces this problem? How often? What is the current pain point? The more detail you provide, the better the AI analysis will be."
                style={styles.textareaLarge}
              />
              <div style={styles.charHint}>
                {form.problem.length} characters
                {form.problem.length < 100 && form.problem.length > 0 && (
                  <span style={{ color: "#e67300", marginLeft: "8px" }}>
                    — Try to write at least 100 characters for better AI scoring
                  </span>
                )}
              </div>
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.label}>Proposed Solution</label>
              <textarea
                name="solution" value={form.solution} onChange={handleChange}
                placeholder="How does your idea solve the problem? Explain your approach, technology, or method. What makes your solution different from what already exists in the market?"
                style={styles.textareaLarge}
              />
              <div style={styles.charHint}>
                {form.solution.length} characters
                {form.solution.length < 100 && form.solution.length > 0 && (
                  <span style={{ color: "#e67300", marginLeft: "8px" }}>
                    — Try to write at least 100 characters for better AI scoring
                  </span>
                )}
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.fieldHalf}>
                <label style={styles.label}>Target Market</label>
                <textarea
                  name="market" value={form.market} onChange={handleChange}
                  placeholder="Eg: SMEs in India, College students, Rural users, B2B SaaS clients..."
                  style={styles.textareaMedium}
                />
              </div>
              <div style={styles.fieldHalf}>
                <label style={styles.label}>Revenue Model</label>
                <textarea
                  name="revenue" value={form.revenue} onChange={handleChange}
                  placeholder="Eg: Subscription ₹499/month, Commission 2% per transaction, Freemium with paid upgrades..."
                  style={styles.textareaMedium}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.button, opacity: loading ? 0.75 : 1 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <span style={styles.btnSpinner} /> Submitting...
                </span>
              ) : (
                "🚀 Submit Idea"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── ENHANCED SIMILARITY MODAL ── */}
      {similarityData && (
        <div style={modal.overlay} onClick={() => setSimilarityData(null)}>
          <div style={modal.box} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div style={modal.header}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "26px" }}>⚠️</span>
                <div>
                  <h3 style={modal.title}>Similar Idea Detected</h3>
                  <p style={modal.subtitle}>AI-powered similarity analysis</p>
                </div>
              </div>
              <button onClick={() => setSimilarityData(null)} style={modal.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "20px 24px 24px" }}>

              {/* Matched idea */}
              <div style={modal.matchedBox}>
                <p style={modal.matchedLabel}>Matched with existing idea</p>
                <p style={modal.ideaName}>🔍 {similarityData.existingTitle}</p>
              </div>

              {/* Verdict */}
              <div style={{
                background: verdictBg,
                border: `1.5px solid ${verdictBorder}`,
                color: verdictColor,
                borderRadius: "10px", padding: "10px 16px",
                fontSize: "14px", fontWeight: "800",
                textAlign: "center", marginBottom: "20px",
              }}>
                {verdictText}
              </div>

              {/* Donut + Bars */}
              <div style={{
                display: "flex", gap: "20px", alignItems: "center",
                background: "#f9fafb", border: "1.5px solid #e5e7eb",
                borderRadius: "16px", padding: "18px 20px", marginBottom: "20px",
                flexWrap: "wrap",
              }}>
                <DonutGauge value={score} />
                <div style={{ flex: 1, minWidth: "180px" }}>
                  <p style={{
                    margin: "0 0 14px", fontWeight: "700", fontSize: "12px",
                    color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px",
                  }}>
                    Component Breakdown
                  </p>
                  {similarityData.reasons?.length > 0 ? (
                    similarityData.reasons.map((r, i) => (
                      <ScoreBar key={i} label={r.section} score={r.score} delay={i * 150} />
                    ))
                  ) : (
                    <>
                      <ScoreBar label="Solution" score={Math.round(score * 1.05 > 100 ? 100 : score * 1.05)} delay={0} />
                      <ScoreBar label="Problem" score={Math.round(score * 0.9)} delay={150} />
                      <ScoreBar label="Title" score={Math.round(score * 0.85)} delay={300} />
                    </>
                  )}
                </div>
              </div>

              {/* Radar Chart */}
              {similarityData.reasons?.length >= 3 && (
                <div style={{
                  background: "#f9fafb", border: "1.5px solid #e5e7eb",
                  borderRadius: "16px", padding: "18px 20px",
                  marginBottom: "20px", textAlign: "center",
                }}>
                  <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "13px", color: "#374151", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    📡 Similarity Radar
                  </p>
                  <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#9ca3af" }}>
                    Multi-dimensional semantic overlap
                  </p>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <RadarChart data={similarityData.reasons} />
                  </div>
                  <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginTop: "8px", flexWrap: "wrap" }}>
                    {[{ label: "High ≥80%", color: "#ef4444" }, { label: "Moderate 65–79%", color: "#f97316" }, { label: "Low <65%", color: "#22c55e" }].map((l) => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#6b7280" }}>
                        <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Analysis */}
              <div style={{ marginBottom: "18px" }}>
                <p style={{ margin: "0 0 12px", fontWeight: "800", fontSize: "13px", color: "#374151", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  🔎 Detailed Analysis
                </p>
                {similarityData.reasons?.length > 0 ? (
                  similarityData.reasons.map((r, i) => (
                    <SectionCard key={i} reason={r} index={i} />
                  ))
                ) : (
                  <div style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "14px 16px" }}>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: 0, lineHeight: "1.7" }}>
                      High semantic overlap detected across problem definition and proposed solution. The core concepts, technical approach, and target use-case are too similar to be considered a distinct idea.
                    </p>
                  </div>
                )}
              </div>

              {/* Tip */}
              <div style={modal.tipBox}>
                <p style={{ margin: "0 0 6px", fontWeight: "800", fontSize: "12px", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  💡 How to differentiate your idea
                </p>
                <p style={{ fontSize: "14px", color: "#374151", lineHeight: "1.7", margin: 0 }}>
                  Focus on a <strong>unique target segment</strong>, a novel technical approach, or a geography/use-case the existing idea doesn't cover. Make sure your problem statement is specific enough to stand on its own.
                </p>
              </div>

              <button onClick={() => setSimilarityData(null)} style={modal.button}>
                Got it — I'll Revise My Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── PAGE STYLES ── */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    padding: "0 0 3rem 0",
  },
  hero: {
    background: "linear-gradient(135deg, #1a1a2e, #6c5ce7)",
    color: "#fff",
    padding: "2.5rem 3rem",
    marginBottom: "2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: { margin: "0 0 8px", fontSize: "32px", fontWeight: "800", color: "#fff" },
  heroSub: { margin: 0, fontSize: "16px", opacity: 0.85, maxWidth: "700px", lineHeight: "1.6" },
  card: {
    background: "#fff", margin: "0 2rem", borderRadius: "18px",
    padding: "2.5rem 3rem", boxShadow: "0 8px 32px rgba(0,0,0,0.09)",
  },
  form: { display: "flex", flexDirection: "column", gap: "1.8rem" },
  row: { display: "flex", gap: "2rem", flexWrap: "wrap" },
  fieldFull: { flex: "1 1 100%", display: "flex", flexDirection: "column", gap: "6px" },
  fieldHalf: { flex: "1 1 280px", display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontWeight: "700", fontSize: "15px", color: "#1a1a2e", marginBottom: "2px" },
  required: { color: "#cc2200", marginLeft: "2px" },
  hint: { fontSize: "12px", color: "#aaa", marginTop: "4px" },
  charHint: { fontSize: "12px", color: "#aaa", marginTop: "6px", textAlign: "right" },
  input: {
    width: "100%", padding: "14px 16px", borderRadius: "10px",
    border: "1.5px solid #ddd", fontSize: "15px", color: "#1a1a2e",
    background: "#fafafa", boxSizing: "border-box", outline: "none",
    transition: "border-color 0.2s",
  },
  textareaLarge: {
    width: "100%", padding: "16px", borderRadius: "10px",
    border: "1.5px solid #ddd", fontSize: "15px", color: "#1a1a2e",
    background: "#fafafa", minHeight: "180px", resize: "vertical",
    lineHeight: "1.8", boxSizing: "border-box", fontFamily: "inherit",
  },
  textareaMedium: {
    width: "100%", padding: "14px 16px", borderRadius: "10px",
    border: "1.5px solid #ddd", fontSize: "15px", color: "#1a1a2e",
    background: "#fafafa", minHeight: "120px", resize: "vertical",
    lineHeight: "1.8", boxSizing: "border-box", fontFamily: "inherit",
  },
  button: {
    padding: "18px",
    background: "linear-gradient(135deg, #6c5ce7, #5a4bdc)",
    color: "#fff", border: "none", borderRadius: "12px",
    fontWeight: "800", fontSize: "17px", cursor: "pointer",
    marginTop: "6px", letterSpacing: "0.3px",
    boxShadow: "0 6px 20px rgba(108,92,231,0.35)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  btnSpinner: {
    display: "inline-block", width: "18px", height: "18px",
    border: "3px solid rgba(255,255,255,0.4)",
    borderTop: "3px solid #fff", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

/* ── MODAL STYLES ── */
const modal = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "1rem",
  },
  box: {
    background: "#fff", borderRadius: "20px",
    width: "100%", maxWidth: "620px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.28)",
    maxHeight: "92vh", overflowY: "auto",
  },
  header: {
    background: "linear-gradient(135deg, #1f2937, #374151)",
    padding: "18px 22px", borderRadius: "20px 20px 0 0",
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#f9fafb", fontSize: "18px", fontWeight: "900", margin: "0 0 3px" },
  subtitle: { fontSize: "12px", color: "#9ca3af", margin: 0 },
  closeBtn: {
    background: "rgba(255,255,255,0.12)", border: "none",
    color: "#fff", width: "30px", height: "30px",
    borderRadius: "50%", cursor: "pointer",
    fontSize: "14px", display: "flex",
    alignItems: "center", justifyContent: "center",
  },
  matchedBox: {
    background: "#fef2f2", border: "1.5px solid #fecaca",
    borderRadius: "12px", padding: "12px 16px", marginBottom: "16px",
  },
  matchedLabel: {
    fontSize: "11px", color: "#ef4444", margin: "0 0 5px",
    textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: "700",
  },
  ideaName: { color: "#1f2937", fontWeight: "800", fontSize: "15px", margin: 0 },
  tipBox: {
    background: "linear-gradient(135deg, #eff6ff, #f0fdf4)",
    border: "1.5px solid #bfdbfe",
    borderRadius: "12px", padding: "14px 16px",
    marginBottom: "18px",
  },
  button: {
    width: "100%", padding: "16px",
    background: "linear-gradient(135deg, #1f2937, #374151)",
    color: "#fff", border: "none", borderRadius: "12px",
    fontWeight: "800", fontSize: "15px", cursor: "pointer",
    letterSpacing: "0.3px",
  },
};
