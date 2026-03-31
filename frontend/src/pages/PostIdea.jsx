import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ── inject fonts ── */
if (typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap";
  document.head.appendChild(link);
}

const C = {
  bg:       "#0d1117",
  surface:  "#161b22",
  surface2: "#1c2128",
  border:   "rgba(48,54,61,0.9)",
  accent:   "#58a6ff",
  green:    "#3fb950",
  red:      "#f85149",
  yellow:   "#d29922",
  purple:   "#bc8cff",
  orange:   "#f0883e",
  text:     "#e6edf3",
  muted:    "#7d8590",
  dim:      "#484f58",
};

const DOMAINS  = ["AI", "Fintech", "Edtech", "Healthcare"];
const STAGES   = [
  { value:"Idea",      label:"💡 Idea",         desc:"Concept only, no product yet"   },
  { value:"Prototype", label:"🔧 Prototype",    desc:"Early working version"           },
  { value:"MVP",       label:"⚡ MVP",           desc:"Minimum viable product live"    },
  { value:"Live",      label:"🚀 Live Product",  desc:"Revenue-generating product"     },
];

const FIELDS = [
  { name:"title",    label:"Idea Title",        type:"input",    placeholder:"e.g. AI-based Credit Scoring for Rural India",           hint:"Make it specific and memorable", required:true,  full:true  },
  { name:"funding_total_usd", label:"Funding Raised (USD)", type:"number", placeholder:"e.g. 5000", hint:"Enter 0 if not funded yet. Values > 50,000 remove risk penalties.", required:false, full:false },
  { name:"problem",  label:"Problem Statement", type:"textarea", placeholder:"What problem are you solving? Who faces it? How often? What is the pain today?", hint:"More detail = better AI score. Aim for 100+ characters.", required:false, full:true, rows:5 },
  { name:"solution", label:"Your Solution",     type:"textarea", placeholder:"How does your idea solve it? What makes it different from existing solutions?",   hint:"Describe your approach, tech, or method clearly.",        required:false, full:true, rows:5 },
  { name:"market",   label:"Target Market",     type:"textarea", placeholder:"e.g. SMEs in India, college students, rural users, B2B SaaS clients...",         hint:"Who are your first customers?",                          required:false, full:false, rows:3 },
  { name:"revenue",  label:"Revenue Model",     type:"textarea", placeholder:"e.g. Subscription ₹499/month, 2% commission per transaction, freemium...",       hint:"How does the business make money?",                       required:false, full:false, rows:3 },
];

/* ── Animated number ── */
function useAnimatedValue(target, duration=1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = null;
    const num = parseFloat(target) || 0;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1-p, 3)) * num));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return value;
}

/* ── Similarity score ring ── */
function ScoreRing({ value }) {
  const animated = useAnimatedValue(value);
  const r = 48, circ = 2 * Math.PI * r;
  const filled = (animated / 100) * circ;
  const color = animated >= 80 ? C.red : animated >= 65 ? C.orange : C.green;
  return (
    <div style={{ position:"relative", width:"120px", height:"120px", flexShrink:0 }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke={C.surface} strokeWidth="10"/>
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circ-filled}`}
          strokeDashoffset={circ*0.25} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
        <span style={{ fontSize:"22px",fontWeight:"700",color,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1 }}>{animated}%</span>
        <span style={{ fontSize:"9px",color:C.muted,marginTop:"3px",textTransform:"uppercase",letterSpacing:"0.06em" }}>Similar</span>
      </div>
    </div>
  );
}

/* ── Progress bar ── */
function SimBar({ label, score, delay=0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(()=>setW(score), delay+200); return ()=>clearTimeout(t); }, [score, delay]);
  const color = score >= 80 ? C.red : score >= 65 ? C.orange : C.green;
  return (
    <div style={{ marginBottom:"10px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
        <span style={{ fontSize:"11px",color:C.text,fontWeight:"600" }}>{label}</span>
        <span style={{ fontSize:"10px",fontWeight:"700",color,fontFamily:"'IBM Plex Mono',monospace",background:`${color}18`,padding:"1px 8px",borderRadius:"3px" }}>{score}%</span>
      </div>
      <div style={{ height:"5px",background:C.surface,borderRadius:"3px",overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${w}%`,background:color,borderRadius:"3px",transition:"width .9s cubic-bezier(0.16,1,0.3,1)" }}/>
      </div>
    </div>
  );
}

