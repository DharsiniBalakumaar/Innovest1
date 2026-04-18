import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ── inject fonts + keyframes ── */
if (typeof document !== "undefined") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    * { box-sizing:border-box; margin:0; padding:0; }
    ::-webkit-scrollbar { width:4px; height:4px; }
    ::-webkit-scrollbar-track { background:#0d1117; }
    ::-webkit-scrollbar-thumb { background:#21262d; border-radius:2px; }
  `;
  document.head.appendChild(style);
}

/* ── Palette (matches InvestorDashboard exactly) ── */
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

/* ── HOW IT CONNECTS TO INVESTORS ── */
const INVESTOR_FLOW = [
  {
    step: "01",
    icon: "📝",
    title: "You Submit Your Idea",
    desc: "Fill in your problem, solution, market size, revenue model, and stage. Your idea is stored securely and goes into the review queue.",
    color: C.accent,
  },
  {
    step: "02",
    icon: "🤖",
    title: "AI Scores Your Idea",
    desc: "Our scoring engine analyses your submission across funding strength, market fit, traction, network, and domain context — generating a success probability score.",
    color: C.purple,
  },
  {
    step: "03",
    icon: "✅",
    title: "Admin Reviews & Approves",
    desc: "An Innovest admin reviews your idea for quality. Once approved, it becomes visible to all verified investors on the platform.",
    color: C.green,
  },
  {
    step: "04",
    icon: "👀",
    title: "Investors Browse & Analyse",
    desc: "Investors can view your AI score, factor breakdown, market forecast, and strategic assessment before deciding to engage.",
    color: C.yellow,
  },
  {
    step: "05",
    icon: "❤️",
    title: "Investors Watchlist You",
    desc: "If an investor likes your idea, they add it to their watchlist. You can see how many investors are actively tracking your idea.",
    color: C.orange,
  },
  {
    step: "06",
    icon: "💬",
    title: "Structured Feedback — Guaranteed",
    desc: "No ghosting. Investors who engage must submit structured feedback. You are notified of every response, interest signal, and status change.",
    color: C.green,
  },
];

const TRUST_POINTS = [
  { icon:"🔐", title:"Your Idea is Protected",         desc:"Ideas are stored securely. Investors can view your pitch summary but cannot download or copy it." },
  { icon:"✅", title:"Only Verified Investors See You", desc:"Every investor on the platform has gone through admin approval and identity verification before access." },
  { icon:"🤖", title:"Objective AI Scoring",           desc:"Your idea is scored by an algorithm — not by a human with biases. Every submission gets the same fair analysis." },
  { icon:"📬", title:"No Silent Rejections",           desc:"Platform rules require investors to provide feedback. You will always know where you stand." },
  { icon:"📊", title:"Real Market Forecasting",        desc:"Your idea gets a 2-year and 5-year valuation projection based on sector growth patterns and founding data." },
  { icon:"🚀", title:"Stage-Aware Scoring",            desc:"Idea-stage vs MVP vs Live — the AI adjusts expectations per stage. You won't be penalised for being early." },
];

/* ── SUBCOMPONENTS ── */

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <div style={{ fontSize:"11px",fontWeight:"700",color:C.text,letterSpacing:"0.03em" }}>{title}</div>
      {sub && <div style={{ fontSize:"9px",color:C.muted,marginTop:"2px" }}>{sub}</div>}
    </div>
  );
}

function KpiTile({ label, value, sub, color=C.accent, icon }) {
  return (
    <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px 18px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"8px" }}>
        <span style={{ fontSize:"10px",fontWeight:"700",color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em" }}>{label}</span>
        {icon && <span style={{ fontSize:"15px" }}>{icon}</span>}
      </div>
      <div style={{ fontSize:"26px",fontWeight:"700",color,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1,marginBottom:"6px" }}>{value}</div>
      <div style={{ fontSize:"10px",color:C.muted }}>{sub}</div>
    </div>
  );
}

function TrustBadge({ icon, label }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"5px",padding:"4px 10px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"5px" }}>
      <span style={{ fontSize:"11px" }}>{icon}</span>
      <span style={{ fontSize:"9px",fontWeight:"600",color:C.muted,letterSpacing:"0.04em" }}>{label}</span>
    </div>
  );
}

/* ── MAIN COMPONENT ── */
export default function InnovatorDashboard() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "http://localhost:5000/api/innovator/dashboard-stats",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStats(res.data);
      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return (
    <div style={{ minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"12px",fontFamily:"'IBM Plex Sans',sans-serif" }}>
      <div style={{ width:"24px",height:"24px",border:`2px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin .8s linear infinite" }}/>
      <p style={{ color:C.muted,fontSize:"12px" }}>Loading your dashboard...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'IBM Plex Sans',sans-serif" }}>
      <p style={{ color:C.red,fontSize:"13px" }}>{error}</p>
    </div>
  );

  const { total, stageCounts, ideasByDomain, ideaStatusData } = stats;
  const stageData  = Object.entries(stageCounts||{}).map(([stage,count])=>({ stage, count }));
  const domainData = (ideasByDomain||[]).map(d=>({ domain: d.domain, count: d.count }));

  const TABS = [
    { k:"overview", l:"Overview"              },
    { k:"connect",  l:"How Investors See You" },
    { k:"trust",    l:"Why Investors Trust This" },
  ];

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'IBM Plex Sans',sans-serif", color:C.text }}>

      {/* ── Sub-tab bar (sits below your existing app navbar) ── */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 24px" }}>
        <div style={{ display:"flex", alignItems:"center", maxWidth:"1400px", margin:"0 auto", height:"40px" }}>
          {TABS.map(({k,l})=>(
            <button key={k} onClick={()=>setActiveTab(k)} style={{
              padding:"0 16px", height:"40px", border:"none",
              borderBottom: activeTab===k?`2px solid ${C.accent}`:"2px solid transparent",
              background:"transparent", color:activeTab===k?C.accent:C.muted,
              fontWeight:activeTab===k?"600":"400", fontSize:"12px", cursor:"pointer",
              transition:"all .15s", fontFamily:"'IBM Plex Sans',sans-serif",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:"1400px",margin:"0 auto",padding:"18px 24px" }}>

        {/* ══════════ TAB: OVERVIEW ══════════ */}
        {activeTab === "overview" && (
          <div style={{ animation:"fadeUp .3s ease" }}>

            {/* Report header */}
            <div style={{ marginBottom:"16px",padding:"14px 18px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"10px" }}>
              <div>
                <div style={{ fontSize:"14px",fontWeight:"700",color:C.text }}>Innovator Intelligence Dashboard</div>
                <div style={{ fontSize:"10px",color:C.muted,marginTop:"2px" }}>
                  Your ideas · live data · {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                </div>
              </div>
              <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                <TrustBadge icon="🔒" label="Secure"/>
                <TrustBadge icon="🤖" label="AI-Scored"/>
                <TrustBadge icon="✅" label="Admin Verified"/>
              </div>
            </div>

            {/* KPI tiles */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px" }}>
              <KpiTile label="Total Ideas"    value={total??0}                        sub="Submitted by you"        color={C.accent}  icon="💡"/>
              <KpiTile label="Idea Stage"     value={stageCounts?.Idea??0}            sub="Early concepts"          color={C.yellow}  icon="🌱"/>
              <KpiTile label="MVP / Live"     value={(stageCounts?.MVP??0)+(stageCounts?.Live??0)} sub="Active products" color={C.green} icon="🚀"/>
              <KpiTile label="Prototype"      value={stageCounts?.Prototype??0}       sub="In development"          color={C.purple}  icon="🔧"/>
            </div>

            {/* Charts row */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px" }}>

              {/* Stage pie */}
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px" }}>
                <SectionHeader title="Ideas by Stage" sub="Distribution of your submissions"/>
                {ideaStatusData?.length===0 ? (
                  <div style={{ color:C.muted,fontSize:"11px",padding:"20px 0" }}>No ideas submitted yet.</div>
                ) : (
                  <div style={{ display:"flex",alignItems:"center",gap:"16px" }}>
                    <PieChart width={160} height={160}>
                      <Pie data={ideaStatusData} dataKey="value" nameKey="name" outerRadius={70} innerRadius={38} paddingAngle={3}>
                        {ideaStatusData.map((_,i)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"6px",fontSize:"10px" }} itemStyle={{ color:C.text }}/>
                    </PieChart>
                    <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                      {ideaStatusData.map((item,i)=>(
                        <div key={i} style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                          <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:DOMAIN_COLORS[i%DOMAIN_COLORS.length],flexShrink:0 }}/>
                          <span style={{ fontSize:"10px",color:C.muted }}>{item.name}</span>
                          <span style={{ fontSize:"10px",fontWeight:"700",color:C.text,fontFamily:"'IBM Plex Mono',monospace",marginLeft:"auto" }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Domain bar */}
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px" }}>
                <SectionHeader title="Ideas by Domain" sub="Which sectors you're building in"/>
                {domainData.length===0 ? (
                  <div style={{ color:C.muted,fontSize:"11px",padding:"20px 0" }}>No domain data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={domainData} margin={{top:4,right:4,left:-24,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                      <XAxis dataKey="domain" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"6px",fontSize:"10px"}} itemStyle={{color:C.text}}/>
                      <Bar dataKey="count" radius={[3,3,0,0]} maxBarSize={28}>
                        {domainData.map((_,i)=><Cell key={i} fill={DOMAIN_COLORS[i%DOMAIN_COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Stage progress bars */}
            <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px",marginBottom:"16px" }}>
              <SectionHeader title="Stage Breakdown" sub="Progress across all your ideas"/>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px" }}>
                {stageData.map((s,i)=>(
                  <div key={i}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
                      <span style={{ fontSize:"10px",color:C.muted }}>{s.stage}</span>
                      <span style={{ fontSize:"11px",fontWeight:"700",color:STAGE_COLORS[s.stage]||C.accent,fontFamily:"'IBM Plex Mono',monospace" }}>{s.count}</span>
                    </div>
                    <div style={{ height:"5px",background:C.surface2,borderRadius:"3px" }}>
                      <div style={{ width:`${total?Math.round((s.count/total)*100):0}%`,height:"100%",background:STAGE_COLORS[s.stage]||C.accent,borderRadius:"3px",transition:"width .8s ease" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px" }}>
              {[
                { icon:"🚀", label:"Post New Idea",      sub:"Submit for AI scoring & investor review", color:C.accent,  path:"/innovator/post-idea"  },
                { icon:"📂", label:"My Ideas",           sub:"View, edit and track all submissions",    color:C.green,   path:"/innovator/my-ideas"   },
                { icon:"💬", label:"Investor Feedback",  sub:"See interest signals and messages",       color:C.purple,  path:"/innovator/feedback"   },
              ].map((a,i)=>(
                <button key={i} onClick={()=>navigate(a.path)} style={{
                  background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px",
                  cursor:"pointer",textAlign:"left",transition:"border-color .15s,transform .15s",fontFamily:"'IBM Plex Sans',sans-serif",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=a.color;e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)";}}
                >
                  <div style={{ fontSize:"20px",marginBottom:"8px" }}>{a.icon}</div>
                  <div style={{ fontSize:"11px",fontWeight:"700",color:C.text,marginBottom:"3px" }}>{a.label}</div>
                  <div style={{ fontSize:"10px",color:C.muted }}>{a.sub}</div>
                  <div style={{ marginTop:"10px",fontSize:"10px",color:a.color,fontWeight:"600" }}>Open →</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ TAB: HOW INVESTORS SEE YOU ══════════ */}
        {activeTab === "connect" && (
          <div style={{ animation:"fadeUp .3s ease" }}>

            <div style={{ marginBottom:"16px",padding:"14px 18px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px" }}>
              <div style={{ fontSize:"14px",fontWeight:"700",color:C.text,marginBottom:"4px" }}>🔗 How Your Idea Reaches Investors</div>
              <div style={{ fontSize:"10px",color:C.muted }}>End-to-end journey from submission to investor engagement — every step that happens on Innovest</div>
            </div>

            {/* Flow steps */}
            <div style={{ display:"flex",flexDirection:"column",gap:"10px",marginBottom:"16px" }}>
              {INVESTOR_FLOW.map((f,i)=>(
                <div key={i} style={{ display:"flex",gap:"16px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px",position:"relative",overflow:"hidden" }}>
                  {/* Accent line */}
                  <div style={{ position:"absolute",left:0,top:0,bottom:0,width:"3px",background:f.color,borderRadius:"3px 0 0 3px" }}/>
                  {/* Step number */}
                  <div style={{ width:"36px",height:"36px",borderRadius:"8px",background:`${f.color}18`,border:`1px solid ${f.color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontSize:"11px",fontWeight:"800",color:f.color,fontFamily:"'IBM Plex Mono',monospace" }}>{f.step}</span>
                  </div>
                  {/* Content */}
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"7px",marginBottom:"5px" }}>
                      <span style={{ fontSize:"15px" }}>{f.icon}</span>
                      <span style={{ fontSize:"12px",fontWeight:"700",color:C.text }}>{f.title}</span>
                    </div>
                    <div style={{ fontSize:"11px",color:C.muted,lineHeight:"1.6" }}>{f.desc}</div>
                  </div>
                  {/* Connector arrow */}
                  {i < INVESTOR_FLOW.length-1 && (
                    <div style={{ position:"absolute",bottom:"-14px",left:"30px",fontSize:"12px",color:C.dim,zIndex:1 }}>↓</div>
                  )}
                </div>
              ))}
            </div>

            {/* What investors actually see */}
            <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px",marginBottom:"16px" }}>
              <SectionHeader title="What Investors Actually See About Your Idea" sub="This is the exact information displayed to every investor on the platform"/>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px" }}>
                {[
                  { icon:"📊", label:"AI Success Score",        desc:"A calibrated probability score based on your stage, funding, network, and domain." },
                  { icon:"📈", label:"Factor Impact Chart",     desc:"Which parts of your idea are strong and which carry risk — shown visually." },
                  { icon:"🔮", label:"Market Valuation Forecast",desc:"Projected 2-year and 5-year valuation based on sector growth benchmarks." },
                  { icon:"🏷️", label:"Strategic Assessment",    desc:"A plain-English label: e.g. 'Strong Growth Momentum' or 'Needs Validation'." },
                  { icon:"✅", label:"Positive Signals",        desc:"What works in your favour — network, milestones, funding rounds, digital product." },
                  { icon:"⚠️", label:"Risk Signals",            desc:"Honest flags like low funding, early stage, or domain-specific challenges." },
                ].map((item,i)=>(
                  <div key={i} style={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"12px" }}>
                    <div style={{ fontSize:"16px",marginBottom:"6px" }}>{item.icon}</div>
                    <div style={{ fontSize:"11px",fontWeight:"700",color:C.text,marginBottom:"4px" }}>{item.label}</div>
                    <div style={{ fontSize:"10px",color:C.muted,lineHeight:"1.5" }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips to improve score */}
            <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px" }}>
              <SectionHeader title="How to Improve Your Score & Attract More Investors" sub="Actionable steps based on how the AI scoring engine works"/>
              <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                {[
                  { icon:"💰", tip:"Increase funding",        detail:"Even bootstrapped funding above ₹83L removes the 'critically underfunded' penalty from your score." },
                  { icon:"🏆", tip:"Add milestones",          detail:"3+ milestones unlocks a scoring bonus. Milestones prove execution — investors prioritise this." },
                  { icon:"🤝", tip:"Grow your network",       detail:"5+ relationships removes the weak network flag. Connect with advisors, mentors, and early users." },
                  { icon:"⚡", tip:"Move to Prototype or MVP", detail:"Idea-stage ideas carry extra uncertainty. Even a basic prototype removes the Idea-stage penalty." },
                  { icon:"🌐", tip:"Make it a web product",   detail:"Digital products score a small bonus for scalability. If applicable, mention your web presence." },
                ].map((t,i)=>(
                  <div key={i} style={{ display:"flex",gap:"12px",padding:"10px 12px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"6px",alignItems:"flex-start" }}>
                    <span style={{ fontSize:"15px",flexShrink:0 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontSize:"11px",fontWeight:"700",color:C.text,marginBottom:"2px" }}>{t.tip}</div>
                      <div style={{ fontSize:"10px",color:C.muted,lineHeight:"1.5" }}>{t.detail}</div>
                    </div>
                    <div style={{ marginLeft:"auto",fontSize:"10px",color:C.green,fontWeight:"700",flexShrink:0 }}>↑ Score</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ TAB: WHY INVESTORS TRUST THIS ══════════ */}
        {activeTab === "trust" && (
          <div style={{ animation:"fadeUp .3s ease" }}>

            <div style={{ marginBottom:"16px",padding:"14px 18px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px" }}>
              <div style={{ fontSize:"14px",fontWeight:"700",color:C.text,marginBottom:"4px" }}>🛡️ Why Investors Trust Innovest — And Why That Helps You</div>
              <div style={{ fontSize:"10px",color:C.muted }}>When investors trust the platform, they engage more seriously with ideas. Here's what makes them confident.</div>
            </div>

            {/* Trust points */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px" }}>
              {TRUST_POINTS.map((t,i)=>(
                <div key={i} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px",display:"flex",gap:"12px" }}>
                  <span style={{ fontSize:"20px",flexShrink:0 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize:"11px",fontWeight:"700",color:C.text,marginBottom:"4px" }}>{t.title}</div>
                    <div style={{ fontSize:"10px",color:C.muted,lineHeight:"1.6" }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Platform security */}
            <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px",marginBottom:"16px" }}>
              <SectionHeader title="Platform Security — What Is Actually Built" sub="These are real features in the Innovest codebase, not marketing claims"/>
              <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                {[
                  { icon:"🔑", title:"JWT Session Security",        desc:"All API routes require a valid signed token. Sessions expire automatically — no one can stay logged in indefinitely." },
                  { icon:"🔐", title:"OTP Multi-Factor Auth",       desc:"Every login requires OTP verification via SMS. Unverified accounts cannot access the platform." },
                  { icon:"🛡️", title:"bcrypt Password Hashing",    desc:"Passwords are never stored in readable form. Even the database administrator cannot see your password." },
                  { icon:"📁", title:"Document Upload & Verification", desc:"Identity proof is required at registration. Admin manually approves before any access is granted." },
                  { icon:"✅", title:"Admin Approval Workflow",     desc:"No user — innovator or investor — gets access without passing admin review. No self-signup bypass." },
                ].map((s,i)=>(
                  <div key={i} style={{ display:"flex",gap:"12px",padding:"10px 12px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"6px" }}>
                    <span style={{ fontSize:"16px",flexShrink:0 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize:"11px",fontWeight:"700",color:C.text,marginBottom:"2px" }}>{s.title}</div>
                      <div style={{ fontSize:"10px",color:C.muted,lineHeight:"1.5" }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What this means for you as an innovator */}
            <div style={{ background:`rgba(63,185,80,.05)`,border:`1px solid rgba(63,185,80,.2)`,borderRadius:"8px",padding:"16px" }}>
              <div style={{ fontSize:"11px",fontWeight:"700",color:C.green,marginBottom:"10px" }}>✅ What This Means For You As An Innovator</div>
              <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                {[
                  "Investors who reach your idea have passed identity verification — they are serious, real people.",
                  "Your idea will never be seen by random visitors — only approved, logged-in investors.",
                  "You will always receive feedback when an investor engages — no silent ignoring.",
                  "Your idea's AI score is computed the same way for everyone — no human favouritism.",
                  "Your data is protected by real backend security — not just terms and conditions.",
                ].map((line,i)=>(
                  <div key={i} style={{ display:"flex",gap:"8px",fontSize:"11px",color:C.muted,lineHeight:"1.5" }}>
                    <span style={{ color:C.green,flexShrink:0 }}>→</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}