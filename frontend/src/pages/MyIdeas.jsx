import { useEffect, useState } from "react";
import axios from "axios";

/* ── inject fonts ── */
if (typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin    { to { transform:rotate(360deg); } }
    @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.5; } }
    * { box-sizing:border-box; margin:0; padding:0; }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-track { background:#0d1117; }
    ::-webkit-scrollbar-thumb { background:#21262d; border-radius:2px; }
  `;
  document.head.appendChild(style);
}

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#1c2128",
  border:"rgba(48,54,61,0.9)", accent:"#58a6ff", green:"#3fb950",
  red:"#f85149", yellow:"#d29922", purple:"#bc8cff", orange:"#f0883e",
  text:"#e6edf3", muted:"#7d8590", dim:"#484f58",
};

const STAGE_COLORS = { Idea:C.yellow, Prototype:C.accent, MVP:C.green, Live:C.purple };
const DOMAINS = ["AI","Fintech","Edtech","Healthcare","SaaS","E-commerce","Logistics","AgriTech","CleanTech","Other"];
const STAGES  = ["Idea","Prototype","MVP","Live"];

const FEATURE_INFO = {
  relationships:          { name:"Network",      icon:"🤝", pos:"Strong investor/partner network boosts growth.",    neg:"Limited network slows funding opportunities."    },
  funding_total_usd:      { name:"Funding",      icon:"💰", pos:"Adequate funding provides runway to scale.",        neg:"Low funding — startup may run out of resources."  },
  funding_rounds:         { name:"Fund Rounds",  icon:"📊", pos:"Multiple rounds signal investor confidence.",       neg:"Few rounds — hasn't attracted repeat investors."  },
  milestones:             { name:"Milestones",   icon:"🏆", pos:"Milestones show real execution capability.",        neg:"No milestones — execution is unproven."           },
  is_web:                 { name:"Digital",      icon:"🌐", pos:"Web products scale globally at low cost.",          neg:"Non-digital products have higher scaling costs."  },
  is_CA:                  { name:"Ecosystem",    icon:"📍", pos:"Strong ecosystem access for VC and talent.",        neg:"Outside major hubs — limited investor access."    },
  age_first_funding_year: { name:"Speed to Fund",icon:"⚡", pos:"Quick funding shows early traction.",               neg:"Slow first funding — early conviction lacking."   },
  age_last_funding_year:  { name:"Recency",      icon:"📅", pos:"Recent funding confirms active growth.",            neg:"Funding gap — possible stalled growth."           },
};

const STRATEGIC_ADVICE = {
  "Strong Growth Momentum":                  { color:C.green,  bg:"rgba(63,185,80,.08)",  border:"rgba(63,185,80,.2)",  icon:"🚀", advice:"Strong execution signals. High confidence for growth-stage investors." },
  "Strong Network Advantage":                { color:C.accent, bg:"rgba(88,166,255,.08)", border:"rgba(88,166,255,.2)", icon:"🌟", advice:"Well-connected founders attract better talent and follow-on funding." },
  "Underfunded Risk":                        { color:C.red,    bg:"rgba(248,81,73,.08)",  border:"rgba(248,81,73,.2)",  icon:"⚠️", advice:"Funding below sustainable threshold. Evaluate burn rate carefully." },
  "Early Idea — Needs Funding & Validation": { color:C.yellow, bg:"rgba(210,153,34,.08)", border:"rgba(210,153,34,.2)", icon:"🌱", advice:"Early stage — needs funding and traction before investor commitment." },
  "Underfunded — Seek Early Capital":        { color:C.orange, bg:"rgba(240,136,62,.08)", border:"rgba(240,136,62,.2)", icon:"💸", advice:"Seek early capital to extend runway." },
  "High Risk — Needs Validation":            { color:C.red,    bg:"rgba(248,81,73,.08)",  border:"rgba(248,81,73,.2)",  icon:"🔴", advice:"Multiple risk signals. Focus on milestones and funding." },
  "Moderate Potential — Watch for Traction": { color:C.orange, bg:"rgba(240,136,62,.08)", border:"rgba(240,136,62,.2)", icon:"📈", advice:"Promising concept — needs stronger traction signals." },
  "Moderate Growth Potential":               { color:C.orange, bg:"rgba(240,136,62,.08)", border:"rgba(240,136,62,.2)", icon:"📈", advice:"Good foundation. Improve network, milestones, or stage to boost score." },
  "Proven Traction — Investment Ready":      { color:C.green,  bg:"rgba(63,185,80,.08)",  border:"rgba(63,185,80,.2)",  icon:"✅", advice:"Strong traction. Ready for investor conversations." },
};

const IMPROVEMENT_TIPS = [
  { icon:"💰", title:"Raise early funding",         detail:"Getting even ₹42–83L removes the critical underfunding penalty.", impact:"+5–10%" },
  { icon:"🏆", title:"Add 3+ milestones",           detail:"3+ milestones unlocks a scoring bonus for demonstrated progress.", impact:"+4%"    },
  { icon:"🤝", title:"Grow your network",           detail:"5+ connections removes the weak network flag.",                    impact:"+2–4%" },
  { icon:"⚡", title:"Move to Prototype or MVP",    detail:"Idea-stage carries an 8% penalty. A basic prototype removes it.", impact:"+8%"    },
  { icon:"🌐", title:"Build a web product",         detail:"Digital products get a scalability bonus.",                        impact:"+2%"    },
  { icon:"📊", title:"Complete multiple funding rounds", detail:"Even small seed rounds signal investor confidence.",          impact:"+4%"    },
];

/* ── Helpers ── */
const fmtINR = (n) => {
  if (!n) return "₹0";
  if (n >= 1e7)  return `₹${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5)  return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <div style={{ fontSize:"11px", fontWeight:"700", color:C.text }}>{title}</div>
      {sub && <div style={{ fontSize:"9px", color:C.muted, marginTop:"2px" }}>{sub}</div>}
    </div>
  );
}

