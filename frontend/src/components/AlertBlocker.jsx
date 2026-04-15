// frontend/src/components/AlertBlocker.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from "recharts";

const API = "http://localhost:5000/api/messages";
const INVESTOR_API = "http://localhost:5000/api/investor";
const INNOVATOR_API = "http://localhost:5000/api/innovator"; 
const tok = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

function playDing() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    [{ freq:880, delay:0 }, { freq:1100, delay:0.06 }].forEach(({ freq, delay }) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.75, ctx.currentTime + delay + 0.4);
      osc.connect(gain);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + 1.4);
    });
  } catch {}
}

const initials = (name = "?") => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

/* ── Palette ── */
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
  danger:   "#f85149",
};

const FEATURE_INFO = {
  relationships:          { name:"Network",       icon:"🤝", pos:"Strong network boosts growth.",  neg:"Limited network slows funding." },
  funding_total_usd:      { name:"Funding",       icon:"💰", pos:"Adequate funding runway.",      neg:"Low funding risk." },
  funding_rounds:         { name:"Fund Rounds",   icon:"📊", pos:"Investor confidence.",      neg:"Few repeat investors." },
  milestones:             { name:"Milestones",    icon:"🏆", pos:"Execution capability.",       neg:"Execution unproven." },
  is_web:                 { name:"Digital",       icon:"🌐", pos:"Scales globally.",         neg:"Higher scaling costs." },
  is_CA:                  { name:"Ecosystem",     icon:"📍", pos:"Strong ecosystem access.",       neg:"Limited access." },
  age_first_funding_year: { name:"Speed to Fund", icon:"⚡", pos:"Quick early traction.",              neg:"Slow early conviction." },
  age_last_funding_year:  { name:"Recency",       icon:"📅", pos:"Recent active growth.",           neg:"Funding gap risk." },
};

const STRATEGIC_ADVICE = {
  "Strong Growth Momentum":       { color:C.green,  bg:"rgba(63,185,80,.08)",  border:"rgba(63,185,80,.2)",  icon:"🚀", advice:"Strong execution. High confidence." },
  "Strong Network Advantage":     { color:C.accent, bg:"rgba(88,166,255,.08)", border:"rgba(88,166,255,.2)", icon:"🌟", advice:"Well-connected founders." },
  "Underfunded Risk":             { color:C.red,    bg:"rgba(248,81,73,.08)",  border:"rgba(248,81,73,.2)",  icon:"⚠️", advice:"Funding below sustainable threshold." },
  "Early Idea — High Risk":       { color:C.yellow, bg:"rgba(210,153,34,.08)", border:"rgba(210,153,34,.2)", icon:"🌱", advice:"Idea stage — monitor for traction." },
  "High Risk — Needs Validation": { color:C.red,    bg:"rgba(248,81,73,.08)",  border:"rgba(248,81,73,.2)",  icon:"🔴", advice:"Needs significant validation." },
  "Moderate Growth Potential":    { color:C.orange, bg:"rgba(240,136,62,.08)", border:"rgba(240,136,62,.2)", icon:"📈", advice:"Promising concept." },
};

const getReasons = (ex) => {
  if(!ex) return {pros:[],cons:[]};
  const pros=[],cons=[];
  Object.entries(ex).forEach(([k,v])=>{ 
    const info=FEATURE_INFO[k]; 
    if(!info) return; 
    if(v>=0) pros.push({...info,k}); 
    else cons.push({...info,k}); 
  });
  return {pros,cons};
};

const MetaRow = ({ label, value }) => (
  <div style={{ display:"flex", gap:"8px", marginBottom:"7px", fontSize:"12px" }}>
    <span style={{ color:C.muted, fontWeight:"600", minWidth:"72px", textTransform:"uppercase", fontSize:"9px", letterSpacing:"0.07em", paddingTop:"2px", flexShrink:0 }}>{label}</span>
    <span style={{ color:C.text, lineHeight:"1.5" }}>{value||"N/A"}</span>
  </div>
);

