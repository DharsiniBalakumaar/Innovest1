import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend, CartesianGrid, Area, AreaChart,
} from "recharts";
import { useSearchParams } from "react-router-dom";

/* ── inject fonts + keyframes ── */
if (typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    * { box-sizing:border-box; margin:0; padding:0; }
    ::-webkit-scrollbar { width:4px; height:4px; }
    ::-webkit-scrollbar-track { background:#0d1117; }
    ::-webkit-scrollbar-thumb { background:#21262d; border-radius:2px; }
    input::placeholder { color:#484f58; }
  `;
  document.head.appendChild(style);
}

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
};

const DOMAIN_COLORS = [C.accent, C.green, C.purple, C.orange, C.yellow, "#ec6cb9", "#39d353"];
const STAGE_COLORS  = { Idea: C.yellow, Prototype: C.accent, MVP: C.green, Live: C.purple };

const FEATURE_INFO = {
  relationships:          { name:"Network",       icon:"🤝", pos:"Strong investor/partner network boosts growth.",   neg:"Limited network slows funding opportunities." },
  funding_total_usd:      { name:"Funding",       icon:"💰", pos:"Adequate funding provides runway to scale.",       neg:"Low funding — startup may run out of resources." },
  funding_rounds:         { name:"Fund Rounds",   icon:"📊", pos:"Multiple rounds signal investor confidence.",      neg:"Few rounds — hasn't attracted repeat investors." },
  milestones:             { name:"Milestones",    icon:"🏆", pos:"Milestones show real execution capability.",       neg:"No milestones — execution is unproven." },
  is_web:                 { name:"Digital",       icon:"🌐", pos:"Web products scale globally at low cost.",         neg:"Non-digital products have higher scaling costs." },
  is_CA:                  { name:"Ecosystem",     icon:"📍", pos:"Strong ecosystem access for VC and talent.",      neg:"Outside major hubs — limited investor access." },
  age_first_funding_year: { name:"Speed to Fund",icon:"⚡", pos:"Quick funding shows early traction.",              neg:"Slow first funding — early conviction lacking." },
  age_last_funding_year:  { name:"Recency",       icon:"📅", pos:"Recent funding confirms active growth.",          neg:"Funding gap — possible stalled growth." },
};

const STRATEGIC_ADVICE = {
  "Strong Growth Momentum":       { color:C.green,  bg:"rgba(63,185,80,.08)",  border:"rgba(63,185,80,.2)",  icon:"🚀", advice:"Strong execution. High confidence for growth-stage investors." },
  "Strong Network Advantage":     { color:C.accent, bg:"rgba(88,166,255,.08)", border:"rgba(88,166,255,.2)", icon:"🌟", advice:"Well-connected founders attract better talent and follow-on funding." },
  "Underfunded Risk":             { color:C.red,    bg:"rgba(248,81,73,.08)",  border:"rgba(248,81,73,.2)",  icon:"⚠️", advice:"Funding below sustainable threshold. Evaluate burn rate." },
  "Early Idea — High Risk":       { color:C.yellow, bg:"rgba(210,153,34,.08)", border:"rgba(210,153,34,.2)", icon:"🌱", advice:"Idea stage — high risk. Monitor for traction before investing." },
  "High Risk — Needs Validation": { color:C.red,    bg:"rgba(248,81,73,.08)",  border:"rgba(248,81,73,.2)",  icon:"🔴", advice:"Multiple risk signals. Needs significant validation." },
  "Moderate Growth Potential":    { color:C.orange, bg:"rgba(240,136,62,.08)", border:"rgba(240,136,62,.2)", icon:"📈", advice:"Promising concept but needs stronger network or milestones." },
};



/* ══════════════════════
   SUB-COMPONENTS
══════════════════════ */

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:"14px", paddingBottom:"10px", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ fontSize:"11px", fontWeight:"700", color:C.text, letterSpacing:"0.01em" }}>{title}</div>
      {sub && <div style={{ fontSize:"10px", color:C.muted, marginTop:"2px" }}>{sub}</div>}
    </div>
  );
}

function KpiTile({ label, value, sub, color=C.accent, icon }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"16px 18px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
        <span style={{ fontSize:"10px", fontWeight:"700", color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</span>
        {icon && <span style={{ fontSize:"15px" }}>{icon}</span>}
      </div>
      <div style={{ fontSize:"26px", fontWeight:"700", color, fontFamily:"'IBM Plex Mono',monospace", lineHeight:1, marginBottom:"6px" }}>{value}</div>
      <div style={{ fontSize:"10px", color:C.muted }}>{sub}</div>
    </div>
  );
}

function ScoreBar({ score }) {
  const color = score>=70?C.green:score>=50?C.orange:C.red;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
        <span style={{ fontSize:"10px", color:C.muted }}>AI Success Score</span>
        <span style={{ fontSize:"12px", fontWeight:"700", color, fontFamily:"'IBM Plex Mono',monospace" }}>{score}%</span>
      </div>
      <div style={{ height:"5px", background:C.surface, borderRadius:"3px", overflow:"hidden" }}>
        <div style={{ width:`${score}%`, height:"100%", background:`linear-gradient(90deg,${color},${color}bb)`, borderRadius:"3px", transition:"width 1s ease" }}/>
      </div>
      <div style={{ fontSize:"10px", color:C.muted, marginTop:"3px" }}>
        {score>=70?"High Potential":score>=50?"Moderate":"Needs Work"}
      </div>
    </div>
  );
}

function TrustBadge({ icon, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"6px", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:"5px", padding:"5px 10px" }}>
      <span style={{ fontSize:"12px" }}>{icon}</span>
      <span style={{ fontSize:"10px", fontWeight:"600", color:C.muted }}>{label}</span>
    </div>
  );
}

const MetaRow = ({ label, value }) => (
  <div style={{ display:"flex", gap:"8px", marginBottom:"7px", fontSize:"12px" }}>
    <span style={{ color:C.muted, fontWeight:"600", minWidth:"72px", textTransform:"uppercase", fontSize:"9px", letterSpacing:"0.07em", paddingTop:"2px", flexShrink:0 }}>{label}</span>
    <span style={{ color:C.text, lineHeight:"1.5" }}>{value||"N/A"}</span>
  </div>
);

function Modal({ title, onClose, children }) {
  const [max, setMax] = useState(false);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.82)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px" }} onClick={onClose}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:max?"0":"10px", width:max?"100vw":"100%", maxWidth:max?"100vw":"960px", height:max?"100vh":"auto", maxHeight:max?"100vh":"92vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 60px rgba(0,0,0,.8)", transition:"all .2s" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 18px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <span style={{ fontSize:"13px", fontWeight:"700", color:C.text }}>{title}</span>
          <div style={{ display:"flex", gap:"5px" }}>
            <button style={Btn.icon} onClick={()=>setMax(p=>!p)}>{max?"⊡":"⛶"}</button>
            <button style={Btn.icon} onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={{ padding:"18px", overflowY:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════ */
export default function InvestorDashboard() {
  const token   = localStorage.getItem("token");
  const headers = { Authorization:`Bearer ${token}` };

  const [ideas,           setIdeas]           = useState([]);
  const [stats,           setStats]           = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [selectedIdea,    setSelectedIdea]    = useState(null);
  const [ideaAnalysis,    setIdeaAnalysis]    = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [likeLoading,     setLikeLoading]     = useState({});
  const [search,          setSearch]          = useState("");
  const [filterDomain,    setFilterDomain]    = useState("All");
  const [filterStage,     setFilterStage]     = useState("All");
  // Inside the component, replace the activeView useState with:
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("tab") || "dashboard";
  const setActiveView = (tab) => setSearchParams({ tab });

  useEffect(()=>{ fetchAll(); },[]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ir, sr] = await Promise.all([
        axios.get("http://localhost:5000/api/investor/ideas", { headers }),
        axios.get("http://localhost:5000/api/investor/dashboard-stats", { headers }),
      ]);
      setIdeas(ir.data); setStats(sr.data);
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  };

  const fetchIdeas = useCallback(async () => {
    try {
      const p={};
      if(filterDomain!=="All") p.domain=filterDomain;
      if(filterStage!=="All")  p.stage=filterStage;
      if(search.trim())        p.search=search.trim();
      const r = await axios.get("http://localhost:5000/api/investor/ideas",{headers,params:p});
      setIdeas(r.data);
    } catch(e){ console.error(e); }
  },[filterDomain,filterStage,search]);

  useEffect(()=>{ fetchIdeas(); },[fetchIdeas]);

  const handleLike = async (id, e) => {
    e.stopPropagation();
    setLikeLoading(p=>({...p,[id]:true}));
    try {
      const r = await axios.post(`http://localhost:5000/api/investor/like/${id}`,{},{headers});
      setIdeas(prev=>prev.map(i=>i._id===id?{...i,likedByMe:r.data.liked,likeCount:r.data.likeCount}:i));
      if(selectedIdea?._id===id) setSelectedIdea(p=>({...p,likedByMe:r.data.liked,likeCount:r.data.likeCount}));
      const s=await axios.get("http://localhost:5000/api/investor/dashboard-stats",{headers});
      setStats(s.data);
    } catch(e){ console.error(e); }
    finally{ setLikeLoading(p=>({...p,[id]:false})); }
  };

  const handleViewIdea = async (idea) => {
    setSelectedIdea(idea); setIdeaAnalysis(null); setAnalysisLoading(true);
    try {
      const r=await axios.post("http://localhost:5000/api/investor/analyze-idea",{ideaId:idea._id},{headers});
      setIdeaAnalysis(r.data);
    } catch(e){ console.error(e); }
    finally{ setAnalysisLoading(false); }
  };

  const getReasons = (ex) => {
    if(!ex) return {pros:[],cons:[]};
    const pros=[],cons=[];
    Object.entries(ex).forEach(([k,v])=>{ const info=FEATURE_INFO[k]; if(!info) return; if(v>=0) pros.push({...info,k}); else cons.push({...info,k}); });
    return {pros,cons};
  };

  const displayIdeas = activeView==="liked" ? ideas.filter(i=>i.likedByMe) : ideas;
  const domainData   = stats?.ideasByDomain||[];
  const stageData    = stats?.ideasByStage||[];

  if(loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:"28px",height:"28px",border:`2px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto" }}/>
        <p style={{ marginTop:"12px",color:C.muted,fontSize:"11px",fontFamily:"'IBM Plex Sans',sans-serif" }}>Loading investor portal...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:"'IBM Plex Sans',sans-serif", fontSize:"16px" }}>


      <div style={{ maxWidth:"1600px", margin:"0 auto", padding:"18px 24px" }}>

        {/* ════ DASHBOARD ════ */}
        {activeView==="dashboard" && (
          <div style={{ animation:"fadeUp .5s ease-out" }}>

            {/* Report header bar */}
            <div style={{ marginBottom:"16px", padding:"14px 18px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px" }}>
              <div>
                <div style={{ fontSize:"14px",fontWeight:"700",color:C.text }}>Startup Intelligence Dashboard</div>
                <div style={{ fontSize:"10px",color:C.muted,marginTop:"2px" }}>
                  Live data from your platform · {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                </div>
              </div>
              <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                <TrustBadge icon="🔒" label="Secure Connection"/>
                <TrustBadge icon="🤖" label="AI-Powered Analysis"/>
              </div>
            </div>

            {/* 4 KPI tiles — real data only */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px" }}>
              <KpiTile label="Total Ideas"    value={stats?.total??0}              sub="Submitted on platform"   color={C.accent}  icon="💡"/>
              <KpiTile label="Your Watchlist" value={stats?.likedByMe??0}          sub="Ideas you have liked"    color={C.red}     icon="❤️"/>
              <KpiTile label="Domains"        value={stats?.ideasByDomain?.length??0} sub="Unique sectors"       color={C.green}   icon="🏷️"/>
              <KpiTile label="Stages Tracked" value={stats?.ideasByStage?.length??0}  sub="MVP · Prototype · Live" color={C.purple} icon="📊"/>
            </div>

            {/* Charts row — bar + pie */}
            <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:"12px",marginBottom:"16px" }}>
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px" }}>
                <SectionHeader title="Revenue & CAGR by Industry Domain" sub="Venture distribution across sectors"/>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={domainData} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                    <XAxis dataKey="domain" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"6px",fontSize:"11px"}} itemStyle={{color:C.text}} labelStyle={{color:C.muted}}/>
                    <Bar dataKey="count" radius={[3,3,0,0]} maxBarSize={30}>
                      {domainData.map((_,i)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px" }}>
                <SectionHeader title="Stage Distribution" sub="Portfolio maturity spread"/>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={stageData} dataKey="count" nameKey="stage" innerRadius={50} outerRadius={72} paddingAngle={3}>
                      {stageData.map((e,i)=><Cell key={i} fill={STAGE_COLORS[e.stage]||DOMAIN_COLORS[i]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"6px",fontSize:"11px"}} itemStyle={{color:C.text}}/>
                    <Legend iconType="circle" iconSize={7} formatter={v=><span style={{color:C.muted,fontSize:"10px"}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend + Income statement */}
            <div style={{ display:"grid",gridTemplateColumns:"3fr 2fr",gap:"12px",marginBottom:"16px" }}>
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px" }}>
                <SectionHeader title="Ideas by Domain" sub="Real distribution from submitted ventures"/>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={domainData} margin={{top:4,right:4,left:-24,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                    <XAxis dataKey="domain" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"6px",fontSize:"11px"}} itemStyle={{color:C.text}} labelStyle={{color:C.muted}}/>
                    <Bar dataKey="count" radius={[3,3,0,0]} maxBarSize={30}>
                      {domainData.map((_,i)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Real data table only */}
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px" }}>
                <SectionHeader title="Platform Summary" sub="Live counts from your database"/>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <tbody>
                    {[
                      {label:"Total Ideas",          value:stats?.total??0,                                  color:C.text},
                      {label:"Your Watchlist",        value:stats?.likedByMe??0,                             color:C.purple},
                      {label:"Unique Domains",        value:stats?.ideasByDomain?.length??0,                 color:C.text},
                      {label:"Stage Breakdown",       value:stats?.ideasByStage?.length??0,                  color:C.text},
                      ...( stats?.ideasByStage?.map(s=>({ label:`  ↳ ${s.stage}`, value:s.count, color:STAGE_COLORS[s.stage]||C.muted })) || [] ),
                      ...( stats?.ideasByDomain?.slice(0,3).map(d=>({ label:`  ↳ ${d.domain}`, value:d.count, color:C.muted })) || [] ),
                    ].map((row,i)=>(
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"6px 0",fontSize:"11px",color:C.muted }}>{row.label}</td>
                        <td style={{ padding:"6px 0",fontSize:"12px",fontWeight:"700",color:row.color,textAlign:"right",fontFamily:"'IBM Plex Mono',monospace" }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent ideas */}
            <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px" }}>
              <SectionHeader title="Recent Venture Submissions" sub="Latest ideas on the platform"/>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:"10px" }}>
                {ideas.slice(0,6).map(idea=>(
                  <MiniCard key={idea._id} idea={idea} onView={()=>handleViewIdea(idea)} onLike={e=>handleLike(idea._id,e)} likeLoading={likeLoading[idea._id]}/>
                ))}
              </div>
              {ideas.length>6 && (
                <button onClick={()=>setActiveView("browse")} style={{ marginTop:"10px",background:"transparent",border:`1px solid ${C.border}`,color:C.accent,padding:"7px 16px",borderRadius:"5px",cursor:"pointer",fontSize:"11px",fontWeight:"600" }}>
                  View all {ideas.length} ideas →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════ BROWSE / LIKED ════ */}
        {(activeView==="browse"||activeView==="liked") && (
          <div style={{ animation:"fadeUp .4s ease-out" }}>
            <div style={{ display:"flex",gap:"8px",alignItems:"center",marginBottom:"14px",background:C.surface,padding:"8px 12px",borderRadius:"8px",border:`1px solid ${C.border}`,flexWrap:"wrap" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"8px",flex:1,background:C.surface2,borderRadius:"5px",padding:"7px 11px",border:`1px solid ${C.border}`,minWidth:"180px" }}>
                <span style={{ color:C.muted,fontSize:"12px" }}>🔍</span>
                <input style={{ border:"none",background:"none",outline:"none",fontSize:"12px",color:C.text,width:"100%",fontFamily:"'IBM Plex Sans',sans-serif" }} placeholder="Search ideas..." value={search} onChange={e=>setSearch(e.target.value)}/>
                {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"11px" }}>✕</button>}
              </div>
              {["All","AI","Fintech","Edtech","Healthcare"].map(d=>(
                <button key={d} onClick={()=>setFilterDomain(d)} style={{ padding:"6px 12px",borderRadius:"5px",border:`1px solid ${filterDomain===d?C.accent:C.border}`,background:filterDomain===d?"rgba(88,166,255,.08)":"transparent",color:filterDomain===d?C.accent:C.muted,cursor:"pointer",fontSize:"11px",fontWeight:"600",fontFamily:"'IBM Plex Sans',sans-serif" }}>{d}</button>
              ))}
              <span style={{ marginLeft:"auto",fontSize:"10px",color:C.muted }}>{displayIdeas.length} results</span>
            </div>

            {displayIdeas.length===0 ? (
              <div style={{ textAlign:"center",padding:"60px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px" }}>
                <div style={{ fontSize:"36px",marginBottom:"10px" }}>{activeView==="liked"?"💔":"🔍"}</div>
                <p style={{ color:C.muted,fontSize:"12px" }}>{activeView==="liked"?"Nothing on your watchlist yet.":"No ideas match your search."}</p>
              </div>
            ) : (
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"10px" }}>
                {displayIdeas.map(idea=>(
                  <IdeaCard key={idea._id} idea={idea} onView={()=>handleViewIdea(idea)} onLike={e=>handleLike(idea._id,e)} likeLoading={likeLoading[idea._id]}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ WHY INNOVEST ════ */}
        {activeView==="trust" && (
          <div style={{ animation:"fadeUp .4s ease-out" }}>

            {/* Banner */}
            <div style={{ marginBottom:"16px",padding:"22px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",textAlign:"center" }}>
              <div style={{ fontSize:"10px",fontWeight:"700",color:C.accent,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"8px" }}>Trusted by India's Smartest Investors</div>
              <div style={{ fontSize:"20px",fontWeight:"700",color:C.text,marginBottom:"6px" }}>Why Investors Choose Innovest</div>
              <div style={{ fontSize:"11px",color:C.muted,maxWidth:"560px",margin:"0 auto",lineHeight:"1.6" }}>
                Built on verified data, regulatory compliance and AI-powered intelligence — the only platform purpose-built for the Indian startup investment ecosystem.
              </div>
            </div>

            {/* Trust KPIs — real data only */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"16px" }}>
              {[
                {label:"Total Ideas on Platform", value:stats?.total??0,                    color:C.accent, icon:"💡", sub:"Submitted by verified founders"},
                {label:"Your Watchlist",          value:stats?.likedByMe??0,                color:C.red,    icon:"❤️", sub:"Ideas you are tracking"},
                {label:"Unique Sectors",          value:stats?.ideasByDomain?.length??0,    color:C.green,  icon:"🏷️", sub:"Domains represented"},
              ].map((k,i)=>(
                <div key={i} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"18px" }}>
                  <div style={{ fontSize:"18px",marginBottom:"8px" }}>{k.icon}</div>
                  <div style={{ fontSize:"24px",fontWeight:"700",color:k.color,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1 }}>{k.value}</div>
                  <div style={{ fontSize:"11px",fontWeight:"600",color:C.text,marginTop:"4px" }}>{k.label}</div>
                  <div style={{ fontSize:"10px",color:C.muted,marginTop:"2px" }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* 2-col */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px" }}>

              {/* Security — only real features built into the platform */}
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px" }}>
                <SectionHeader title="Platform Security Features" sub="What is actually built into Innovest"/>
                <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                  {[
                    {icon:"🔐",title:"Multi-Factor Authentication",  desc:"Every account is protected with OTP-based MFA via Twilio before login is granted."},
                    {icon:"🔑",title:"JWT-Based Session Security",   desc:"All API routes are protected with signed JWT tokens. Sessions expire automatically."},
                    {icon:"🛡️",title:"Password Hashing (bcrypt)",   desc:"Passwords are never stored in plain text — bcryptjs hashes with salt rounds."},
                    {icon:"📁",title:"Document Upload Verification", desc:"Identity proof uploads are required at registration and reviewed by admin before approval."},
                    {icon:"✅",title:"Admin Approval Workflow",      desc:"No user can access the platform until an admin manually approves their account."},
                    {icon:"📵",title:"No-Ghosting Enforcement",      desc:"Feedback triggers are built into the platform — investors must respond to pitches."},
                  ].map((t,i)=>(
                    <div key={i} style={{ display:"flex",gap:"10px",padding:"10px",background:C.surface2,borderRadius:"6px",border:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:"16px",flexShrink:0 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize:"11px",fontWeight:"700",color:C.text,marginBottom:"2px" }}>{t.title}</div>
                        <div style={{ fontSize:"10px",color:C.muted,lineHeight:"1.5" }}>{t.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
                {/* AI */}
                <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px" }}>
                  <SectionHeader title="AI-Powered Due Diligence" sub="Objective, data-driven analysis — no human bias"/>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px" }}>
                    {[
                      {icon:"🤖",label:"40+ Metrics Scored"},
                      {icon:"📊",label:"Real-Time Sentiment"},
                      {icon:"🎯",label:"Sector Benchmarking"},
                      {icon:"🔍",label:"Competitor Mapping"},
                      {icon:"💡",label:"Risk Flag Detection"},
                      {icon:"📈",label:"5-Year Forecasting"},
                    ].map((f,i)=>(
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:"7px",padding:"7px 10px",background:C.surface2,borderRadius:"5px",border:`1px solid ${C.border}` }}>
                        <span style={{ fontSize:"13px" }}>{f.icon}</span>
                        <span style={{ fontSize:"10px",fontWeight:"600",color:C.muted }}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anti-ghosting */}
                <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px" }}>
                  <SectionHeader title="No-Ghosting Guarantee" sub="Mandatory feedback after every pitch interaction"/>
                  <div style={{ display:"flex",flexDirection:"column",gap:"7px" }}>
                    {[
                      {icon:"📋",label:"Investors must submit structured feedback"},
                      {icon:"🔔",label:"Platform sends automated follow-up reminders"},
                      {icon:"📬",label:"Founders are notified of every status change"},
                      {icon:"🚫",label:"Silent rejections are not permitted"},
                    ].map((f,i)=>(
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",background:C.surface2,borderRadius:"5px",border:`1px solid ${C.border}` }}>
                        <span style={{ fontSize:"13px" }}>{f.icon}</span>
                        <span style={{ fontSize:"10px",color:C.muted }}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stage breakdown from real data */}
                <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px" }}>
                  <SectionHeader title="Stage Breakdown" sub="Real distribution of ideas on platform"/>
                  {stageData.length===0
                    ? <p style={{ fontSize:"11px",color:C.muted }}>No stage data available.</p>
                    : stageData.map((s,i)=>(
                      <div key={i} style={{ marginBottom:"10px" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
                          <span style={{ fontSize:"11px",color:C.text,fontWeight:"600" }}>{s.stage}</span>
                          <span style={{ fontSize:"11px",fontFamily:"'IBM Plex Mono',monospace",color:STAGE_COLORS[s.stage]||C.muted }}>{s.count}</span>
                        </div>
                        <div style={{ height:"4px",background:C.surface2,borderRadius:"2px" }}>
                          <div style={{ width:`${(s.count/(stats?.total||1))*100}%`,height:"100%",background:STAGE_COLORS[s.stage]||C.accent,borderRadius:"2px",transition:"width .8s ease" }}/>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Process */}
            <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px" }}>
              <SectionHeader title="How Innovest Works" sub="From registration to funded in 4 structured steps"/>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0" }}>
                {[
                  {n:"01",title:"Register & Get Approved",  desc:"Sign up with your details and upload identity proof. An admin reviews and approves your account before you get access."},
                  {n:"02",title:"Submit Your Pitch",        desc:"Founders submit their idea with problem, solution, market, and revenue details. Stored securely on the platform."},
                  {n:"03",title:"AI Analysis Runs",         desc:"Our Python ML model analyses the idea and generates a success probability score with investment reasoning."},
                  {n:"04",title:"Investor Feedback",        desc:"Investors browse, like, and must provide structured feedback. Founders are notified of every response."},
                ].map((s,i)=>(
                  <div key={i} style={{ padding:"14px 18px",borderRight:i<3?`1px solid ${C.border}`:"none" }}>
                    <div style={{ fontSize:"24px",fontWeight:"800",color:C.dim,fontFamily:"'IBM Plex Mono',monospace",marginBottom:"8px" }}>{s.n}</div>
                    <div style={{ fontSize:"11px",fontWeight:"700",color:C.text,marginBottom:"4px" }}>{s.title}</div>
                    <div style={{ fontSize:"10px",color:C.muted,lineHeight:"1.6" }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════ MODAL ════ */}
      {selectedIdea && (
        <Modal title={`💡 ${selectedIdea.title}`} onClose={()=>{ setSelectedIdea(null); setIdeaAnalysis(null); }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"12px",background:C.surface2,borderRadius:"7px",padding:"12px" }}>
            <MetaRow label="Domain"    value={selectedIdea.domain}/>
            <MetaRow label="Stage"     value={selectedIdea.stage}/>
            <MetaRow label="Innovator" value={selectedIdea.innovatorId?.name}/>
            <MetaRow label="Email"     value={selectedIdea.innovatorId?.email}/>
          </div>
          <div style={{ background:C.surface2,borderRadius:"7px",padding:"12px",marginBottom:"12px" }}>
            <MetaRow label="Problem"  value={selectedIdea.problem}/>
            <MetaRow label="Solution" value={selectedIdea.solution}/>
            <MetaRow label="Market"   value={selectedIdea.market}/>
            <MetaRow label="Revenue"  value={selectedIdea.revenue}/>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"7px",marginBottom:"14px" }}>
            <button onClick={e=>handleLike(selectedIdea._id,e)} disabled={likeLoading[selectedIdea._id]} style={{
              padding:"7px 16px",borderRadius:"5px",border:`1px solid ${selectedIdea.likedByMe?"rgba(248,81,73,.4)":C.border}`,
              background:selectedIdea.likedByMe?"rgba(248,81,73,.1)":"transparent",
              color:selectedIdea.likedByMe?C.red:C.muted,cursor:"pointer",fontSize:"11px",fontWeight:"700",fontFamily:"'IBM Plex Sans',sans-serif",
            }}>
              {likeLoading[selectedIdea._id]?"...":selectedIdea.likedByMe?"❤️ Liked":"🤍 Add to Watchlist"}
            </button>
            <span style={{ fontSize:"10px",color:C.muted }}>{selectedIdea.likeCount||0} investor{(selectedIdea.likeCount||0)!==1?"s":""} watching</span>
          </div>

          <div style={{ height:"1px",background:C.border,margin:"0 0 14px" }}/>
          <div style={{ fontSize:"12px",fontWeight:"700",color:C.text,marginBottom:"12px" }}>🤖 AI Investment Analysis</div>

          {analysisLoading ? (
            <div style={{ textAlign:"center",padding:"40px" }}>
              <div style={{ width:"24px",height:"24px",border:`2px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto" }}/>
              <p style={{ color:C.muted,marginTop:"10px",fontSize:"11px" }}>Running AI prediction engine...</p>
            </div>
          ) : ideaAnalysis ? (()=>{
            const score     = ideaAnalysis.success_probability_percent;
            const rawScore  = ideaAnalysis.raw_model_score;
            const penalty   = Math.max(0, rawScore - score);
            const {pros,cons} = getReasons(ideaAnalysis.explanation_sorted_by_impact);
            const strategic = STRATEGIC_ADVICE[ideaAnalysis.strategic_assessment] || STRATEGIC_ADVICE["Moderate Growth Potential"];
            const scoreColor = score>=70?C.green:score>=40?C.orange:C.red;

            /* SHAP data — normalize to relative scale so bars are always visible */
            const rawShapEntries = Object.entries(ideaAnalysis.explanation_sorted_by_impact||{})
              .map(([k,v])=>({
                name:  FEATURE_INFO[k]?.name || k,
                raw:   v,
                abs:   Math.abs(v),
                positive: v >= 0,
              }))
              .sort((a,b)=> b.abs - a.abs)
              .slice(0,8);

            /* Find max absolute value to normalize all bars to 0–100% width */
            const maxAbs = Math.max(...rawShapEntries.map(d=>d.abs), 0.0001);
            const shapData = rawShapEntries.map(d=>({
              ...d,
              barWidth: Math.round((d.abs / maxAbs) * 100),   // 0–100 for CSS width
              label:    d.raw >= 0 ? `+${(d.abs*100).toFixed(2)}` : `−${(d.abs*100).toFixed(2)}`,
            }));

            /* Valuation forecast bar chart */
            const forecastData = [
              { year:"Now",    val:0 },
              { year:"+2 Yr",  val: parseFloat((ideaAnalysis.market_forecast?.valuation_in_2_years*83.5*1e6/1e7).toFixed(1)) },
              { year:"+5 Yr",  val: parseFloat((ideaAnalysis.market_forecast?.valuation_in_5_years*83.5*1e6/1e7).toFixed(1)) },
            ];

            /* Score breakdown for radar-style bar */
            const scoreBreakdown = [
              { label:"Initial Score",     val:rawScore,  color:C.accent,   note:"Computed from historical startup patterns" },
              { label:"Calibrated Score",  val:score,     color:scoreColor, note:`Risk-adjusted final score (${penalty.toFixed(1)}% calibration applied)` },
            ];

            return (
              <div>

                {/* ── Row 1: Score + Strategic + Model Trust ── */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"12px" }}>

                  {/* Score breakdown */}
                  <div style={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"14px" }}>
                    <div style={{ fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px" }}>Score Breakdown</div>
                    {scoreBreakdown.map((s,i)=>(
                      <div key={i} style={{ marginBottom:"10px" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"4px" }}>
                          <span style={{ fontSize:"10px",color:C.muted }}>{s.label}</span>
                          <span style={{ fontSize:"12px",fontWeight:"700",color:s.color,fontFamily:"'IBM Plex Mono',monospace" }}>{s.val}%</span>
                        </div>
                        <div style={{ height:"5px",background:C.surface,borderRadius:"3px",overflow:"hidden" }}>
                          <div style={{ width:`${s.val}%`,height:"100%",background:s.color,borderRadius:"3px",transition:"width 1s ease" }}/>
                        </div>
                        <div style={{ fontSize:"9px",color:C.dim,marginTop:"3px" }}>{s.note}</div>
                      </div>
                    ))}
                  </div>

                  {/* Strategic assessment */}
                  <div style={{ background:strategic.bg,border:`1px solid ${strategic.border}`,borderRadius:"7px",padding:"14px" }}>
                    <div style={{ fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px" }}>Strategic Assessment</div>
                    <div style={{ fontSize:"13px",fontWeight:"700",color:strategic.color,marginBottom:"6px" }}>{strategic.icon} {ideaAnalysis.strategic_assessment}</div>
                    <div style={{ fontSize:"10px",color:C.muted,lineHeight:"1.6" }}>{strategic.advice}</div>
                  </div>

                  {/* Score confidence — investor-facing only, no tech details */}
                  <div style={{ background:C.surface2,border:`1px solid rgba(88,166,255,.2)`,borderRadius:"7px",padding:"14px" }}>
                    <div style={{ fontSize:"9px",color:C.accent,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px" }}>📊 Score Confidence</div>
                    <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                      {[
                        { label:"Data Source",      val:"Real startup outcomes" },
                        { label:"Analysis Method",  val:"Multi-factor scoring" },
                        { label:"Risk Calibration", val:"Stage & domain adjusted" },
                        { label:"Factor Coverage",  val:"Funding, network, traction" },
                        { label:"Forecast Basis",   val:"Market growth patterns" },
                        { label:"Use As",           val:"Decision-support only" },
                      ].map((r,i)=>(
                        <div key={i} style={{ display:"flex",justifyContent:"space-between",fontSize:"9px",paddingBottom:"4px",borderBottom:`1px solid ${C.border}` }}>
                          <span style={{ color:C.muted }}>{r.label}</span>
                          <span style={{ color:C.text,fontWeight:"600",textAlign:"right",maxWidth:"55%" }}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Row 2: SHAP bar chart + Forecast chart ── */}
                <div style={{ display:"grid",gridTemplateColumns:"3fr 2fr",gap:"10px",marginBottom:"12px" }}>

                  {/* Factor impact — custom CSS bars (immune to tiny SHAP values) */}
                  <div style={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"14px" }}>
                    <div style={{ fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"4px" }}>Factor Impact Analysis</div>
                    <div style={{ fontSize:"9px",color:C.dim,marginBottom:"12px" }}>
                      Green = strengthens the score · Red = weakens the score · Bars show <em>relative</em> weight of each factor
                    </div>
                    {shapData.length === 0 ? (
                      <div style={{ fontSize:"11px",color:C.muted }}>No factor data available.</div>
                    ) : (
                      <div style={{ display:"flex",flexDirection:"column",gap:"7px" }}>
                        {shapData.map((d,i)=>(
                          <div key={i} style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                            {/* Label */}
                            <div style={{ width:"82px",fontSize:"10px",color:C.text,fontWeight:"600",textAlign:"right",flexShrink:0 }}>{d.name}</div>
                            {/* Bar track */}
                            <div style={{ flex:1,height:"10px",background:C.surface,borderRadius:"4px",overflow:"hidden" }}>
                              <div style={{
                                width:`${d.barWidth}%`,
                                height:"100%",
                                background: d.positive
                                  ? `linear-gradient(90deg,${C.green}99,${C.green})`
                                  : `linear-gradient(90deg,${C.red}99,${C.red})`,
                                borderRadius:"4px",
                                transition:"width .8s ease",
                                minWidth: d.barWidth > 0 ? "4px" : "0",
                              }}/>
                            </div>
                            {/* Value label */}
                            <div style={{ width:"36px",fontSize:"9px",fontWeight:"700",fontFamily:"'IBM Plex Mono',monospace",color:d.positive?C.green:C.red,flexShrink:0 }}>
                              {d.label}
                            </div>
                            {/* Direction pill */}
                            <div style={{ fontSize:"8px",padding:"1px 5px",borderRadius:"3px",background:d.positive?"rgba(63,185,80,.12)":"rgba(248,81,73,.12)",color:d.positive?C.green:C.red,flexShrink:0 }}>
                              {d.positive?"↑":"↓"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize:"8px",color:C.dim,marginTop:"10px",borderTop:`1px solid ${C.border}`,paddingTop:"8px" }}>
                      Values show relative contribution of each factor to the final score. Larger bar = stronger influence.
                    </div>
                  </div>

                  {/* Valuation forecast chart */}
                  <div style={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"14px" }}>
                    <div style={{ fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"4px" }}>Market Valuation Forecast (₹ Cr)</div>
                    <div style={{ fontSize:"9px",color:C.dim,marginBottom:"10px" }}>Projected growth trajectory based on sector benchmarks and founding year</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={forecastData} margin={{top:0,right:8,left:-16,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                        <XAxis dataKey="year" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                        <Tooltip
                          contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"5px",fontSize:"10px"}}
                          itemStyle={{color:C.text}}
                          formatter={(v)=>[`₹${v} Cr`,"Projected Valuation"]}
                        />
                        <Bar dataKey="val" radius={[3,3,0,0]} maxBarSize={40}>
                          <Cell fill={C.dim}/>
                          <Cell fill={C.accent}/>
                          <Cell fill={C.purple}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Row 3: Penalty warnings ── */}
                {ideaAnalysis.model_warnings?.length>0 && (
                  <div style={{ background:"rgba(210,153,34,.06)",border:"1px solid rgba(210,153,34,.2)",borderRadius:"7px",padding:"12px",marginBottom:"12px" }}>
                    <div style={{ fontSize:"9px",fontWeight:"700",color:C.yellow,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px" }}>
                      ⚠️ Why the score is {score}% — Penalty Reasons (from your reality-check layer)
                    </div>
                    <div style={{ display:"flex",flexDirection:"column",gap:"5px" }}>
                      {ideaAnalysis.model_warnings.map((w,i)=>(
                        <div key={i} style={{ display:"flex",gap:"8px",fontSize:"10px",color:C.muted,lineHeight:"1.5" }}>
                          <span style={{ color:C.yellow,flexShrink:0 }}>→</span>
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Row 4: Why Invest / Risk factors ── */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px" }}>
                  {pros.length>0&&(
                    <div>
                      <div style={{ fontSize:"9px",fontWeight:"700",color:C.green,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"7px" }}>✅ Positive Signals</div>
                      {pros.map((p,i)=>(
                        <div key={i} style={{ background:"rgba(63,185,80,.05)",border:"1px solid rgba(63,185,80,.12)",borderRadius:"5px",padding:"7px 10px",marginBottom:"5px" }}>
                          <div style={{ fontSize:"10px",fontWeight:"700",color:C.green }}>{p.icon} {p.name}</div>
                          <div style={{ fontSize:"9px",color:C.muted,marginTop:"2px",lineHeight:"1.5" }}>{p.pos}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {cons.length>0&&(
                    <div>
                      <div style={{ fontSize:"9px",fontWeight:"700",color:C.red,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"7px" }}>⚠️ Risk Signals</div>
                      {cons.map((c,i)=>(
                        <div key={i} style={{ background:"rgba(248,81,73,.05)",border:"1px solid rgba(248,81,73,.12)",borderRadius:"5px",padding:"7px 10px",marginBottom:"5px" }}>
                          <div style={{ fontSize:"10px",fontWeight:"700",color:C.red }}>{c.icon} {c.name}</div>
                          <div style={{ fontSize:"9px",color:C.muted,marginTop:"2px",lineHeight:"1.5" }}>{c.neg}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Disclaimer ── */}
                <div style={{ fontSize:"9px",color:C.dim,padding:"8px 12px",background:C.surface2,borderRadius:"5px",lineHeight:"1.6" }}>
                  ℹ️ <strong style={{color:C.muted}}>About this score:</strong> Innovest's scoring engine analyses each venture across multiple dimensions — funding strength, team network, traction, market fit, and domain context. The score is calibrated against historical outcomes and adjusted for current stage and sector risk. It is a decision-support signal, not a financial guarantee.
                  Initial assessment: <span style={{color:C.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{rawScore}%</span> → Risk-calibrated score: <span style={{color:scoreColor,fontFamily:"'IBM Plex Mono',monospace"}}>{score}%</span>
                </div>
              </div>
            );
          })() : (
            <div style={{ padding:"12px",background:"rgba(248,81,73,.06)",border:"1px solid rgba(248,81,73,.2)",borderRadius:"6px",color:C.red,fontSize:"11px" }}>
              ⚠️ AI service unavailable — ensure predictor is running on port 8000.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════ IDEA CARD ══ */
function IdeaCard({ idea, onView, onLike, likeLoading }) {
  const stageColor=STAGE_COLORS[idea.stage]||C.accent;
  const [hov,setHov]=useState(false);
  return (
    <div style={{ background:hov?C.surface2:C.surface, border:`1px solid ${hov?C.accent+"40":C.border}`, borderRadius:"8px", padding:"14px", transition:"all .2s" }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px" }}>
        <span style={{ fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"3px",background:`${stageColor}18`,color:stageColor,border:`1px solid ${stageColor}30`,textTransform:"uppercase",letterSpacing:"0.06em" }}>{idea.domain}</span>
        <span style={{ fontSize:"9px",color:C.muted,fontWeight:"600" }}>{idea.stage}</span>
      </div>
      <div style={{ fontSize:"13px",fontWeight:"700",color:C.text,marginBottom:"5px",lineHeight:"1.3" }}>{idea.title}</div>
      <div style={{ fontSize:"10px",color:C.muted,lineHeight:"1.6",marginBottom:"10px" }}>{idea.problem?.substring(0,110)}...</div>
      <div style={{ height:"1px",background:C.border,margin:"0 0 8px" }}/>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontSize:"10px",color:C.muted }}>👤 {idea.innovatorId?.name||"Unknown"}</span>
        <div style={{ display:"flex",alignItems:"center",gap:"5px" }}>
          <span style={{ fontSize:"10px",color:C.muted,fontFamily:"'IBM Plex Mono',monospace" }}>{idea.likeCount||0}</span>
          <button onClick={onLike} disabled={likeLoading} style={{ width:"26px",height:"26px",borderRadius:"4px",border:`1px solid ${idea.likedByMe?"rgba(248,81,73,.4)":C.border}`,background:idea.likedByMe?"rgba(248,81,73,.1)":"transparent",color:idea.likedByMe?C.red:C.dim,cursor:"pointer",fontSize:"12px",display:"flex",alignItems:"center",justifyContent:"center" }}>
            {likeLoading?"·":idea.likedByMe?"❤️":"🤍"}
          </button>
        </div>
      </div>
      <button onClick={onView} style={{ marginTop:"8px",width:"100%",padding:"7px",borderRadius:"5px",border:`1px solid ${hov?C.accent+"40":C.border}`,background:hov?"rgba(88,166,255,.05)":"transparent",color:hov?C.accent:C.muted,cursor:"pointer",fontSize:"10px",fontWeight:"600",transition:"all .2s",fontFamily:"'IBM Plex Sans',sans-serif" }}>
        🤖 Analyse with AI
      </button>
    </div>
  );
}

/* ══════════════════════════════ MINI CARD ══ */
function MiniCard({ idea, onView, onLike, likeLoading }) {
  const sc=STAGE_COLORS[idea.stage]||C.accent;
  return (
    <div style={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"10px",display:"flex",flexDirection:"column",gap:"5px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontSize:"9px",fontWeight:"700",color:sc,textTransform:"uppercase" }}>{idea.domain}</span>
        <span style={{ fontSize:"9px",color:C.muted }}>{idea.stage}</span>
      </div>
      <div style={{ fontSize:"11px",fontWeight:"700",color:C.text,lineHeight:"1.3" }}>{idea.title}</div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"3px" }}>
        <button onClick={onView} style={{ fontSize:"9px",fontWeight:"600",color:C.accent,background:"transparent",border:`1px solid rgba(88,166,255,.3)`,padding:"3px 8px",borderRadius:"3px",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif" }}>Analyse →</button>
        <button onClick={onLike} disabled={likeLoading} style={{ width:"22px",height:"22px",borderRadius:"3px",border:`1px solid ${idea.likedByMe?"rgba(248,81,73,.4)":C.border}`,background:idea.likedByMe?"rgba(248,81,73,.1)":"transparent",color:idea.likedByMe?C.red:C.dim,cursor:"pointer",fontSize:"11px",display:"flex",alignItems:"center",justifyContent:"center" }}>
          {likeLoading?"·":idea.likedByMe?"❤️":"🤍"}
        </button>
      </div>
    </div>
  );
}

const Btn = {
  icon: { width:"26px",height:"26px",borderRadius:"4px",border:`1px solid ${C.border}`,background:C.surface2,color:C.muted,cursor:"pointer",fontSize:"11px",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif" },
};