function ScoreRing({ score }) {
  const r = 52, circ = 2 * Math.PI * r;
  const color  = score >= 70 ? C.green : score >= 40 ? C.orange : C.red;
  const filled = (score / 100) * circ;
  return (
    <div style={{ position:"relative", width:"128px", height:"128px", flexShrink:0 }}>
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke={C.surface} strokeWidth="10"/>
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ * 0.25} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 1.2s ease" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:"24px", fontWeight:"700", color, fontFamily:"'IBM Plex Mono',monospace", lineHeight:1 }}>{score}%</span>
        <span style={{ fontSize:"9px", color:C.muted, marginTop:"3px" }}>{score >= 70 ? "High" : score >= 40 ? "Moderate" : "Needs Work"}</span>
      </div>
    </div>
  );
}

const inputStyle = (name, focused) => ({
  width:"100%", padding:"9px 12px",
  background: focused === name ? C.surface2 : C.surface,
  border:`1px solid ${focused === name ? C.accent : C.border}`,
  borderRadius:"6px", fontSize:"12px", color:C.text,
  outline:"none", transition:"border-color .15s",
  fontFamily:"'IBM Plex Sans',sans-serif", resize:"vertical", boxSizing:"border-box",
});

/* ════════════════════════════════════════
   ENHANCED BUDGET MODAL
   - Tab 1: Update Funding Goal (budget)
   - Tab 2: Update Funding Received (currentFunding)
   - Delete button
   - Maximizable
════════════════════════════════════════ */
function BudgetModal({ idea, onClose, onUpdated }) {
  const [activeTab,      setActiveTab]      = useState("received"); // "received" | "goal"
  const [budgetValue,    setBudgetValue]    = useState(String(idea.budget || ""));
  const [receivedValue,  setReceivedValue]  = useState(String(idea.currentFunding || ""));
  const [loading,        setLoading]        = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [error,          setError]          = useState("");
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [isMaximized,    setIsMaximized]    = useState(false);
  const [successMsg,     setSuccessMsg]     = useState("");

  // Live preview values
  const previewFunding = Number(receivedValue) || 0;
  const previewBudget  = Number(budgetValue)   || idea.budget || 0;
  const previewPct     = previewBudget > 0 ? Math.min(100, Math.round((previewFunding / previewBudget) * 100)) : 0;
  const previewGoal    = previewPct >= 100;
  const previewColor   = previewGoal ? C.green : previewPct > 60 ? C.accent : previewPct > 30 ? C.yellow : C.red;

  // Current values for display
  const currentPct   = idea.budget > 0 ? Math.min(100, Math.round((idea.currentFunding / idea.budget) * 100)) : 0;

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2800);
  };

  const handleUpdateReceived = async () => {
    const numeric = Number(receivedValue);
    if (isNaN(numeric) || numeric < 0) { setError("Enter a valid amount (0 or above)."); return; }
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.put(
        `http://localhost:5000/api/innovator/update-funding/${idea._id}`,
        { currentFunding: numeric },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdated(res.data);
      showSuccess("✅ Funding received updated!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update funding received.");
    } finally { setLoading(false); }
  };

  const handleUpdateBudget = async () => {
    const numeric = Number(budgetValue);
    if (isNaN(numeric) || numeric < 0) { setError("Enter a valid amount (0 or above)."); return; }
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.put(
        `http://localhost:5000/api/innovator/update-budget/${idea._id}`,
        { newBudget: numeric },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdated(res.data);
      showSuccess("✅ Funding goal updated!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update budget.");
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true); setError("");
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/innovator/delete-idea/${idea._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdated({ deleted: true });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete idea.");
    } finally { setDeleting(false); }
  };

  const TABS = [
    { k:"received", icon:"📥", label:"Funding Received" },
    { k:"goal",     icon:"🎯", label:"Funding Goal"     },
  ];

  const quickFills = {
    received: [100000, 500000, 1000000, 5000000],
    goal:     [500000, 1000000, 5000000, 10000000],
  };

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.78)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding: isMaximized ? "0" : "20px" }}
      onClick={onClose}
    >
      <div
        style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius: isMaximized ? "0" : "10px", width: isMaximized ? "100vw" : "100%", maxWidth: isMaximized ? "100vw" : "480px", height: isMaximized ? "100vh" : "auto", maxHeight: isMaximized ? "100vh" : "92vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,.6)", display:"flex", flexDirection:"column", transition:"all .2s ease" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ background:C.surface2, borderBottom:`1px solid ${C.border}`, padding:"13px 18px", borderRadius: isMaximized ? "0" : "10px 10px 0 0", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, position: isMaximized ? "sticky" : "static", top:0, zIndex:10 }}>
          <div>
            <div style={{ fontSize:"13px", fontWeight:"700", color:C.text }}>💰 Manage Funding</div>
            <div style={{ fontSize:"9px", color:C.muted, marginTop:"2px", maxWidth: isMaximized ? "none" : "280px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{idea.title}</div>
          </div>
          <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
            {/* Maximize button */}
            <button
              onClick={() => setIsMaximized(m => !m)}
              title={isMaximized ? "Restore" : "Maximize"}
              style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${C.border}`, color:C.muted, width:"26px", height:"26px", borderRadius:"5px", cursor:"pointer", fontSize:"12px", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}
            >
              {isMaximized ? "⊡" : "⛶"}
            </button>
            <button
              onClick={onClose}
              style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${C.border}`, color:C.muted, width:"26px", height:"26px", borderRadius:"50%", cursor:"pointer", fontSize:"11px", display:"flex", alignItems:"center", justifyContent:"center" }}
            >✕</button>
          </div>
        </div>

        {/* ── Live Progress Preview ── */}
        <div style={{ padding:"14px 20px 0", flexShrink:0 }}>
          <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"13px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
              <span style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>Live Preview</span>
              <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                {previewGoal && (
                  <span style={{ fontSize:"9px", fontWeight:"700", padding:"1px 7px", borderRadius:"3px", background:"rgba(63,185,80,.15)", color:C.green, border:"1px solid rgba(63,185,80,.3)", animation:"pulse 1.5s ease infinite" }}>
                    🎉 Goal Reached!
                  </span>
                )}
                <span style={{ fontSize:"11px", fontWeight:"700", color:previewColor, fontFamily:"'IBM Plex Mono',monospace" }}>{previewPct}%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height:"8px", background:C.surface, borderRadius:"4px", overflow:"hidden", marginBottom:"8px", position:"relative" }}>
              <div style={{ width:`${currentPct}%`, height:"100%", background:C.dim, borderRadius:"4px", position:"absolute", left:0, top:0 }}/>
              <div style={{ width:`${previewPct}%`, height:"100%", background:previewColor, borderRadius:"4px", position:"absolute", left:0, top:0, transition:"width .5s ease, background .3s ease", opacity: 0.9 }}/>
            </div>

            {/* Stats row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px" }}>
              {[
                { label:"Raised",    val:fmtINR(previewFunding), color:previewColor },
                { label:"Goal",      val:fmtINR(previewBudget),  color:C.text       },
                { label:"Remaining", val:previewBudget > 0 ? fmtINR(Math.max(0, previewBudget - previewFunding)) : "—", color:C.muted },
              ].map((s, i) => (
                <div key={i} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"10px", fontWeight:"700", color:s.color, fontFamily:"'IBM Plex Mono',monospace" }}>{s.val}</div>
                  <div style={{ fontSize:"8px", color:C.dim, marginTop:"2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ borderBottom:`1px solid ${C.border}`, display:"flex", padding:"0 20px", marginTop:"14px", flexShrink:0 }}>
          {TABS.map(({ k, icon, label }) => (
            <button key={k} onClick={() => { setActiveTab(k); setError(""); setConfirmDelete(false); }}
              style={{ padding:"0 14px", height:"36px", border:"none", borderBottom: activeTab === k ? `2px solid ${C.accent}` : "2px solid transparent", background:"transparent", color: activeTab === k ? C.accent : C.muted, fontWeight: activeTab === k ? "600" : "400", fontSize:"11px", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", transition:"all .15s", display:"flex", alignItems:"center", gap:"5px" }}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div style={{ padding:"16px 20px 0", flex:1 }}>

          {/* SUCCESS MESSAGE */}
          {successMsg && (
            <div style={{ background:"rgba(63,185,80,.1)", border:"1px solid rgba(63,185,80,.25)", borderRadius:"6px", padding:"9px 12px", marginBottom:"12px", fontSize:"11px", fontWeight:"600", color:C.green, animation:"fadeUp .3s ease" }}>
              {successMsg}
            </div>
          )}

          {/* ── TAB: FUNDING RECEIVED ── */}
          {activeTab === "received" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <div>
                <div style={{ fontSize:"10px", color:C.muted, lineHeight:"1.6", marginBottom:"10px", padding:"8px 10px", background:"rgba(88,166,255,.05)", border:"1px solid rgba(88,166,255,.12)", borderRadius:"6px" }}>
                  📥 Track how much funding has actually been received. This updates the progress bar and triggers <strong style={{ color:C.green }}>Goal Reached</strong> status automatically.
                </div>
                <label style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>
                  Funding Received (₹)
                </label>
                <input
                  type="number" min="0" value={receivedValue}
                  onChange={e => { setReceivedValue(e.target.value); setError(""); }}
                  placeholder="e.g. 250000"
                  style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"6px", fontSize:"12px", color:C.text, outline:"none", fontFamily:"'IBM Plex Sans',sans-serif", boxSizing:"border-box" }}
                />
                <div style={{ fontSize:"9px", color:C.dim, marginTop:"5px" }}>
                  Current: <span style={{ color:C.text, fontWeight:"600" }}>{fmtINR(idea.currentFunding)}</span>
                </div>
              </div>

              {/* Quick fills for received */}
              <div>
                <div style={{ fontSize:"9px", color:C.dim, marginBottom:"5px" }}>Quick fill</div>
                <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                  {quickFills.received.map(v => (
                    <button key={v} onClick={() => setReceivedValue(String(v))}
                      style={{ padding:"4px 10px", borderRadius:"4px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:"10px", fontFamily:"'IBM Plex Sans',sans-serif", transition:"all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
                      {fmtINR(v)}
                    </button>
                  ))}
                  {/* Set to 100% button */}
                  {idea.budget > 0 && (
                    <button onClick={() => setReceivedValue(String(idea.budget))}
                      style={{ padding:"4px 10px", borderRadius:"4px", border:"1px solid rgba(63,185,80,.3)", background:"rgba(63,185,80,.08)", color:C.green, cursor:"pointer", fontSize:"10px", fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:"700" }}>
                      ✅ Mark as Fully Funded
                    </button>
                  )}
                </div>
              </div>

              {error && <div style={{ fontSize:"10px", color:C.red }}>{error}</div>}

              <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={handleUpdateReceived} disabled={loading}
                  style={{ flex:1, padding:"10px", borderRadius:"6px", border:"none", background:C.accent, color:"#0d1117", fontWeight:"700", fontSize:"12px", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", opacity:loading ? 0.6 : 1 }}>
                  {loading ? "Saving..." : "📥 Update Received"}
                </button>
                <button onClick={onClose}
                  style={{ padding:"10px 16px", borderRadius:"6px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, fontSize:"12px", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── TAB: FUNDING GOAL ── */}
          {activeTab === "goal" && (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <div>
                <div style={{ fontSize:"10px", color:C.muted, lineHeight:"1.6", marginBottom:"10px", padding:"8px 10px", background:"rgba(210,153,34,.05)", border:"1px solid rgba(210,153,34,.12)", borderRadius:"6px" }}>
                  🎯 Set your total funding target. Setting ₹0 removes the goal but keeps your idea published.
                </div>
                <label style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>
                  Total Funding Goal (₹)
                </label>
                <input
                  type="number" min="0" value={budgetValue}
                  onChange={e => { setBudgetValue(e.target.value); setError(""); setConfirmDelete(false); }}
                  placeholder="e.g. 500000 — enter 0 to remove the goal"
                  style={{ width:"100%", padding:"9px 12px", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"6px", fontSize:"12px", color:C.text, outline:"none", fontFamily:"'IBM Plex Sans',sans-serif", boxSizing:"border-box" }}
                />
                <div style={{ fontSize:"9px", color:C.dim, marginTop:"5px" }}>
                  Current goal: <span style={{ color:C.text, fontWeight:"600" }}>{fmtINR(idea.budget)}</span>
                </div>
              </div>

              {/* Quick fills for goal */}
              <div>
                <div style={{ fontSize:"9px", color:C.dim, marginBottom:"5px" }}>Quick fill</div>
                <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                  {quickFills.goal.map(v => (
                    <button key={v} onClick={() => setBudgetValue(String(v))}
                      style={{ padding:"4px 10px", borderRadius:"4px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, cursor:"pointer", fontSize:"10px", fontFamily:"'IBM Plex Sans',sans-serif", transition:"all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = C.yellow; e.currentTarget.style.borderColor = C.yellow; }}
                      onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
                      {fmtINR(v)}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div style={{ fontSize:"10px", color:C.red }}>{error}</div>}

              <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={handleUpdateBudget} disabled={loading || budgetValue.trim() === ""}
                  style={{ flex:1, padding:"10px", borderRadius:"6px", border:"none", background:C.yellow, color:"#0d1117", fontWeight:"700", fontSize:"12px", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", opacity:(loading || budgetValue.trim() === "") ? 0.6 : 1 }}>
                  {loading ? "Saving..." : "🎯 Update Goal"}
                </button>
                <button onClick={onClose}
                  style={{ padding:"10px 16px", borderRadius:"6px", border:`1px solid ${C.border}`, background:"transparent", color:C.muted, fontSize:"12px", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Delete Section ── */}
        <div style={{ padding:"14px 20px 20px", flexShrink:0 }}>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:"12px" }}>
            {confirmDelete && (
              <div style={{ background:"rgba(248,81,73,.08)", border:"1px solid rgba(248,81,73,.25)", borderRadius:"6px", padding:"10px 12px", marginBottom:"10px" }}>
                <div style={{ fontSize:"11px", fontWeight:"700", color:C.red, marginBottom:"4px" }}>⚠️ This will permanently delete your idea</div>
                <div style={{ fontSize:"10px", color:C.muted, lineHeight:"1.5" }}>All data — likes, messages, and analysis — will be removed. This cannot be undone.</div>
              </div>
            )}
            <button onClick={handleDelete} disabled={deleting}
              style={{ width:"100%", padding:"8px", borderRadius:"6px", border:"1px solid rgba(248,81,73,.3)", background:"transparent", color:C.red, fontSize:"11px", fontWeight:"600", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", opacity:deleting ? 0.6 : 1, transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,81,73,.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
              {deleting ? "Deleting..." : confirmDelete ? "Confirm — delete this idea permanently" : "🗑 Delete this idea"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function MyIdeas() {
  const [ideas,        setIdeas]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [editIdea,     setEditIdea]     = useState(null);
  const [editForm,     setEditForm]     = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [analysisIdea, setAnalysisIdea] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [activeTab,    setActiveTab]    = useState("score");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [budgetIdea,   setBudgetIdea]   = useState(null);

  const fetchIdeas = async () => {
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.get("http://localhost:5000/api/innovator/my-ideas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIdeas(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchIdeas(); }, []);

  const handleEditClick  = (idea) => { setEditForm({ ...idea }); setEditIdea(idea); };
  const handleEditChange = (e)    => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/innovator/update-idea/${editForm._id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditIdea(null); setEditForm(null);
      fetchIdeas();
    } catch (err) { alert("Failed to update idea"); }
  };

  const handleViewAnalysis = async (idea) => {
    setAnalysisIdea(idea); setAnalysisData(null); setAiLoading(true); setActiveTab("score"); setIsFullscreen(false);
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.post(
        "http://localhost:5000/api/innovator/analyze-idea",
        { ideaId: idea._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysisData(res.data);
    } catch (err) {
      alert("AI service is currently offline. Please ensure it's running on port 8000.");
    } finally { setAiLoading(false); }
  };

  // Called after BudgetModal saves — supports partial updates (no full refetch needed)
  const handleBudgetUpdated = (result) => {
    if (result.deleted) {
      setIdeas(prev => prev.filter(i => i._id !== budgetIdea._id));
      setBudgetIdea(null);
    } else if (result.idea) {
      setIdeas(prev => prev.map(i => i._id === result.idea._id ? result.idea : i));
      // Also update the budgetIdea reference so live preview stays in sync
      setBudgetIdea(result.idea);
    }
  };

  const getReasons = (explanation) => {
    if (!explanation) return { pros:[], cons:[] };
    const pros = [], cons = [];
    Object.entries(explanation).forEach(([key, val]) => {
      const info = FEATURE_INFO[key];
      if (!info) return;
      if (val >= 0) pros.push({ ...info, key, value: val });
      else          cons.push({ ...info, key, value: val });
    });
    return { pros, cons };
  };

  const getShapData = (explanation) => {
    if (!explanation) return [];
    const entries = Object.entries(explanation)
      .map(([k, v]) => ({ name: FEATURE_INFO[k]?.name || k, raw: v, abs: Math.abs(v), positive: v >= 0 }))
      .sort((a, b) => b.abs - a.abs).slice(0, 8);
    const maxAbs  = Math.max(...entries.map(d => d.abs), 0.000001);
    const fmtShap = (v) => {
      const a = Math.abs(v), s = v >= 0 ? "+" : "−";
      if (a >= 0.01)  return `${s}${(a * 100).toFixed(1)}`;
      if (a >= 0.001) return `${s}${(a * 100).toFixed(2)}`;
      return `${s}${(a * 100).toFixed(3)}`;
    };
    return entries.map(d => ({ ...d, barWidth: Math.round((d.abs / maxAbs) * 100), label: fmtShap(d.raw) }));
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Sans',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:"24px", height:"24px", border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto" }}/>
        <p style={{ color:C.muted, fontSize:"12px", marginTop:"10px" }}>Loading your ideas...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'IBM Plex Sans',sans-serif", color:C.text }}>
      <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"20px 24px" }}>

        {/* Header */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"14px 18px", marginBottom:"16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"14px", fontWeight:"700", color:C.text }}>📂 My Ideas</div>
            <div style={{ fontSize:"10px", color:C.muted, marginTop:"2px" }}>
              {ideas.length} submission{ideas.length !== 1 ? "s" : ""} · click 💰 Budget to manage funding
            </div>
          </div>
          <div style={{ fontSize:"10px", color:C.muted, fontFamily:"'IBM Plex Mono',monospace" }}>{ideas.length} total</div>
        </div>

        {/* Ideas list */}
        {ideas.length === 0 ? (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"40px", textAlign:"center" }}>
            <div style={{ fontSize:"24px", marginBottom:"10px" }}>📭</div>
            <div style={{ fontSize:"13px", color:C.muted }}>No ideas posted yet. Go to Post Idea to submit your first one.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {ideas.map((idea) => {
              const budgetPct   = idea.budget > 0 ? Math.min(100, Math.round((idea.currentFunding / idea.budget) * 100)) : 0;
              const budgetColor = idea.isGoalReached ? C.green : budgetPct > 60 ? C.accent : budgetPct > 30 ? C.yellow : C.red;

              return (
                <div key={idea._id}
                  style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"16px 18px", transition:"border-color .15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.dim}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>

                  {/* Card header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px", gap:"10px", flexWrap:"wrap" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"13px", fontWeight:"700", color:C.text, marginBottom:"5px" }}>{idea.title}</div>
                      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                        <span style={{ fontSize:"9px", fontWeight:"700", padding:"2px 8px", borderRadius:"3px", background:"rgba(88,166,255,.1)", color:C.accent, border:"1px solid rgba(88,166,255,.2)" }}>{idea.domain}</span>
                        {idea.stage && (
                          <span style={{ fontSize:"9px", fontWeight:"700", padding:"2px 8px", borderRadius:"3px",
                            background:`${STAGE_COLORS[idea.stage] || C.muted}15`,
                            color: STAGE_COLORS[idea.stage] || C.muted,
                            border:`1px solid ${STAGE_COLORS[idea.stage] || C.muted}30` }}>
                            {idea.stage}
                          </span>
                        )}
                        {idea.isGoalReached && (
                          <span style={{ fontSize:"9px", fontWeight:"700", padding:"2px 8px", borderRadius:"3px", background:"rgba(63,185,80,.1)", color:C.green, border:"1px solid rgba(63,185,80,.2)" }}>
                            ✅ Funded
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:"6px" }}>
                      <button onClick={() => setBudgetIdea(idea)}
                        style={{ padding:"6px 12px", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:"5px", fontSize:"11px", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", transition:"all .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = C.yellow; e.currentTarget.style.borderColor = C.yellow; }}
                        onMouseLeave={e => { e.currentTarget.style.color = C.muted;  e.currentTarget.style.borderColor = C.border; }}>
                        💰 Budget
                      </button>
                      <button onClick={() => handleEditClick(idea)}
                        style={{ padding:"6px 12px", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:"5px", fontSize:"11px", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", transition:"all .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.muted; }}
                        onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleViewAnalysis(idea)}
                        style={{ padding:"6px 14px", background:C.accent, color:"#0d1117", border:"none", borderRadius:"5px", fontSize:"11px", fontWeight:"700", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                        🤖 View Analysis
                      </button>
                    </div>
                  </div>

                  {/* Budget bar — clickable to open modal */}
                  <div
                    onClick={() => setBudgetIdea(idea)}
                    style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"10px 12px", marginBottom:"10px", cursor:"pointer", transition:"border-color .15s", position:"relative" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.yellow; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                    title="Click to manage funding"
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"5px" }}>
                      <span style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>Funding Goal</span>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                        <span style={{ fontSize:"10px", fontWeight:"700", color:budgetColor, fontFamily:"'IBM Plex Mono',monospace" }}>
                          {budgetPct}%{idea.isGoalReached ? " ✅" : ""}
                        </span>
                        {/* Maximize icon on bar */}
                        <span style={{ fontSize:"10px", color:C.dim, opacity:0.6 }}>⛶</span>
                      </div>
                    </div>
                    <div style={{ height:"5px", background:C.surface, borderRadius:"3px", overflow:"hidden", marginBottom:"5px" }}>
                      <div style={{ width:`${budgetPct}%`, height:"100%", background:budgetColor, borderRadius:"3px", transition:"width .8s ease" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:"9px", color:C.muted }}>
                        Raised: <span style={{ color:C.text, fontWeight:"600" }}>{fmtINR(idea.currentFunding)}</span>
                      </span>
                      <span style={{ fontSize:"9px", color:C.muted }}>
                        Goal: <span style={{ color:C.text, fontWeight:"600" }}>{fmtINR(idea.budget)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Problem preview */}
                  {idea.problem && (
                    <div style={{ fontSize:"11px", color:C.muted, lineHeight:"1.6", borderTop:`1px solid ${C.border}`, paddingTop:"10px", marginTop:"6px" }}>
                      {idea.problem.length > 180 ? idea.problem.slice(0, 180) + "…" : idea.problem}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BUDGET MODAL ── */}
      {budgetIdea && (
        <BudgetModal
          idea={budgetIdea}
          onClose={() => setBudgetIdea(null)}
          onUpdated={handleBudgetUpdated}
        />
      )}

      {/* ── EDIT MODAL ── */}
      {editIdea && editForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"1rem" }}
          onClick={() => { setEditIdea(null); setEditForm(null); }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"10px", width:"100%", maxWidth:"620px", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ background:C.surface2, borderBottom:`1px solid ${C.border}`, padding:"13px 18px", borderRadius:"10px 10px 0 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:"13px", fontWeight:"700", color:C.text }}>✏️ Edit Idea</div>
                <div style={{ fontSize:"9px", color:C.muted, marginTop:"1px" }}>{editIdea.title}</div>
              </div>
              <button onClick={() => { setEditIdea(null); setEditForm(null); }} style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${C.border}`, color:C.muted, width:"26px", height:"26px", borderRadius:"50%", cursor:"pointer", fontSize:"11px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            <form onSubmit={handleUpdate} style={{ padding:"16px 18px 20px", display:"flex", flexDirection:"column", gap:"12px" }}>
              <div>
                <label style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Idea Title *</label>
                <input name="title" value={editForm.title} onChange={handleEditChange} required
                  onFocus={() => setFocusedField("e_title")} onBlur={() => setFocusedField(null)}
                  style={inputStyle("e_title", focusedField)}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                <div>
                  <label style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Domain *</label>
                  <select name="domain" value={editForm.domain} onChange={handleEditChange} required
                    onFocus={() => setFocusedField("e_domain")} onBlur={() => setFocusedField(null)}
                    style={inputStyle("e_domain", focusedField)}>
                    {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Stage</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px" }}>
                    {STAGES.map(s => (
                      <button key={s} type="button" onClick={() => setEditForm({ ...editForm, stage: s })}
                        style={{ padding:"5px 8px", borderRadius:"5px", cursor:"pointer", fontSize:"10px", fontWeight:"600", fontFamily:"'IBM Plex Sans',sans-serif",
                          border:`1px solid ${editForm.stage === s ? (STAGE_COLORS[s] || C.accent) : C.border}`,
                          background: editForm.stage === s ? `${STAGE_COLORS[s] || C.accent}15` : "transparent",
                          color: editForm.stage === s ? (STAGE_COLORS[s] || C.accent) : C.muted, transition:"all .15s" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Problem Statement</label>
                <textarea name="problem" value={editForm.problem} rows={4} onChange={handleEditChange}
                  onFocus={() => setFocusedField("e_problem")} onBlur={() => setFocusedField(null)}
                  style={inputStyle("e_problem", focusedField)}/>
              </div>
              <div>
                <label style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Solution</label>
                <textarea name="solution" value={editForm.solution} rows={4} onChange={handleEditChange}
                  onFocus={() => setFocusedField("e_solution")} onBlur={() => setFocusedField(null)}
                  style={inputStyle("e_solution", focusedField)}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                <div>
                  <label style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Target Market</label>
                  <textarea name="market" value={editForm.market} rows={3} onChange={handleEditChange}
                    onFocus={() => setFocusedField("e_market")} onBlur={() => setFocusedField(null)}
                    style={inputStyle("e_market", focusedField)}/>
                </div>
                <div>
                  <label style={{ fontSize:"9px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:"5px" }}>Revenue Model</label>
                  <textarea name="revenue" value={editForm.revenue} rows={3} onChange={handleEditChange}
                    onFocus={() => setFocusedField("e_revenue")} onBlur={() => setFocusedField(null)}
                    style={inputStyle("e_revenue", focusedField)}/>
                </div>
              </div>
              <div style={{ display:"flex", gap:"8px", paddingTop:"4px" }}>
                <button type="submit" style={{ flex:1, padding:"10px", background:C.accent, color:"#0d1117", border:"none", borderRadius:"6px", fontWeight:"700", fontSize:"12px", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>Save Changes</button>
                <button type="button" onClick={() => { setEditIdea(null); setEditForm(null); }} style={{ padding:"10px 18px", background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:"6px", fontSize:"12px", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AI ANALYSIS MODAL ── */}
      {analysisIdea && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", display:"flex", alignItems:isFullscreen ? "flex-start" : "center", justifyContent:"center", zIndex:1000, padding:isFullscreen ? "0" : "1rem" }}
          onClick={() => { if (!isFullscreen) setAnalysisIdea(null); }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:isFullscreen ? "0" : "10px", width:"100%", maxWidth:isFullscreen ? "100%" : "760px", height:isFullscreen ? "100vh" : "auto", maxHeight:isFullscreen ? "100vh" : "92vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,0.6)", display:"flex", flexDirection:"column" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ background:C.surface2, borderBottom:`1px solid ${C.border}`, padding:"13px 18px", borderRadius:isFullscreen ? "0" : "10px 10px 0 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, position:isFullscreen ? "sticky" : "static", top:0, zIndex:10 }}>
              <div>
                <div style={{ fontSize:"13px", fontWeight:"700", color:C.text }}>🤖 AI Investment Analysis</div>
                <div style={{ fontSize:"9px", color:C.muted, marginTop:"1px" }}>Analysing: <span style={{ color:C.text, fontWeight:"600" }}>{analysisIdea.title}</span></div>
              </div>
              <div style={{ display:"flex", gap:"6px" }}>
                <button onClick={() => setIsFullscreen(f => !f)} style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${C.border}`, color:C.muted, width:"26px", height:"26px", borderRadius:"5px", cursor:"pointer", fontSize:"12px", display:"flex", alignItems:"center", justifyContent:"center" }}>{isFullscreen ? "⊡" : "⛶"}</button>
                <button onClick={() => { setAnalysisIdea(null); setIsFullscreen(false); }} style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${C.border}`, color:C.muted, width:"26px", height:"26px", borderRadius:"50%", cursor:"pointer", fontSize:"11px", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              </div>
            </div>

            {aiLoading ? (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px", gap:"14px" }}>
                <div style={{ width:"24px", height:"24px", border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
                <div style={{ fontSize:"12px", color:C.muted }}>Running AI scoring engine...</div>
              </div>
            ) : !analysisData ? (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px" }}>
                <div style={{ fontSize:"12px", color:C.red }}>⚠️ Could not retrieve analysis. Ensure AI service is running on port 8000.</div>
              </div>
            ) : (() => {
              const score      = analysisData.success_probability_percent;
              const rawScore   = analysisData.raw_model_score;
              const penalty    = Math.max(0, rawScore - score);
              const scoreColor = score >= 70 ? C.green : score >= 40 ? C.orange : C.red;
              const strategic  = STRATEGIC_ADVICE[analysisData.strategic_assessment] || STRATEGIC_ADVICE["Moderate Growth Potential"];
              const { pros, cons } = getReasons(analysisData.explanation_sorted_by_impact);
              const shapData   = getShapData(analysisData.explanation_sorted_by_impact);
              const shapAllZero = Math.max(...shapData.map(d => d.abs), 0) < 0.0001;

              const ANALYSIS_TABS = [
                { k:"score",   l:"Score & Forecast" },
                { k:"factors", l:"Factor Analysis"  },
                { k:"improve", l:"How to Improve"   },
              ];

              return (
                <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
                  <div style={{ borderBottom:`1px solid ${C.border}`, display:"flex", padding:"0 18px", flexShrink:0 }}>
                    {ANALYSIS_TABS.map(({ k, l }) => (
                      <button key={k} onClick={() => setActiveTab(k)}
                        style={{ padding:"0 14px", height:"38px", border:"none", borderBottom: activeTab === k ? `2px solid ${C.accent}` : "2px solid transparent", background:"transparent", color: activeTab === k ? C.accent : C.muted, fontWeight: activeTab === k ? "600" : "400", fontSize:"11px", cursor:"pointer", transition:"all .15s", fontFamily:"'IBM Plex Sans',sans-serif" }}>{l}</button>
                    ))}
                  </div>

                  <div style={{ padding:"16px 18px 20px", flex:1, overflow:"auto" }}>
                    {activeTab === "score" && (
                      <div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
                          <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"14px", display:"flex", flexDirection:"column", alignItems:"center", gap:"12px" }}>
                            <ScoreRing score={score}/>
                            <div style={{ width:"100%" }}>
                              {[{ label:"Initial Score", val:rawScore, color:C.accent }, { label:"Calibrated Score", val:score, color:scoreColor }].map((s, i) => (
                                <div key={i} style={{ marginBottom:"8px" }}>
                                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                                    <span style={{ fontSize:"9px", color:C.muted }}>{s.label}</span>
                                    <span style={{ fontSize:"10px", fontWeight:"700", color:s.color, fontFamily:"'IBM Plex Mono',monospace" }}>{s.val}%</span>
                                  </div>
                                  <div style={{ height:"4px", background:C.surface, borderRadius:"2px", overflow:"hidden" }}>
                                    <div style={{ width:`${s.val}%`, height:"100%", background:s.color, borderRadius:"2px", transition:"width 1s ease" }}/>
                                  </div>
                                </div>
                              ))}
                              {penalty > 0 && <div style={{ fontSize:"9px", color:C.dim, textAlign:"center" }}>Risk calibration: −{penalty.toFixed(1)}%</div>}
                            </div>
                          </div>
                          <div style={{ background:strategic.bg, border:`1px solid ${strategic.border}`, borderRadius:"8px", padding:"14px" }}>
                            <div style={{ fontSize:"9px", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>Assessment</div>
                            <div style={{ fontSize:"13px", fontWeight:"700", color:strategic.color, marginBottom:"8px" }}>{strategic.icon} {analysisData.strategic_assessment}</div>
                            <div style={{ fontSize:"10px", color:C.muted, lineHeight:"1.6" }}>{strategic.advice}</div>
                          </div>
                          <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"14px" }}>
                            <div style={{ fontSize:"9px", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"10px" }}>Market Forecast</div>
                            {[
                              { l:"2 Years", v:`₹${(analysisData.market_forecast?.valuation_in_2_years * 83.5 * 1e6 / 1e7).toFixed(1)} Cr` },
                              { l:"5 Years", v:`₹${(analysisData.market_forecast?.valuation_in_5_years * 83.5 * 1e6 / 1e7).toFixed(1)} Cr` },
                            ].map((item, i) => (
                              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom: i === 0 ? `1px solid ${C.border}` : "none" }}>
                                <span style={{ fontSize:"10px", color:C.muted }}>{item.l}</span>
                                <span style={{ fontSize:"12px", fontWeight:"700", color:C.text, fontFamily:"'IBM Plex Mono',monospace" }}>{item.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {analysisData.model_warnings?.length > 0 && (
                          <div style={{ background:"rgba(210,153,34,.06)", border:"1px solid rgba(210,153,34,.2)", borderRadius:"7px", padding:"12px 14px", marginBottom:"14px" }}>
                            <div style={{ fontSize:"9px", fontWeight:"700", color:C.yellow, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>⚠️ Risk flags</div>
                            {analysisData.model_warnings.map((w, i) => (
                              <div key={i} style={{ display:"flex", gap:"8px", fontSize:"10px", color:C.muted, lineHeight:"1.6", marginBottom:"4px" }}>
                                <span style={{ color:C.yellow, flexShrink:0 }}>→</span><span>{w}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                          {pros.length > 0 && (
                            <div>
                              <div style={{ fontSize:"9px", fontWeight:"700", color:C.green, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>✅ Positive Signals</div>
                              {pros.map((p, i) => (
                                <div key={i} style={{ background:"rgba(63,185,80,.05)", border:"1px solid rgba(63,185,80,.12)", borderRadius:"6px", padding:"8px 10px", marginBottom:"6px" }}>
                                  <div style={{ fontSize:"10px", fontWeight:"700", color:C.green, marginBottom:"3px" }}>{p.icon} {p.name}</div>
                                  <div style={{ fontSize:"9px", color:C.muted, lineHeight:"1.5" }}>{p.pos}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {cons.length > 0 && (
                            <div>
                              <div style={{ fontSize:"9px", fontWeight:"700", color:C.red, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>⚠️ Risk Signals</div>
                              {cons.map((c, i) => (
                                <div key={i} style={{ background:"rgba(248,81,73,.05)", border:"1px solid rgba(248,81,73,.12)", borderRadius:"6px", padding:"8px 10px", marginBottom:"6px" }}>
                                  <div style={{ fontSize:"10px", fontWeight:"700", color:C.red, marginBottom:"3px" }}>{c.icon} {c.name}</div>
                                  <div style={{ fontSize:"9px", color:C.muted, lineHeight:"1.5" }}>{c.neg}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "factors" && (
                      <div>
                        <SectionHeader title="Factor Impact Analysis" sub="Which parts of your idea are helping vs hurting your score"/>
                        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                          {(shapAllZero
                            ? [...pros.map(p => ({ name:p.name, positive:true, barWidth:80 })), ...cons.map(c => ({ name:c.name, positive:false, barWidth:60 }))]
                            : shapData
                          ).map((d, i) => (
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                              <div style={{ width:"80px", fontSize:"10px", color:C.text, fontWeight:"600", textAlign:"right", flexShrink:0 }}>{d.name}</div>
                              <div style={{ flex:1, height:"8px", background:C.surface, borderRadius:"4px", overflow:"hidden" }}>
                                <div style={{ width:`${d.barWidth}%`, height:"100%", background:d.positive ? C.green : C.red, borderRadius:"4px", transition:"width .8s ease", minWidth:"3px" }}/>
                              </div>
                              {d.label && <div style={{ width:"40px", fontSize:"9px", fontWeight:"700", fontFamily:"'IBM Plex Mono',monospace", color:d.positive ? C.green : C.red, flexShrink:0 }}>{d.label}</div>}
                              <div style={{ fontSize:"8px", padding:"1px 5px", borderRadius:"3px", background:d.positive ? "rgba(63,185,80,.12)" : "rgba(248,81,73,.12)", color:d.positive ? C.green : C.red, flexShrink:0 }}>{d.positive ? "↑" : "↓"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === "improve" && (
                      <div>
                        <SectionHeader title="How to Improve Your Score" sub="Specific actions ordered by impact"/>
                        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"14px" }}>
                          {IMPROVEMENT_TIPS.map((t, i) => (
                            <div key={i} style={{ display:"flex", gap:"12px", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"11px 14px", alignItems:"flex-start" }}>
                              <span style={{ fontSize:"16px", flexShrink:0 }}>{t.icon}</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:"11px", fontWeight:"700", color:C.text, marginBottom:"3px" }}>{t.title}</div>
                                <div style={{ fontSize:"10px", color:C.muted, lineHeight:"1.5" }}>{t.detail}</div>
                              </div>
                              <div style={{ fontSize:"10px", fontWeight:"700", color:C.green, flexShrink:0, fontFamily:"'IBM Plex Mono',monospace", background:"rgba(63,185,80,.1)", padding:"2px 8px", borderRadius:"3px", alignSelf:"center" }}>{t.impact}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize:"9px", color:C.dim, marginTop:"14px", padding:"8px 12px", background:C.surface2, borderRadius:"5px", lineHeight:"1.6" }}>
                      ℹ️ Decision-support signal, not a financial guarantee. Initial: <span style={{ color:C.accent, fontFamily:"'IBM Plex Mono',monospace" }}>{rawScore}%</span> → Calibrated: <span style={{ color:scoreColor, fontFamily:"'IBM Plex Mono',monospace" }}>{score}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}