export default function AlertBlocker() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [alerts,   setAlerts]   = useState([]);
  const [current,  setCurrent]  = useState(0);
  const [sending,  setSending]  = useState(false);
  const [replyTxt, setReplyTxt] = useState("");
  
  // Visibility tracking
  const [dismissed, setDismissed] = useState(new Set());
  const prevAlertIds = useRef(new Set());
  
  // Idea & Analysis state
  const [fullIdea, setFullIdea]               = useState(null);
  const [ideaAnalysis, setIdeaAnalysis]       = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const overlayRef = useRef(null);
  const pollRef    = useRef(null);

  // Parse token directly without waiting for useEffect
  const token = localStorage.getItem("token");
  let userRole = null;
  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      userRole = decoded.role?.toLowerCase() || decoded.userType?.toLowerCase();
    } catch {}
  }

  const isActive = alerts.length > 0;
  const thread = alerts[current];

  // ── Safely Fetch Idea Details AND Analysis ──
  useEffect(() => {
    if (!thread || !thread.ideaId) {
      setIdeaAnalysis(null);
      setFullIdea(null);
      return;
    }

    let isMounted = true;
    setAnalysisLoading(true);

    const loadData = async () => {
      try {
        let currentRole = userRole;
        if (!currentRole && window.location.pathname.toLowerCase().includes("innovator")) {
            currentRole = "innovator";
        }

        // 1. Fetch Analysis (INVESTORS ONLY)
        if (currentRole !== "innovator") {
          try {
            const analysisRes = await axios.post(`${INVESTOR_API}/analyze-idea`, { ideaId: thread.ideaId }, { headers: tok() });
            if (isMounted && analysisRes.data) setIdeaAnalysis(analysisRes.data);
          } catch (err) { /* silent */ }
        } else {
          if (isMounted) setIdeaAnalysis(null);
        }

        // 2. Fetch Idea Details safely
        let ideasList = [];
        try {
          if (currentRole === "innovator") {
            const innRes = await axios.get(`${INNOVATOR_API}/ideas`, { headers: tok() });
            ideasList = Array.isArray(innRes.data) ? innRes.data : [];
          } else {
            const invRes = await axios.get(`${INVESTOR_API}/ideas`, { headers: tok() });
            ideasList = Array.isArray(invRes.data) ? invRes.data : [];
          }
        } catch (err) {
          console.warn("AlertBlocker: Could not fetch ideas list for details.");
        }

        if (isMounted) {
          const idea = ideasList.find(i => i._id === thread.ideaId);
          if (idea) setFullIdea(idea);
        }

      } catch (err) {
        console.error("AlertBlocker error loading data:", err);
      } finally {
        if (isMounted) setAnalysisLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [thread?.ideaId, location.pathname, userRole]);

  // ── UI BLOCKING EFFECTS ──
  useEffect(() => {
    if (isActive) document.body.classList.add("alert-blocking");
    else document.body.classList.remove("alert-blocking");
    return () => document.body.classList.remove("alert-blocking");
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const block = (e) => {
      if (overlayRef.current?.contains(e.target)) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      const modal = overlayRef.current?.querySelector("[data-modal]");
      if (modal) {
        modal.style.animation = "none";
        requestAnimationFrame(() => { modal.style.animation = "shake 0.4s ease"; });
      }
    };
    document.addEventListener("click",      block, true);
    document.addEventListener("mousedown",  block, true);
    document.addEventListener("touchstart", block, { capture:true, passive:false });
    document.addEventListener("touchend",   block, { capture:true, passive:false });
    return () => {
      document.removeEventListener("click",      block, true);
      document.removeEventListener("mousedown",  block, true);
      document.removeEventListener("touchstart", block, true);
      document.removeEventListener("touchend",   block, true);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const block = (e) => {
      const typing = ["INPUT","TEXTAREA"].includes(document.activeElement?.tagName);
      if (["Tab","Escape","F5"].includes(e.key)) {
        e.preventDefault(); e.stopImmediatePropagation(); return;
      }
      if (!typing && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", block, true);
    return () => window.removeEventListener("keydown", block, true);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const block = (e) => { if (!overlayRef.current?.contains(e.target)) e.preventDefault(); };
    window.addEventListener("wheel",     block, { passive:false });
    window.addEventListener("touchmove", block, { passive:false });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("wheel",     block);
      window.removeEventListener("touchmove", block);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    window.history.pushState(null, "", window.location.href);
    const block = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, [isActive, location]);

  // ── POLL ──
  const poll = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t || window.location.pathname.includes("/messages")) return;

    try {
      const r = await axios.get(`${API}/threads`, { headers: tok() });
      
      // Filter ONLY threads with unread counts that the user hasn't explicitly dismissed
      const activeUnread = r.data.filter(t => t.unreadCount > 0 && !dismissed.has(t.conversationId));

      let shouldDing = false;
      activeUnread.forEach(t => {
        if (!prevAlertIds.current.has(t.conversationId)) {
          shouldDing = true;
        }
      });

      if (shouldDing) playDing();

      prevAlertIds.current = new Set(activeUnread.map(t => t.conversationId));
      setAlerts(activeUnread);
      
    } catch (err) {
      console.error("AlertBlocker Polling Error:", err);
    }
  }, [dismissed]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 10000);
    return () => clearInterval(pollRef.current);
  }, [poll]);

  const handleActionComplete = (convId) => {
    setDismissed(prev => new Set([...prev, convId]));
    setAlerts(prev => {
      const next = prev.filter(a => a.conversationId !== convId);
      setCurrent(0); // Reset to first item
      return next;
    });
    setReplyTxt("");
    setIdeaAnalysis(null);
    setFullIdea(null);
  };

  const sendReply = async (thread) => {
    if (!replyTxt.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/send`, {
        ideaId:     thread.ideaId,
        receiverId: thread.otherUser._id,
        content:    replyTxt.trim(),
      }, { headers: tok() });
      handleActionComplete(thread.conversationId);
      navigate("/messages");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const notInterested = async (thread) => {
    setSending(true);
    try {
      await axios.post(`${API}/not-interested/${thread.conversationId}`, {}, { headers: tok() });
      handleActionComplete(thread.conversationId);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  if (!isActive || !thread) return null;

  return (
    <>
      <style>{`
        @keyframes alertPop { from { opacity:0; transform:scale(0.95) translateY(24px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes shake { 0%,100% { transform:translateX(0); } 20% { transform:translateX(-8px); } 40% { transform:translateX(8px); } 60% { transform:translateX(-5px); } 80% { transform:translateX(5px); } }
        body.alert-blocking * { pointer-events: none !important; }
        body.alert-blocking [data-alert-modal], body.alert-blocking [data-alert-modal] * { pointer-events: all !important; }
      `}</style>

      <div
        ref={overlayRef}
        style={{
          position:"fixed", inset:0, zIndex:2147483647,
          background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", pointerEvents:"all",
        }}
      >
        <div
          data-modal
          data-alert-modal
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: "14px",
            width: "100%", maxWidth: "880px",
            maxHeight: "92vh",
            boxShadow: "0 0 80px rgba(0,0,0,0.8)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            animation: "alertPop 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards",
            fontFamily: "'IBM Plex Sans', sans-serif"
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface2, display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700", color: "#fff" }}>
              {initials(thread.otherUser?.name)}
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>
                Message from {thread.otherUser?.name || "User"}
                <span style={{ marginLeft: "8px", fontSize: "10px", background: "rgba(88,166,255,0.15)", color: C.accent, padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                  {thread.otherUser?.role ? thread.otherUser.role.toUpperCase() : "MESSAGE"}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>
                Re: {thread.ideaTitle}
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            
            {/* The Unread Message */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                {thread.unreadCount} New Message{thread.unreadCount !== 1 ? "s" : ""}
              </div>
              <div style={{ background: C.surface2, padding: "14px", borderRadius: "8px", borderLeft: `3px solid ${C.accent}`, color: C.text, fontSize: "13px", lineHeight: "1.6", fontStyle: "italic" }}>
                "{thread.lastMessage}"
              </div>
            </div>

            {/* Core Idea Details Section */}
            {fullIdea && (
              <>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.text, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  💡 Idea Overview
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"12px",background:C.surface2,borderRadius:"7px",padding:"12px" }}>
                  <MetaRow label="Domain"    value={fullIdea.domain}/>
                  <MetaRow label="Stage"     value={fullIdea.stage}/>
                  <MetaRow label="Innovator" value={fullIdea.innovatorId?.name || thread.otherUser?.name}/>
                  <MetaRow label="Email"     value={fullIdea.innovatorId?.email}/>
                </div>
                <div style={{ background:C.surface2,borderRadius:"7px",padding:"12px",marginBottom:"20px" }}>
                  <MetaRow label="Problem"  value={fullIdea.problem}/>
                  <MetaRow label="Solution" value={fullIdea.solution}/>
                  <MetaRow label="Market"   value={fullIdea.market}/>
                  <MetaRow label="Revenue"  value={fullIdea.revenue}/>
                </div>
              </>
            )}

            {/* AI Analysis Section */}
            {(!userRole || userRole === "investor") && !window.location.pathname.toLowerCase().includes("innovator") && (
              <>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.text, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  🤖 AI Investment Analysis Review
                </div>

                {analysisLoading ? (
                  <div style={{ textAlign:"center", padding:"40px" }}>
                    <div style={{ width:"24px", height:"24px", border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto" }}/>
                    <p style={{ color:C.muted, marginTop:"10px", fontSize:"11px" }}>Loading previous analysis...</p>
                  </div>
                ) : ideaAnalysis ? (()=>{
                  const score     = ideaAnalysis.success_probability_percent;
                  const rawScore  = ideaAnalysis.raw_model_score;
                  const penalty   = Math.max(0, rawScore - score);
                  const {pros,cons} = getReasons(ideaAnalysis.explanation_sorted_by_impact);
                  
                  const strategic = STRATEGIC_ADVICE[ideaAnalysis.strategic_assessment] || STRATEGIC_ADVICE["Moderate Growth Potential"];
                  const scoreColor = score>=70?C.green:score>=40?C.orange:C.red;

                  const rawShapEntries = Object.entries(ideaAnalysis.explanation_sorted_by_impact||{})
                    .map(([k,v])=>({ name:FEATURE_INFO[k]?.name||k, raw:v, abs:Math.abs(v), positive:v>=0 }))
                    .sort((a,b)=>b.abs-a.abs)
                    .slice(0,8);
                  const maxAbs = Math.max(...rawShapEntries.map(d=>d.abs), 0.0001);
                  const shapData = rawShapEntries.map(d=>({
                    ...d,
                    barWidth: Math.round((d.abs/maxAbs)*100),
                    label: d.raw>=0 ? `+${(d.abs*100).toFixed(2)}` : `−${(d.abs*100).toFixed(2)}`,
                  }));

                  const val2Yr = ideaAnalysis.market_forecast?.valuation_in_2_years || 0;
                  const val5Yr = ideaAnalysis.market_forecast?.valuation_in_5_years || 0;
                  const forecastData = [
                    { year:"Now",   val:0 },
                    { year:"+2 Yr", val:parseFloat((val2Yr*83.5*1e6/1e7).toFixed(1)) },
                    { year:"+5 Yr", val:parseFloat((val5Yr*83.5*1e6/1e7).toFixed(1)) },
                  ];

                  const scoreBreakdown = [
                    { label:"Initial Score",    val:rawScore, color:C.accent,   note:"Historical startup patterns" },
                    { label:"Calibrated Score", val:score,    color:scoreColor, note:`Risk-adjusted (${penalty.toFixed(1)}% calib)` },
                  ];

                  return (
                    <div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:"10px", marginBottom:"12px" }}>
                        <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"14px" }}>
                          <div style={{ fontSize:"9px", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"10px" }}>Score Breakdown</div>
                          {scoreBreakdown.map((s,i)=>(
                            <div key={i} style={{ marginBottom:"10px" }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                                <span style={{ fontSize:"10px", color:C.muted }}>{s.label}</span>
                                <span style={{ fontSize:"12px", fontWeight:"700", color:s.color, fontFamily:"'IBM Plex Mono',monospace" }}>{s.val}%</span>
                              </div>
                              <div style={{ height:"5px", background:C.surface, borderRadius:"3px", overflow:"hidden" }}>
                                <div style={{ width:`${s.val}%`, height:"100%", background:s.color, borderRadius:"3px" }}/>
                              </div>
                              <div style={{ fontSize:"9px", color:C.dim, marginTop:"3px" }}>{s.note}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ background:strategic.bg, border:`1px solid ${strategic.border}`, borderRadius:"7px", padding:"14px" }}>
                          <div style={{ fontSize:"9px", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>Strategic Assessment</div>
                          <div style={{ fontSize:"13px", fontWeight:"700", color:strategic.color, marginBottom:"6px" }}>{strategic.icon} {ideaAnalysis.strategic_assessment}</div>
                          <div style={{ fontSize:"10px", color:C.muted, lineHeight:"1.6" }}>{strategic.advice}</div>
                        </div>
                      </div>

                      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:"10px", marginBottom:"12px" }}>
                        <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"14px" }}>
                          <div style={{ fontSize:"9px", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"4px" }}>Factor Impact Analysis</div>
                          <div style={{ fontSize:"9px", color:C.dim, marginBottom:"12px" }}>Green = strengthens · Red = weakens</div>
                          {shapData.length===0 ? (
                            <div style={{ fontSize:"11px", color:C.muted }}>No factor data available.</div>
                          ) : (
                            <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
                              {shapData.map((d,i)=>(
                                <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                                  <div style={{ width:"82px", fontSize:"10px", color:C.text, fontWeight:"600", textAlign:"right", flexShrink:0 }}>{d.name}</div>
                                  <div style={{ flex:1, height:"10px", background:C.surface, borderRadius:"4px", overflow:"hidden" }}>
                                    <div style={{ width:`${d.barWidth}%`, height:"100%", background:d.positive?`linear-gradient(90deg,${C.green}99,${C.green})`:`linear-gradient(90deg,${C.red}99,${C.red})`, borderRadius:"4px", minWidth:d.barWidth>0?"4px":"0" }}/>
                                  </div>
                                  <div style={{ width:"36px", fontSize:"9px", fontWeight:"700", fontFamily:"'IBM Plex Mono',monospace", color:d.positive?C.green:C.red, flexShrink:0 }}>{d.label}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"14px" }}>
                          <div style={{ fontSize:"9px", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"4px" }}>Valuation Forecast (₹ Cr)</div>
                          <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={forecastData} margin={{top:10,right:0,left:-20,bottom:0}}>
                              <XAxis dataKey="year" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                              <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                              <Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"5px",fontSize:"10px"}} itemStyle={{color:C.text}} formatter={v=>[`₹${v} Cr`,"Valuation"]}/>
                              <Bar dataKey="val" radius={[3,3,0,0]} maxBarSize={30}>
                                <Cell fill={C.dim}/><Cell fill={C.accent}/><Cell fill={C.purple}/>
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                        {pros.length>0&&(
                          <div>
                            <div style={{ fontSize:"9px", fontWeight:"700", color:C.green, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>✅ Positive Signals</div>
                            {pros.slice(0,3).map((p,i)=>(
                              <div key={i} style={{ background:"rgba(63,185,80,.05)", border:"1px solid rgba(63,185,80,.12)", borderRadius:"5px", padding:"7px 10px", marginBottom:"5px" }}>
                                <div style={{ fontSize:"10px", fontWeight:"700", color:C.green }}>{p.icon} {p.name}</div>
                                <div style={{ fontSize:"9px", color:C.muted, marginTop:"2px", lineHeight:"1.5" }}>{p.pos}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {cons.length>0&&(
                          <div>
                            <div style={{ fontSize:"9px", fontWeight:"700", color:C.red, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>⚠️ Risk Signals</div>
                            {cons.slice(0,3).map((c,i)=>(
                              <div key={i} style={{ background:"rgba(248,81,73,.05)", border:"1px solid rgba(248,81,73,.12)", borderRadius:"5px", padding:"7px 10px", marginBottom:"5px" }}>
                                <div style={{ fontSize:"10px", fontWeight:"700", color:C.red }}>{c.icon} {c.name}</div>
                                <div style={{ fontSize:"9px", color:C.muted, marginTop:"2px", lineHeight:"1.5" }}>{c.neg}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div style={{ padding:"12px", background:"rgba(248,81,73,.06)", border:"1px solid rgba(248,81,73,.2)", borderRadius:"6px", color:C.red, fontSize:"11px" }}>
                    ℹ️ AI analysis data is either restricted or unavailable for this idea.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer / Reply Action Area */}
          <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
            <textarea
              value={replyTxt}
              onChange={e => setReplyTxt(e.target.value)}
              placeholder={`Reply to ${thread.otherUser?.name?.split(" ")[0] || "them"}... (Enter to send)`}
              rows={3}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: "8px",
                border: `1px solid ${C.border}`, background: C.bg,
                color: C.text, fontSize: "13px", resize: "none", outline: "none",
                fontFamily: "inherit", marginBottom: "12px", boxSizing: "border-box"
              }}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(thread); }
              }}
            />
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => notInterested(thread)} disabled={sending} style={{
                flex: 1, padding: "12px", borderRadius: "8px",
                border: `1px solid ${C.danger}40`, background: `${C.danger}10`,
                color: C.danger, fontSize: "13px", fontWeight: "600",
                cursor: sending ? "wait" : "pointer", opacity: sending ? 0.6 : 1, transition: "all .15s"
              }}>
                {sending ? "Processing..." : "👋 Not Interested"}
              </button>
              <button onClick={() => sendReply(thread)} disabled={!replyTxt.trim() || sending} style={{
                flex: 1.5, padding: "12px", borderRadius: "8px", border: "none",
                background: replyTxt.trim() ? C.accent : C.surface2,
                color: replyTxt.trim() ? "#fff" : C.dim,
                fontSize: "13px", fontWeight: "700",
                cursor: replyTxt.trim() ? "pointer" : "default", opacity: sending ? 0.7 : 1, transition: "all .15s"
              }}>
                {sending ? "Sending..." : "Send Reply →"}
              </button>
            </div>
          </div>

          {/* Multi-alert indicator */}
          {alerts.length > 1 && (
            <div style={{ padding: "10px 20px", display: "flex", justifyContent: "center", gap: "6px", background: C.surface2, borderTop: `1px solid ${C.border}` }}>
              {alerts.map((_, i) => (
                <div key={i} style={{ width: i === current ? "20px" : "8px", height: "8px", borderRadius: "4px", background: i === current ? C.accent : C.border, transition: "all .2s", cursor:"pointer" }} onClick={() => setCurrent(i)}/>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}