/* ── Collapsible reason card ── */
function ReasonCard({ reason, index }) {
  const [open, setOpen] = useState(false);
  const icons = ["🧩","💡","🔤","🎯","📊"];
  const color = reason.score >= 80 ? C.red : reason.score >= 65 ? C.orange : C.green;
  return (
    <div style={{ border:`1px solid ${C.border}`,borderRadius:"7px",overflow:"hidden",marginBottom:"8px" }}>
      <button onClick={()=>setOpen(!open)} style={{ width:"100%",background:open?C.surface2:C.surface,border:"none",padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",textAlign:"left",fontFamily:"'IBM Plex Sans',sans-serif" }}>
        <span style={{ fontSize:"15px" }}>{icons[index]||"📌"}</span>
        <span style={{ flex:1,fontWeight:"600",fontSize:"12px",color:C.text }}>{reason.section}</span>
        <span style={{ background:color,color:"#0d1117",fontSize:"10px",fontWeight:"700",padding:"2px 10px",borderRadius:"3px" }}>{reason.score}%</span>
        <span style={{ color:C.dim,fontSize:"10px",marginLeft:"4px" }}>{open?"▲":"▼"}</span>
      </button>
      {open && (
        <div style={{ padding:"10px 14px 13px",background:C.surface2,borderTop:`1px solid ${C.border}` }}>
          <div style={{ margin:"8px 0",height:"4px",background:C.surface,borderRadius:"3px",overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${reason.score}%`,background:color,borderRadius:"3px" }}/>
          </div>
          <p style={{ fontSize:"12px",color:C.muted,lineHeight:"1.7",margin:0 }}>{reason.reason}</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function PostIdea() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    title:"", 
    domain:"", 
    problem:"", 
    solution:"", 
    market:"", 
    revenue:"", 
    stage:"",
    funding_total_usd: 0 // Initialize as 0
  });
  const [loading, setLoading] = useState(false);
  const [similarityData, setSimilarityData] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    // Handle number conversion for funding
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  // This checks if the value is a string before trimming, or if it's a number > 0
  const completedFields = Object.entries(form).filter(([k, v]) => {
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return v > 0; // Or return true if 0 counts as "filled"
    return !!v;
  }).length;
  const totalFields = Object.keys(form).length;
  const completionPct = Math.round((completedFields / totalFields) * 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.domain || !form.title) { alert("Please fill required fields"); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5000/api/innovator/upload-idea", form, { headers: { Authorization:`Bearer ${token}` } });
      alert("Idea submitted successfully 🚀");
      setForm({ title:"", domain:"", problem:"", solution:"", market:"", revenue:"", stage:"" });
    } catch (err) {
      if (err.response?.data?.duplicate) {
        const rawSim = err.response.data.similarity ?? err.response.data.confidence_score ?? 0;
        setSimilarityData({
          existingTitle: err.response.data.existingTitle || err.response.data.existing_title || "Unknown",
          similarity: rawSim <= 1 ? (rawSim*100).toFixed(1) : parseFloat(rawSim).toFixed(1),
          reasons: err.response.data.reasons || [],
        });
      } else {
        alert(err.response?.data?.message || "Idea cannot be uploaded");
      }
    } finally { setLoading(false); }
  };

  const score = parseFloat(similarityData?.similarity) || 0;
  const verdictColor = score>=80?C.red:score>=65?C.orange:C.green;
  const verdictText  = score>=80?"🚫 Direct Duplicate — Not Acceptable":score>=65?"⚠️ Too Similar — Needs Major Differentiation":"✅ Borderline — Minor Adjustments Needed";

  const inputStyle = (name) => ({
    width:"100%", padding:"10px 14px",
    background: focusedField===name ? C.surface2 : C.surface,
    border:`1px solid ${focusedField===name ? C.accent : C.border}`,
    borderRadius:"6px", fontSize:"12px", color:C.text,
    outline:"none", transition:"border-color .15s, background .15s",
    fontFamily:"'IBM Plex Sans',sans-serif", resize:"vertical",
    boxSizing:"border-box",
  });

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'IBM Plex Sans',sans-serif", color:C.text }}>
      <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"20px 24px" }}>

        {/* ── Header ── */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"16px 20px", marginBottom:"16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <div style={{ fontSize:"15px", fontWeight:"700", color:C.text }}>🚀 Post a New Idea</div>
            <div style={{ fontSize:"10px", color:C.muted, marginTop:"2px" }}>Fill in your details — the more you add, the better your AI score</div>
          </div>
          {/* Completion meter */}
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ fontSize:"10px", color:C.muted }}>Form completion</div>
            <div style={{ width:"120px", height:"5px", background:C.surface2, borderRadius:"3px", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${completionPct}%`, background:completionPct===100?C.green:C.accent, borderRadius:"3px", transition:"width .4s ease" }}/>
            </div>
            <span style={{ fontSize:"10px", fontWeight:"700", color:completionPct===100?C.green:C.accent, fontFamily:"'IBM Plex Mono',monospace" }}>{completionPct}%</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

        {/* ── Title (Full Width) ── */}
          <div style={{ gridColumn: "1 / -1", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "16px" }}>
            <label style={{ fontSize: "10px", fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>
              Idea Title <span style={{ color: C.red }}>*</span>
            </label>
            <input
              name="title" value={form.title} onChange={handleChange} required
              placeholder="e.g. AI-based Credit Scoring for Rural India"
              onFocus={() => setFocusedField("title")} onBlur={() => setFocusedField(null)}
              style={inputStyle("title")}
            />
            <div style={{ fontSize: "9px", color: C.dim, marginTop:"5px" }}>Make it specific and memorable</div>
          </div>

        {/* ── Funding Received (Left Column) ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <label style={{ fontSize: "10px", fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>
            Funding Received ($)
            </label>
            <input
              type="text" // Change from "number" to "text"
              inputMode="numeric" // Shows numeric keypad on mobile
              name="funding_total_usd"
              value={form.funding_total_usd}
              onChange={(e) => {
                // Only allow numbers to be typed (regex check)
                const val = e.target.value;
                if (val === '' || /^[0-9\b]+$/.test(val)) {
                  setForm({ ...form, funding_total_usd: val === '' ? 0 : parseFloat(val) });
                }
              }}
              onFocus={() => setFocusedField("funding")}
              onBlur={() => setFocusedField(null)}
              style={inputStyle("funding")}
            />
          </div>
          <div style={{ fontSize: "9px", color: C.dim, marginTop: "8px" }}>Current capital helps AI determine runway risk</div>
        </div>

        {/* ── Domain (Right Column) ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <label style={{ fontSize: "10px", fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "8px" }}>
            Domain <span style={{ color: C.red }}>*</span>
            </label>
            <select 
              name="domain" value={form.domain} onChange={handleChange} required
              style={{ ...inputStyle("domain"), cursor: "pointer" }}
            >
            <option value="">Select a domain</option>
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ fontSize: "9px", color: C.dim, marginTop: "8px" }}>Which sector does your idea belong to?</div>
        </div>

          {/* ── Stage (Full Width to keep it clean) ── */}
          <div style={{ gridColumn: "1 / -1", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "16px" }}>
            <label style={{ fontSize: "10px", fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "12px" }}>
              Current Stage
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {STAGES.map(s => (
                <button key={s.value} type="button" onClick={() => setForm({ ...form, stage: s.value })} style={{
                  padding: "10px", borderRadius: "6px", cursor: "pointer", textAlign: "left",
                  border: `1px solid ${form.stage === s.value ? C.accent : C.border}`,
                  background: form.stage === s.value ? `rgba(88,166,255,.1)` : C.surface2,
                  transition: "all .15s", minHeight: "60px"
                }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: form.stage === s.value ? C.accent : C.text }}>{s.label}</div>
                  <div style={{ fontSize: "9px", color: C.muted, marginTop: "2px" }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

            {/* ── Problem (full width) ── */}
            <div style={{ gridColumn:"1/-1", background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                <label style={{ fontSize:"10px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>Problem Statement</label>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"9px", color: form.problem.length>=100?C.green:form.problem.length>0?C.orange:C.dim, fontFamily:"'IBM Plex Mono',monospace" }}>
                    {form.problem.length} chars
                  </span>
                  {form.problem.length>=100 && <span style={{ fontSize:"9px", color:C.green }}>✓ Good length</span>}
                  {form.problem.length>0 && form.problem.length<100 && <span style={{ fontSize:"9px", color:C.orange }}>Aim for 100+</span>}
                </div>
              </div>
              <textarea
                name="problem" value={form.problem} onChange={handleChange} rows={5}
                placeholder="What problem are you solving? Who faces it and how often? What does the current situation look like without your solution? The more specific you are, the better your AI analysis score will be."
                onFocus={()=>setFocusedField("problem")} onBlur={()=>setFocusedField(null)}
                style={inputStyle("problem")}
              />
              <div style={{ fontSize:"9px", color:C.dim, marginTop:"5px" }}>💡 Tip: Describe the pain point clearly. Investors want to see that you understand the problem deeply.</div>
            </div>

            {/* ── Solution (full width) ── */}
            <div style={{ gridColumn:"1/-1", background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                <label style={{ fontSize:"10px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>Your Solution</label>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"9px", color:form.solution.length>=100?C.green:form.solution.length>0?C.orange:C.dim, fontFamily:"'IBM Plex Mono',monospace" }}>
                    {form.solution.length} chars
                  </span>
                  {form.solution.length>=100 && <span style={{ fontSize:"9px", color:C.green }}>✓ Good length</span>}
                  {form.solution.length>0 && form.solution.length<100 && <span style={{ fontSize:"9px", color:C.orange }}>Aim for 100+</span>}
                </div>
              </div>
              <textarea
                name="solution" value={form.solution} onChange={handleChange} rows={5}
                placeholder="How does your idea solve the problem? What is your approach, technology, or unique method? What makes your solution different from what already exists in the market?"
                onFocus={()=>setFocusedField("solution")} onBlur={()=>setFocusedField(null)}
                style={inputStyle("solution")}
              />
              <div style={{ fontSize:"9px", color:C.dim, marginTop:"5px" }}>💡 Tip: Highlight what makes your solution unique. Investors look for differentiation.</div>
            </div>

            {/* ── Market ── */}
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"16px" }}>
              <label style={{ fontSize:"10px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"8px" }}>Target Market</label>
              <textarea
                name="market" value={form.market} onChange={handleChange} rows={4}
                placeholder="e.g. SMEs in India, college students aged 18–25, rural farmers in Tamil Nadu, B2B SaaS clients in manufacturing..."
                onFocus={()=>setFocusedField("market")} onBlur={()=>setFocusedField(null)}
                style={inputStyle("market")}
              />
              <div style={{ fontSize:"9px", color:C.dim, marginTop:"5px" }}>Who are your first 100 customers?</div>
            </div>

            {/* ── Revenue ── */}
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"16px" }}>
              <label style={{ fontSize:"10px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"8px" }}>Revenue Model</label>
              <textarea
                name="revenue" value={form.revenue} onChange={handleChange} rows={4}
                placeholder="e.g. Subscription ₹499/month, 2% commission per transaction, freemium with paid upgrades at ₹999, B2B SaaS annual contract..."
                onFocus={()=>setFocusedField("revenue")} onBlur={()=>setFocusedField(null)}
                style={inputStyle("revenue")}
              />
              <div style={{ fontSize:"9px", color:C.dim, marginTop:"5px" }}>How does this business make money?</div>
            </div>

          </div>

          {/* ── AI Score tip banner ── */}
          <div style={{ background:`rgba(88,166,255,.06)`, border:`1px solid rgba(88,166,255,.2)`, borderRadius:"7px", padding:"12px 16px", marginBottom:"14px", display:"flex", gap:"10px", alignItems:"flex-start" }}>
            <span style={{ fontSize:"16px", flexShrink:0 }}>🤖</span>
            <div>
              <div style={{ fontSize:"11px", fontWeight:"700", color:C.accent, marginBottom:"3px" }}>What improves your AI score</div>
              <div style={{ fontSize:"10px", color:C.muted, lineHeight:"1.7" }}>
                Problem & solution 100+ chars · Clear revenue model · Specific target market · Stage set to Prototype or higher
              </div>
            </div>
          </div>

          {/* ── Submit ── */}
          <button type="submit" disabled={loading} style={{
            width:"100%", padding:"14px",
            background: loading ? C.surface2 : C.accent,
            color: loading ? C.muted : "#0d1117",
            border:"none", borderRadius:"7px",
            fontWeight:"700", fontSize:"13px", cursor: loading ? "not-allowed" : "pointer",
            fontFamily:"'IBM Plex Sans',sans-serif", transition:"background .15s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:"8px",
          }}>
            {loading ? (
              <>
                <div style={{ width:"14px",height:"14px",border:`2px solid ${C.dim}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin .8s linear infinite" }}/>
                Submitting...
              </>
            ) : "🚀 Submit Idea for AI Analysis"}
          </button>
        </form>
      </div>

      {/* ══════════ SIMILARITY MODAL ══════════ */}
      {similarityData && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"1rem" }}
          onClick={()=>setSimilarityData(null)}>
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"10px",width:"100%",maxWidth:"580px",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}
            onClick={e=>e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ background:C.surface2,borderBottom:`1px solid ${C.border}`,padding:"14px 18px",borderRadius:"10px 10px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"10px" }}>
                <span style={{ fontSize:"20px" }}>⚠️</span>
                <div>
                  <div style={{ fontSize:"13px",fontWeight:"700",color:C.text }}>Similar Idea Detected</div>
                  <div style={{ fontSize:"9px",color:C.muted,marginTop:"1px" }}>AI-powered similarity analysis</div>
                </div>
              </div>
              <button onClick={()=>setSimilarityData(null)} style={{ background:"rgba(255,255,255,.06)",border:`1px solid ${C.border}`,color:C.muted,width:"26px",height:"26px",borderRadius:"50%",cursor:"pointer",fontSize:"11px",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            </div>

            <div style={{ padding:"16px 18px 20px" }}>

              {/* Matched idea */}
              <div style={{ background:`rgba(248,81,73,.06)`,border:`1px solid rgba(248,81,73,.2)`,borderRadius:"7px",padding:"10px 14px",marginBottom:"12px" }}>
                <div style={{ fontSize:"9px",color:C.red,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:"700",marginBottom:"4px" }}>Matched with existing idea</div>
                <div style={{ fontSize:"12px",fontWeight:"700",color:C.text }}>🔍 {similarityData.existingTitle}</div>
              </div>

              {/* Verdict */}
              <div style={{ background:`${verdictColor}10`,border:`1px solid ${verdictColor}40`,color:verdictColor,borderRadius:"6px",padding:"8px 14px",fontSize:"12px",fontWeight:"700",textAlign:"center",marginBottom:"14px" }}>
                {verdictText}
              </div>

              {/* Ring + bars */}
              <div style={{ display:"flex",gap:"16px",alignItems:"center",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px 16px",marginBottom:"14px",flexWrap:"wrap" }}>
                <ScoreRing value={score}/>
                <div style={{ flex:1,minWidth:"160px" }}>
                  <div style={{ fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px" }}>Component Breakdown</div>
                  {similarityData.reasons?.length>0
                    ? similarityData.reasons.map((r,i)=><SimBar key={i} label={r.section} score={r.score} delay={i*150}/>)
                    : <>
                        <SimBar label="Solution"  score={Math.min(Math.round(score*1.05),100)} delay={0}/>
                        <SimBar label="Problem"   score={Math.round(score*0.9)}                delay={150}/>
                        <SimBar label="Title"     score={Math.round(score*0.85)}               delay={300}/>
                      </>
                  }
                </div>
              </div>

              {/* Detailed analysis */}
              {similarityData.reasons?.length>0 && (
                <div style={{ marginBottom:"14px" }}>
                  <div style={{ fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px",fontWeight:"700" }}>🔎 Detailed Analysis</div>
                  {similarityData.reasons.map((r,i)=><ReasonCard key={i} reason={r} index={i}/>)}
                </div>
              )}

              {/* Tip */}
              <div style={{ background:`rgba(88,166,255,.06)`,border:`1px solid rgba(88,166,255,.2)`,borderRadius:"7px",padding:"12px 14px",marginBottom:"14px" }}>
                <div style={{ fontSize:"9px",color:C.accent,fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"6px" }}>💡 How to differentiate your idea</div>
                <div style={{ fontSize:"11px",color:C.muted,lineHeight:"1.7" }}>
                  Focus on a <span style={{ color:C.text,fontWeight:"600" }}>unique target segment</span>, a novel technical approach, or a geography/use-case the existing idea doesn't cover. Make your problem statement specific enough to stand on its own.
                </div>
              </div>

              <button onClick={()=>setSimilarityData(null)} style={{ width:"100%",padding:"12px",background:C.surface2,color:C.text,border:`1px solid ${C.border}`,borderRadius:"7px",fontWeight:"700",fontSize:"12px",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif" }}>
                Got it — I'll Revise My Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
