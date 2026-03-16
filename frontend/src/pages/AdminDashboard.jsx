import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend, CartesianGrid, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, LineChart, Line,
} from "recharts";

/* ── Inject fonts & global styles ── */
if (typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin   { to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes slideIn{ from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
    * { box-sizing:border-box; margin:0; padding:0; }
    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-track { background:#0a0e1a; }
    ::-webkit-scrollbar-thumb { background:#1e2a45; border-radius:3px; }
    input::placeholder { color:#3a4560; }
    button:hover { filter: brightness(1.08); }
  `;
  document.head.appendChild(style);
}

/* ── Palette ── */
const C = {
  bg:      "#070b14",
  s1:      "#0d1220",
  s2:      "#111827",
  s3:      "#161f30",
  border:  "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.10)",
  accent:  "#00d9ff",
  green:   "#00e5a0",
  red:     "#ff4d6a",
  yellow:  "#ffc542",
  purple:  "#a78bfa",
  orange:  "#ff8c42",
  pink:    "#ff6eb4",
  text:    "#e8edf5",
  muted:   "#6b7a99",
  dim:     "#2e3a52",
};

const PALETTE = [C.accent, C.green, C.purple, C.orange, C.yellow, C.pink, C.red];
const STAGE_C = { Idea: C.yellow, Prototype: C.accent, MVP: C.green, Live: C.purple };

const FEATURE_INFO = {
  relationships:          { name: "Network",       icon: "🤝", positiveMsg: "Strong investor/partner network.", negativeMsg: "Limited network slows funding." },
  funding_total_usd:      { name: "Funding",        icon: "💰", positiveMsg: "Adequate funding for runway.",    negativeMsg: "Low funding — resource risk." },
  funding_rounds:         { name: "Fund Rounds",    icon: "📊", positiveMsg: "Multiple rounds = confidence.",   negativeMsg: "Few rounds — low repeat trust." },
  milestones:             { name: "Milestones",     icon: "🏆", positiveMsg: "Execution proven.",               negativeMsg: "No milestones — unproven." },
  is_web:                 { name: "Digital",        icon: "🌐", positiveMsg: "Web scales at low cost.",         negativeMsg: "High scaling costs." },
  is_CA:                  { name: "Ecosystem",      icon: "📍", positiveMsg: "Strong ecosystem access.",        negativeMsg: "Limited investor access." },
  age_first_funding_year: { name: "Speed to Fund",  icon: "⚡", positiveMsg: "Quick funding shows traction.",  negativeMsg: "Slow — early conviction lacking." },
  age_last_funding_year:  { name: "Recency",        icon: "📅", positiveMsg: "Recent funding active.",          negativeMsg: "Funding gap — stalled growth." },
};

const STRATEGIC_ADVICE = {
  "Strong Growth Momentum":       { color: C.green,  icon: "🚀", advice: "High confidence for growth-stage investors." },
  "Strong Network Advantage":     { color: C.accent, icon: "🌟", advice: "Well-connected. Attracts better follow-on." },
  "Underfunded Risk":             { color: C.red,    icon: "⚠️", advice: "Funding below threshold. Evaluate burn rate." },
  "Early Idea — High Risk":       { color: C.yellow, icon: "🌱", advice: "High risk. Monitor traction before investing." },
  "High Risk — Needs Validation": { color: C.red,    icon: "🔴", advice: "Multiple risk signals. Needs validation." },
  "Moderate Growth Potential":    { color: C.orange, icon: "📈", advice: "Promising but needs stronger indicators." },
};

/* ══════════════
   SUB COMPONENTS
══════════════ */

function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px", gap:"14px" }}>
      <div style={{ width:"32px", height:"32px", border:`2px solid ${C.dim}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      <span style={{ fontSize:"13px", color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>Loading...</span>
    </div>
  );
}

function Modal({ title, onClose, maxWidth="860px", children }) {
  const [max, setMax] = useState(false);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"16px" }} onClick={onClose}>
      <div style={{ background:C.s1, border:`1px solid ${C.border2}`, borderRadius: max?"0":"14px", width: max?"100vw":"100%", maxWidth: max?"100vw":maxWidth, height: max?"100vh":"auto", maxHeight: max?"100vh":"90vh", display:"flex", flexDirection:"column", boxShadow:"0 30px 80px rgba(0,0,0,.8)", transition:"all .2s" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <span style={{ fontSize:"15px", fontWeight:"700", color:C.text, fontFamily:"'Syne',sans-serif" }}>{title}</span>
          <div style={{ display:"flex", gap:"6px" }}>
            <button onClick={()=>setMax(p=>!p)} style={{ background:C.s3, border:`1px solid ${C.border}`, borderRadius:"6px", width:"30px", height:"30px", color:C.muted, cursor:"pointer", fontSize:"14px" }}>{max?"⊡":"⛶"}</button>
            <button onClick={onClose} style={{ background:C.s3, border:`1px solid ${C.border}`, borderRadius:"6px", width:"30px", height:"30px", color:C.muted, cursor:"pointer", fontSize:"14px" }}>✕</button>
          </div>
        </div>
        <div style={{ padding:"20px", overflowY:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color=C.accent, icon, onClick, trend }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background: hov&&onClick ? C.s3:C.s2, border:`1px solid ${hov&&onClick?color+"40":C.border}`, borderRadius:"12px", padding:"18px 20px", cursor:onClick?"pointer":"default", transition:"all .2s", animation:"fadeUp .4s ease-out" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px" }}>
        <span style={{ fontSize:"11px", fontWeight:"600", color:C.muted, textTransform:"uppercase", letterSpacing:"0.09em", fontFamily:"'DM Sans',sans-serif" }}>{label}</span>
        <span style={{ fontSize:"18px" }}>{icon}</span>
      </div>
      <div style={{ fontSize:"30px", fontWeight:"800", color, fontFamily:"'DM Mono',monospace", lineHeight:1, marginBottom:"6px" }}>{value}</div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"11px", color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>{sub}</span>
        {trend !== undefined && (
          <span style={{ fontSize:"11px", fontWeight:"700", color: trend>=0?C.green:C.red, fontFamily:"'DM Mono',monospace" }}>
            {trend>=0?"↑":"↓"}{Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom:"16px" }}>
      <div style={{ fontSize:"14px", fontWeight:"700", color:C.text, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.01em" }}>{title}</div>
      {sub && <div style={{ fontSize:"11px", color:C.muted, marginTop:"2px", fontFamily:"'DM Sans',sans-serif" }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, sub, children, style:sx={} }) {
  return (
    <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"18px", animation:"fadeUp .5s ease-out", ...sx }}>
      <SectionTitle title={title} sub={sub}/>
      {children}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{ fontSize:"10px", fontWeight:"700", padding:"2px 8px", borderRadius:"4px", background:`${color}18`, color, border:`1px solid ${color}30`, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:"'DM Sans',sans-serif" }}>
      {label}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ marginBottom:"10px", display:"flex", gap:"8px" }}>
      <span style={{ fontSize:"10px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", minWidth:"80px", paddingTop:"2px", flexShrink:0, fontFamily:"'DM Sans',sans-serif" }}>{label}</span>
      <span style={{ fontSize:"13px", color:C.text, lineHeight:"1.5", fontFamily:"'DM Sans',sans-serif" }}>{value||"N/A"}</span>
    </div>
  );
}

const TT = ({ contentStyle, itemStyle, labelStyle, ...props }) => (
  <Tooltip
    contentStyle={{ background:C.s3, border:`1px solid ${C.border2}`, borderRadius:"8px", fontSize:"12px", fontFamily:"'DM Sans',sans-serif", ...contentStyle }}
    itemStyle={{ color:C.text, ...itemStyle }}
    labelStyle={{ color:C.muted, ...labelStyle }}
    {...props}
  />
);

/* ═══════════════════════════
   MAIN ADMIN DASHBOARD
═══════════════════════════ */
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

  const [activeSection, setActiveSection]         = useState("overview");
  const [selectedUser, setSelectedUser]           = useState(null);
  const [selectedIdea, setSelectedIdea]           = useState(null);
  const [ideaAnalysis, setIdeaAnalysis]           = useState(null);
  const [analysisLoading, setAnalysisLoading]     = useState(false);
  const [loading, setLoading]                     = useState(true);

  useEffect(() => { if (!token) navigate("/login"); else loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sr, pr, ar, ir, pir, air] = await Promise.all([
        axios.get("http://localhost:5000/api/admin/dashboard-stats",    { headers }),
        axios.get("http://localhost:5000/api/admin/pending-users",      { headers }),
        axios.get("http://localhost:5000/api/admin/approved-users",     { headers }),
        axios.get("http://localhost:5000/api/admin/ideas",              { headers }),
        axios.get("http://localhost:5000/api/admin/pending-investors",  { headers }),
        axios.get("http://localhost:5000/api/admin/approved-investors", { headers }),
      ]);
      setStats(sr.data);
      setPendingUsers(pr.data);
      setApprovedUsers(ar.data);
      setIdeas(ir.data);
      setPendingInvestors(pir.data);
      setApprovedInvestors(air.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const approveUser = async (id) => {
    await axios.put(`http://localhost:5000/api/admin/approve/${id}`, {}, { headers });
    loadAll(); setSelectedUser(null);
  };

  const rejectUser = async (id) => {
    await axios.put(`http://localhost:5000/api/admin/reject/${id}`, {}, { headers });
    loadAll(); setSelectedUser(null);
  };

  const handleViewIdea = async (idea) => {
    setSelectedIdea(idea); setIdeaAnalysis(null); setAnalysisLoading(true);
    try {
      const milestoneMap = { Idea:1, Prototype:2, MVP:3, Live:4 };
      const fundingMap   = { Idea:50000, Prototype:200000, MVP:500000, Live:1500000 };
      const aiInput = {
        age_first_funding_year: 1.0, age_last_funding_year: 2.0,
        relationships: 5,
        funding_rounds: idea.stage==="Live" ? 2 : 1,
        funding_total_usd: fundingMap[idea.stage]||50000,
        milestones: milestoneMap[idea.stage]||1,
        is_CA: 0,
        is_web: ["AI","Edtech","Fintech","Healthcare"].includes(idea.domain) ? 1 : 0,
        founded_year: new Date().getFullYear(),
        stage: idea.stage||"Idea",
        domain: idea.domain||"General",
      };
      const r = await axios.post("http://localhost:5000/api/admin/analyze-idea", { aiInput }, { headers });
      setIdeaAnalysis(r.data);
    } catch(e) { console.error(e); }
    finally { setAnalysisLoading(false); }
  };

  const getReasons = (explanation) => {
    if (!explanation) return { pros:[], cons:[] };
    const pros=[], cons=[];
    Object.entries(explanation).forEach(([k,v])=>{ const info=FEATURE_INFO[k]; if(!info) return; if(v>=0) pros.push({...info,k}); else cons.push({...info,k}); });
    return { pros, cons };
  };

  if (loading || !stats) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg }}>
      <Spinner/>
    </div>
  );

  /* ── Derived chart data ── */
  const domainData   = stats.ideasByDomain  || [];
  const stageData    = stats.ideasByStage   || [];
  const totalUsers   = (stats.approved||0) + (stats.pending||0) + (stats.approvedInvestors||0) + (stats.pendingInvestors||0);
  const approvalRate = totalUsers > 0 ? Math.round(((stats.approved||0)+(stats.approvedInvestors||0))/totalUsers*100) : 0;
  const pendingTotal = (stats.pending||0) + (stats.pendingInvestors||0);

  /* Approval funnel */
  const funnelData = [
    { name:"Registered", value: totalUsers },
    { name:"Pending",    value: pendingTotal },
    { name:"Approved",   value: (stats.approved||0)+(stats.approvedInvestors||0) },
    { name:"Ideas",      value: stats.totalIdeas||0 },
  ];

  /* User distribution */
  const userDistData = [
    { name:"Approved Innovators", value: stats.approved||0,          fill: C.green  },
    { name:"Pending Innovators",  value: stats.pending||0,           fill: C.yellow },
    { name:"Approved Investors",  value: stats.approvedInvestors||0, fill: C.accent },
    { name:"Pending Investors",   value: stats.pendingInvestors||0,  fill: C.orange },
  ].filter(d=>d.value>0);

  /* Platform health radar */
  const radarData = [
    { subject:"Ideas",       val: Math.min(100, (stats.totalIdeas||0)*10) },
    { subject:"Innovators",  val: Math.min(100, (stats.approved||0)*15) },
    { subject:"Investors",   val: Math.min(100, (stats.approvedInvestors||0)*20) },
    { subject:"Domains",     val: Math.min(100, (domainData.length)*15) },
    { subject:"Approval%",   val: approvalRate },
  ];

  /* Stage trend (simulated from real counts) */
  const stageTrend = stageData.map((s,i)=>({ stage:s.stage||s._id||`Stage ${i}`, count:s.count }));

  /* Domain bar */
  const domainBar = domainData.map(d=>({ domain:d._id||d.domain||"?", count:d.count }));

  /* Ideas by domain for pie */
  const domainPie = domainBar.map((d,i)=>({ ...d, fill:PALETTE[i%PALETTE.length] }));

  const TABS = [
    { key:"overview",           label:"📊 Overview" },
    { key:"pendingInnovators",  label:"⏳ Pending Innovators",  count: pendingUsers.length },
    { key:"approvedInnovators", label:"✅ Approved Innovators",  count: approvedUsers.length },
    { key:"pendingInvestors",   label:"🔔 Pending Investors",    count: pendingInvestors.length },
    { key:"approvedInvestors",  label:"💼 Approved Investors",   count: approvedInvestors.length },
    { key:"ideas",              label:"💡 All Ideas",             count: ideas.length },
  ];

  const listMap = {
    pendingInnovators:  pendingUsers,
    approvedInnovators: approvedUsers,
    pendingInvestors,
    approvedInvestors,
  };

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:"14px" }}>
      <div style={{ maxWidth:"1700px", margin:"0 auto", padding:"20px 24px" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px", padding:"16px 20px", background:C.s2, border:`1px solid ${C.border}`, borderRadius:"12px" }}>
          <div>
            <div style={{ fontSize:"20px", fontWeight:"800", color:C.text, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em" }}>🛡️ Admin Command Center</div>
            <div style={{ fontSize:"11px", color:C.muted, marginTop:"3px" }}>
              {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · Live Platform Data
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px", background:C.s3, border:`1px solid ${C.green}30`, borderRadius:"6px", padding:"6px 12px" }}>
              <span style={{ width:"7px", height:"7px", background:C.green, borderRadius:"50%", animation:"pulse 2s infinite", display:"inline-block" }}/>
              <span style={{ fontSize:"11px", fontWeight:"600", color:C.green }}>System Live</span>
            </div>
            <button onClick={loadAll} style={{ background:C.s3, border:`1px solid ${C.border2}`, borderRadius:"6px", padding:"6px 14px", color:C.muted, cursor:"pointer", fontSize:"12px", fontWeight:"600" }}>
              ⟳ Refresh
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"20px", background:C.s2, padding:"8px", borderRadius:"10px", border:`1px solid ${C.border}` }}>
          {TABS.map(({ key, label, count }) => (
            <button key={key} onClick={()=>setActiveSection(key)} style={{
              background: activeSection===key ? C.accent : "transparent",
              color:       activeSection===key ? C.bg    : C.muted,
              border: `1px solid ${activeSection===key ? C.accent : "transparent"}`,
              borderRadius:"7px", padding:"7px 14px", cursor:"pointer",
              fontSize:"12px", fontWeight:"700", fontFamily:"'DM Sans',sans-serif",
              display:"flex", alignItems:"center", gap:"6px", transition:"all .15s",
            }}>
              {label}
              {count !== undefined && (
                <span style={{ background: activeSection===key ? "rgba(0,0,0,.2)":"rgba(255,255,255,.1)", borderRadius:"4px", padding:"1px 6px", fontSize:"10px" }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════
            OVERVIEW TAB
        ════════════════════════════ */}
        {activeSection === "overview" && (
          <div style={{ animation:"fadeUp .4s ease-out" }}>

            {/* KPI Row 1 */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"10px", marginBottom:"14px" }}>
              <KpiCard label="Total Users"    value={totalUsers}                  sub="All registered"           color={C.accent}  icon="👥" trend={12}/>
              <KpiCard label="Total Ideas"    value={stats.totalIdeas||0}         sub="Submitted"                color={C.green}   icon="💡" trend={8}/>
              <KpiCard label="Approval Rate"  value={`${approvalRate}%`}          sub="Of all users"             color={approvalRate>60?C.green:C.yellow} icon="✅"/>
              <KpiCard label="Pending Action" value={pendingTotal}                sub="Need review"              color={pendingTotal>0?C.red:C.green} icon="⏳"/>
              <KpiCard label="Domains Active" value={domainData.length}           sub="Unique sectors"           color={C.purple}  icon="🏷️"/>
              <KpiCard label="Stages Tracked" value={stageData.length}            sub="MVP · Live · etc"         color={C.orange}  icon="📈"/>
            </div>

            {/* Charts Row 1 */}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 1fr", gap:"12px", marginBottom:"12px" }}>

              {/* Domain Bar */}
              <ChartCard title="Ideas by Domain" sub="Distribution across all startup categories">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={domainBar} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                    <XAxis dataKey="domain" tick={{fill:C.muted,fontSize:11,fontFamily:"'DM Sans',sans-serif"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <TT/>
                    <Bar dataKey="count" name="Ideas" radius={[4,4,0,0]} maxBarSize={36}>
                      {domainBar.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* User Distribution Pie */}
              <ChartCard title="User Distribution" sub="Role & approval status">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={userDistData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3}>
                      {userDistData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                    </Pie>
                    <TT/>
                    <Legend iconType="circle" iconSize={7} formatter={v=><span style={{color:C.muted,fontSize:"10px",fontFamily:"'DM Sans'"}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Platform Health Radar */}
              <ChartCard title="Platform Health" sub="Multi-dimension score">
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={C.border}/>
                    <PolarAngleAxis dataKey="subject" tick={{fill:C.muted,fontSize:10,fontFamily:"'DM Sans'"}}/>
                    <Radar name="Health" dataKey="val" stroke={C.accent} fill={C.accent} fillOpacity={0.15} strokeWidth={2}/>
                    <TT/>
                  </RadarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr", gap:"12px", marginBottom:"12px" }}>

              {/* Approval Funnel */}
              <ChartCard title="User Funnel" sub="Registered → Active">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} layout="vertical" margin={{top:0,right:20,left:10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
                    <XAxis type="number" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:C.text,fontSize:11,fontFamily:"'DM Sans'"}} axisLine={false} tickLine={false} width={80}/>
                    <TT/>
                    <Bar dataKey="value" name="Count" radius={[0,4,4,0]} maxBarSize={28}>
                      {funnelData.map((_,i)=><Cell key={i} fill={PALETTE[i]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Stage Distribution Area */}
              <ChartCard title="Stage Distribution" sub="Startup maturity breakdown">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stageTrend} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                    <XAxis dataKey="stage" tick={{fill:C.muted,fontSize:11,fontFamily:"'DM Sans'"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <TT/>
                    <Bar dataKey="count" name="Ideas" radius={[4,4,0,0]} maxBarSize={40}>
                      {stageTrend.map((d,i)=><Cell key={i} fill={STAGE_C[d.stage]||PALETTE[i]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Domain Pie */}
              <ChartCard title="Domain Share" sub="Ideas per sector">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={domainPie} dataKey="count" nameKey="domain" outerRadius={72} paddingAngle={2}>
                      {domainPie.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                    </Pie>
                    <TT formatter={(v,n)=>[v,n]}/>
                    <Legend iconType="circle" iconSize={7} formatter={v=><span style={{color:C.muted,fontSize:"10px"}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Summary Table + Pending Actions side by side */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>

              {/* Platform Summary Table */}
              <ChartCard title="Platform Summary" sub="Live counts from database">
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <tbody>
                    {[
                      { label:"Total Registered Users",    val: totalUsers,                              color:C.text   },
                      { label:"Approved Innovators",       val: stats.approved||0,                       color:C.green  },
                      { label:"Pending Innovators",        val: stats.pending||0,                        color:C.yellow },
                      { label:"Approved Investors",        val: stats.approvedInvestors||0,              color:C.accent },
                      { label:"Pending Investors",         val: stats.pendingInvestors||0,               color:C.orange },
                      { label:"Total Ideas Submitted",     val: stats.totalIdeas||0,                     color:C.purple },
                      { label:"Active Domains",            val: domainData.length,                       color:C.pink   },
                      { label:"Approval Rate",             val: `${approvalRate}%`,                      color: approvalRate>60?C.green:C.yellow },
                      { label:"Pending Review Queue",      val: pendingTotal,                            color: pendingTotal>0?C.red:C.green },
                    ].map((row,i)=>(
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"8px 0", fontSize:"12px", color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>{row.label}</td>
                        <td style={{ padding:"8px 0", fontSize:"13px", fontWeight:"700", color:row.color, textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ChartCard>

              {/* Pending Actions */}
              <ChartCard title="⚡ Pending Actions" sub="Require immediate review">
                {pendingTotal === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px", color:C.muted, fontSize:"13px" }}>
                    <div style={{ fontSize:"32px", marginBottom:"8px" }}>✅</div>
                    All caught up! No pending reviews.
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px", maxHeight:"280px", overflowY:"auto" }}>
                    {[...pendingUsers.slice(0,4).map(u=>({...u,_type:"Innovator"})), ...pendingInvestors.slice(0,4).map(u=>({...u,_type:"Investor"}))].map(u=>(
                      <div key={u._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:C.s3, borderRadius:"8px", border:`1px solid ${C.border}` }}>
                        <div>
                          <div style={{ fontSize:"13px", fontWeight:"700", color:C.text, fontFamily:"'Syne',sans-serif" }}>{u.name}</div>
                          <div style={{ fontSize:"11px", color:C.muted, marginTop:"2px" }}>{u.email}</div>
                        </div>
                        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                          <Badge label={u._type} color={u._type==="Investor"?C.accent:C.green}/>
                          <button onClick={()=>setSelectedUser(u)} style={{ background:C.accent, border:"none", borderRadius:"6px", padding:"5px 10px", color:C.bg, cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>
                            Review
                          </button>
                        </div>
                      </div>
                    ))}
                    {pendingTotal > 8 && (
                      <div style={{ fontSize:"11px", color:C.muted, textAlign:"center", paddingTop:"4px" }}>
                        +{pendingTotal-8} more pending
                      </div>
                    )}
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Recent Ideas */}
            <ChartCard title="Recent Idea Submissions" sub="Latest ventures on the platform">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"10px" }}>
                {ideas.slice(0,6).map(idea=>(
                  <div key={idea._id} style={{ background:C.s3, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"7px" }}>
                      <Badge label={idea.domain} color={PALETTE[0]}/>
                      <Badge label={idea.stage}  color={STAGE_C[idea.stage]||C.muted}/>
                    </div>
                    <div style={{ fontSize:"13px", fontWeight:"700", color:C.text, marginBottom:"5px", fontFamily:"'Syne',sans-serif" }}>{idea.title}</div>
                    <div style={{ fontSize:"11px", color:C.muted, lineHeight:"1.5", marginBottom:"8px" }}>{idea.problem?.substring(0,90)}...</div>
                    <button onClick={()=>handleViewIdea(idea)} style={{ width:"100%", padding:"6px", background:"transparent", border:`1px solid ${C.accent}40`, borderRadius:"5px", color:C.accent, cursor:"pointer", fontSize:"11px", fontWeight:"700", fontFamily:"'DM Sans',sans-serif" }}>
                      🤖 AI Analysis
                    </button>
                  </div>
                ))}
              </div>
              {ideas.length > 6 && (
                <button onClick={()=>setActiveSection("ideas")} style={{ marginTop:"12px", background:"transparent", border:`1px solid ${C.border2}`, color:C.accent, padding:"7px 16px", borderRadius:"6px", cursor:"pointer", fontSize:"12px", fontWeight:"700" }}>
                  View all {ideas.length} ideas →
                </button>
              )}
            </ChartCard>
          </div>
        )}

        {/* ════════════════════════════
            USER LIST TABS
        ════════════════════════════ */}
        {["pendingInnovators","approvedInnovators","pendingInvestors","approvedInvestors"].includes(activeSection) && (
          <div style={{ animation:"fadeUp .4s ease-out" }}>
            <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"18px" }}>
              <SectionTitle
                title={TABS.find(t=>t.key===activeSection)?.label?.replace(/[^ -~]/g,"").trim() || activeSection}
                sub={`${listMap[activeSection]?.length||0} users`}
              />
              {(listMap[activeSection]||[]).length === 0 ? (
                <div style={{ textAlign:"center", padding:"48px", color:C.muted }}>No users found.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {(listMap[activeSection]||[]).map(u=>(
                    <div key={u._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", background:C.s3, borderRadius:"10px", border:`1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontSize:"14px", fontWeight:"700", color:C.text, fontFamily:"'Syne',sans-serif" }}>{u.name}</div>
                        <div style={{ fontSize:"12px", color:C.muted, margin:"3px 0" }}>{u.email}</div>
                        <div style={{ display:"flex", gap:"6px", marginTop:"4px" }}>
                          <Badge label={u.role}   color={u.role==="investor"?C.accent:C.green}/>
                          <Badge label={u.status} color={u.status==="pending"?C.yellow:C.green}/>
                        </div>
                      </div>
                      <button onClick={()=>setSelectedUser(u)} style={{ background:`linear-gradient(135deg,${C.accent},#0099cc)`, border:"none", borderRadius:"8px", padding:"9px 18px", color:C.bg, cursor:"pointer", fontSize:"12px", fontWeight:"700", fontFamily:"'DM Sans',sans-serif" }}>
                        View KYC
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════
            IDEAS TAB
        ════════════════════════════ */}
        {activeSection === "ideas" && (
          <div style={{ animation:"fadeUp .4s ease-out" }}>
            <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"18px" }}>
              <SectionTitle title="All Submitted Ideas" sub={`${ideas.length} ventures on the platform`}/>
              {ideas.length === 0 ? (
                <div style={{ textAlign:"center", padding:"48px", color:C.muted }}>No ideas found.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {ideas.map(idea=>(
                    <div key={idea._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", background:C.s3, borderRadius:"10px", borderLeft:`3px solid ${STAGE_C[idea.stage]||C.accent}`, border:`1px solid ${C.border}` }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:"14px", fontWeight:"700", color:C.text, marginBottom:"4px", fontFamily:"'Syne',sans-serif" }}>{idea.title}</div>
                        <div style={{ display:"flex", gap:"6px", marginBottom:"5px" }}>
                          <Badge label={idea.domain} color={C.accent}/>
                          <Badge label={idea.stage}  color={STAGE_C[idea.stage]||C.muted}/>
                          <span style={{ fontSize:"11px", color:C.muted }}>by {idea.innovatorId?.name||"Unknown"}</span>
                        </div>
                        <div style={{ fontSize:"12px", color:C.muted, lineHeight:"1.4" }}>{idea.problem?.substring(0,100)}...</div>
                      </div>
                      <button onClick={()=>handleViewIdea(idea)} style={{ background:`linear-gradient(135deg,${C.purple},#7c3aed)`, border:"none", borderRadius:"8px", padding:"9px 18px", color:"#fff", cursor:"pointer", fontSize:"12px", fontWeight:"700", fontFamily:"'DM Sans',sans-serif", marginLeft:"12px", flexShrink:0 }}>
                        🤖 AI Analysis
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════════════ KYC MODAL ════════════ */}
      {selectedUser && (
        <Modal title={`👤 KYC — ${selectedUser.name}`} onClose={()=>setSelectedUser(null)} maxWidth="600px">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px", marginBottom:"8px" }}>
            <DetailRow label="Name"     value={selectedUser.name}/>
            <DetailRow label="Email"    value={selectedUser.email}/>
            <DetailRow label="Role"     value={selectedUser.role}/>
            <DetailRow label="Status"   value={selectedUser.status}/>
            <DetailRow label="Phone"    value={selectedUser.phone}/>
            <DetailRow label="LinkedIn" value={selectedUser.linkedin}/>
          </div>
          {selectedUser.documents?.identityProof && (
            <a href={`http://localhost:5000/uploads/${selectedUser.documents.identityProof}`} target="_blank" rel="noreferrer"
              style={{ color:C.accent, fontWeight:"700", display:"block", margin:"14px 0", fontSize:"13px" }}>
              📄 View Identity Document
            </a>
          )}
          {selectedUser.status === "pending" && (
            <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
              <button onClick={()=>approveUser(selectedUser._id)} style={{ flex:1, padding:"12px", background:C.green, border:"none", borderRadius:"8px", color:C.bg, cursor:"pointer", fontSize:"13px", fontWeight:"800", fontFamily:"'Syne',sans-serif" }}>
                ✅ Approve
              </button>
              <button onClick={()=>rejectUser(selectedUser._id)} style={{ flex:1, padding:"12px", background:C.red, border:"none", borderRadius:"8px", color:"#fff", cursor:"pointer", fontSize:"13px", fontWeight:"800", fontFamily:"'Syne',sans-serif" }}>
                ❌ Reject
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* ════════════ IDEA + AI MODAL ════════════ */}
      {selectedIdea && (
        <Modal title={`💡 ${selectedIdea.title}`} onClose={()=>{ setSelectedIdea(null); setIdeaAnalysis(null); }} maxWidth="920px">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px", background:C.s3, borderRadius:"8px", padding:"14px", marginBottom:"14px" }}>
            <DetailRow label="Domain"    value={selectedIdea.domain}/>
            <DetailRow label="Stage"     value={selectedIdea.stage}/>
            <DetailRow label="Innovator" value={selectedIdea.innovatorId?.name}/>
            <DetailRow label="Email"     value={selectedIdea.innovatorId?.email}/>
          </div>
          <div style={{ background:C.s3, borderRadius:"8px", padding:"14px", marginBottom:"14px" }}>
            <DetailRow label="Problem"  value={selectedIdea.problem}/>
            <DetailRow label="Solution" value={selectedIdea.solution}/>
            <DetailRow label="Market"   value={selectedIdea.market}/>
            <DetailRow label="Revenue"  value={selectedIdea.revenue}/>
          </div>

          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:"16px", marginBottom:"14px" }}>
            <div style={{ fontSize:"14px", fontWeight:"700", color:C.text, marginBottom:"14px", fontFamily:"'Syne',sans-serif" }}>🤖 AI Investment Analysis</div>
            {analysisLoading ? <Spinner/> : ideaAnalysis ? (() => {
              const score = ideaAnalysis.success_probability_percent;
              const col   = score>=70?C.green:score>=50?C.orange:C.red;
              const { pros, cons } = getReasons(ideaAnalysis.explanation_sorted_by_impact);
              const strategic = STRATEGIC_ADVICE[ideaAnalysis.strategic_assessment] || STRATEGIC_ADVICE["Moderate Growth Potential"];
              const svgS=120, svgR=50, svgC=60, circ=2*Math.PI*svgR, off=circ-(score/100)*circ;

              /* SHAP bars */
              const shapEntries = Object.entries(ideaAnalysis.explanation_sorted_by_impact||{})
                .map(([k,v])=>({ name:FEATURE_INFO[k]?.name||k, val:v, abs:Math.abs(v), pos:v>=0 }))
                .sort((a,b)=>b.abs-a.abs).slice(0,7);
              const maxAbs = Math.max(...shapEntries.map(d=>d.abs), 0.0001);

              /* Forecast */
              const forecastData = [
                { label:"Now",    val:0 },
                { label:"+2 Yr",  val:parseFloat((ideaAnalysis.market_forecast?.valuation_in_2_years*83.5*1e6/1e7).toFixed(1)) },
                { label:"+5 Yr",  val:parseFloat((ideaAnalysis.market_forecast?.valuation_in_5_years*83.5*1e6/1e7).toFixed(1)) },
              ];

              return (
                <div>
                  {/* Row 1 */}
                  <div style={{ display:"grid", gridTemplateColumns:"auto 1fr 1fr", gap:"12px", marginBottom:"12px" }}>
                    {/* Score ring */}
                    <div style={{ background:C.s3, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"16px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"8px" }}>
                      <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em" }}>Success Score</div>
                      <svg width={svgS} height={svgS} viewBox={`0 0 ${svgS} ${svgS}`}>
                        <circle cx={svgC} cy={svgC} r={svgR} fill="none" stroke={C.dim} strokeWidth="9"/>
                        <circle cx={svgC} cy={svgC} r={svgR} fill="none" stroke={col} strokeWidth="9"
                          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
                          transform={`rotate(-90 ${svgC} ${svgC})`} style={{transition:"stroke-dashoffset 1s ease"}}/>
                        <text x={svgC} y={svgC-5} textAnchor="middle" fontSize="19" fontWeight="800" fill={col} fontFamily="'DM Mono',monospace">{score}%</text>
                        <text x={svgC} y={svgC+12} textAnchor="middle" fontSize="9" fill={C.muted} fontFamily="'DM Sans',sans-serif">
                          {score>=70?"High":score>=50?"Moderate":"Low"}
                        </text>
                      </svg>
                      <div style={{ fontSize:"10px", color:C.muted, textAlign:"center" }}>Raw: {ideaAnalysis.raw_model_score}%</div>
                    </div>

                    {/* Strategic */}
                    <div style={{ background:`${strategic.color}10`, border:`1px solid ${strategic.color}30`, borderRadius:"10px", padding:"14px" }}>
                      <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>Strategic Assessment</div>
                      <div style={{ fontSize:"14px", fontWeight:"800", color:strategic.color, marginBottom:"8px", fontFamily:"'Syne',sans-serif" }}>{strategic.icon} {ideaAnalysis.strategic_assessment}</div>
                      <div style={{ fontSize:"12px", color:C.muted, lineHeight:"1.6" }}>{strategic.advice}</div>
                    </div>

                    {/* Forecast chart */}
                    <div style={{ background:C.s3, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px" }}>
                      <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>Valuation Forecast (₹ Cr)</div>
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={forecastData} margin={{top:0,right:4,left:-20,bottom:0}}>
                          <XAxis dataKey="label" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                          <TT formatter={v=>[`₹${v} Cr`,"Valuation"]}/>
                          <Bar dataKey="val" radius={[3,3,0,0]} maxBarSize={36}>
                            <Cell fill={C.dim}/><Cell fill={C.accent}/><Cell fill={C.purple}/>
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Warnings */}
                  {ideaAnalysis.model_warnings?.length > 0 && (
                    <div style={{ background:`${C.yellow}0d`, border:`1px solid ${C.yellow}40`, borderRadius:"8px", padding:"12px 14px", marginBottom:"12px" }}>
                      <div style={{ fontSize:"11px", fontWeight:"700", color:C.yellow, marginBottom:"6px" }}>⚠️ Score Adjustment Reasons</div>
                      {ideaAnalysis.model_warnings.map((w,i)=>(
                        <div key={i} style={{ fontSize:"11px", color:C.muted, lineHeight:"1.5", marginBottom:"3px" }}>→ {w}</div>
                      ))}
                    </div>
                  )}

                  {/* SHAP + Pros/Cons */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                    {/* Factor bars */}
                    <div style={{ background:C.s3, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px" }}>
                      <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"12px" }}>Factor Impact</div>
                      {shapEntries.map((d,i)=>(
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"7px" }}>
                          <div style={{ width:"76px", fontSize:"10px", color:C.text, textAlign:"right", flexShrink:0 }}>{d.name}</div>
                          <div style={{ flex:1, height:"8px", background:C.dim, borderRadius:"4px", overflow:"hidden" }}>
                            <div style={{ width:`${(d.abs/maxAbs)*100}%`, height:"100%", background:d.pos?C.green:C.red, borderRadius:"4px", transition:"width .8s ease", minWidth:d.abs>0?"3px":"0" }}/>
                          </div>
                          <div style={{ width:"30px", fontSize:"9px", fontWeight:"700", color:d.pos?C.green:C.red, fontFamily:"'DM Mono',monospace" }}>
                            {d.pos?"+":"-"}{(d.abs*100).toFixed(1)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pros & Cons */}
                    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                      <div>
                        <div style={{ fontSize:"10px", fontWeight:"700", color:C.green, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"6px" }}>✅ Positive Signals</div>
                        {pros.slice(0,3).map((p,i)=>(
                          <div key={i} style={{ background:`${C.green}0d`, border:`1px solid ${C.green}20`, borderRadius:"7px", padding:"8px 10px", marginBottom:"5px" }}>
                            <div style={{ fontSize:"11px", fontWeight:"700", color:C.green }}>{p.icon} {p.name}</div>
                            <div style={{ fontSize:"10px", color:C.muted, marginTop:"2px", lineHeight:"1.4" }}>{p.positiveMsg}</div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize:"10px", fontWeight:"700", color:C.red, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"6px" }}>⚠️ Risk Factors</div>
                        {cons.slice(0,3).map((c,i)=>(
                          <div key={i} style={{ background:`${C.red}0d`, border:`1px solid ${C.red}20`, borderRadius:"7px", padding:"8px 10px", marginBottom:"5px" }}>
                            <div style={{ fontSize:"11px", fontWeight:"700", color:C.red }}>{c.icon} {c.name}</div>
                            <div style={{ fontSize:"10px", color:C.muted, marginTop:"2px", lineHeight:"1.4" }}>{c.negativeMsg}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize:"10px", color:C.dim, background:C.s3, borderRadius:"6px", padding:"8px 12px", marginTop:"12px", lineHeight:"1.5" }}>
                    ℹ️ AI-generated analysis for decision-support only. Not financial advice.
                  </div>
                </div>
              );
            })() : (
              <div style={{ padding:"12px", background:`${C.red}0d`, border:`1px solid ${C.red}30`, borderRadius:"8px", color:C.red, fontSize:"12px" }}>
                ⚠️ AI analysis unavailable — ensure predictor is running on port 8000.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
