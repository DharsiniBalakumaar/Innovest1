import axios from "axios";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend, CartesianGrid,
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
    @keyframes slideIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
    * { box-sizing:border-box; margin:0; padding:0; }
    ::-webkit-scrollbar { width:4px; height:4px; }
    ::-webkit-scrollbar-track { background:#0d1117; }
    ::-webkit-scrollbar-thumb { background:#21262d; border-radius:2px; }
    input::placeholder { color:#484f58; }
    textarea::placeholder { color:#484f58; }
    textarea { resize: none; }
  `;
  document.head.appendChild(style);
}

/* ── Palette ── */
const C = {
  bg:       "#0d1117",
  surface:  "#161b22",
  surface2: "#1c2128",
  card:     "#0d1117",
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
  warn:     "#d29922",
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
  age_first_funding_year: { name:"Speed to Fund", icon:"⚡", pos:"Quick funding shows early traction.",              neg:"Slow first funding — early conviction lacking." },
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

/* ── Tiny Helpers for Messages ── */
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const initials = (name = "?") => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

/* ══════════════════════
   MESSAGES COMPONENTS
══════════════════════ */

function Avatar({ name, size = 40 }) {
  const colors = ["#58a6ff", "#3fb950", "#bc8cff", "#f0883e", "#d29922"];
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width:`${size}px`, height:`${size}px`, borderRadius:"50%", background: color, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:`${Math.floor(size * 0.36)}px`, fontWeight:"700", flexShrink:0,
    }}>
      {initials(name)}
    </div>
  );
}

function MessageBubble({ msg, mine }) {
  const isSystem = msg.messageType === "system";
  if (isSystem) return (
    <div style={{ textAlign:"center", padding:"6px 20px" }}>
      <span style={{ fontSize:"11px", color:C.muted, background:C.surface2, padding:"4px 12px", borderRadius:"20px" }}>
        {msg.content}
      </span>
    </div>
  );
  return (
    <div style={{ display:"flex", justifyContent: mine ? "flex-end" : "flex-start", animation:"slideIn .2s ease-out" }}>
      <div style={{
        maxWidth:"70%", padding:"10px 14px", borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
        background: mine ? "rgba(88,166,255,.15)" : C.surface2,
        border: `1px solid ${mine ? "rgba(88,166,255,.3)" : C.border}`,
        color: C.text, fontSize:"13px", lineHeight:"1.5",
      }}>
        {msg.content}
        <div style={{ fontSize:"9px", opacity:0.65, marginTop:"4px", textAlign: mine ? "right" : "left" }}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
          {mine && <span style={{ marginLeft:"4px", color: C.accent }}>{msg.isRead ? " ✓✓" : " ✓"}</span>}
        </div>
      </div>
    </div>
  );
}

function ThreadRow({ thread, active, onClick, nudge }) {
  return (
    <div onClick={onClick} style={{
      padding:"12px 16px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
      background: active ? "rgba(88,166,255,.07)" : "transparent",
      borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
      transition:"background .1s",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <Avatar name={thread.otherUser.name} size={36} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight: thread.unreadCount > 0 ? "700" : "600", fontSize:"13px", color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {thread.otherUser.name}
            </span>
            <span style={{ fontSize:"10px", color:C.muted, flexShrink:0, marginLeft:"6px" }}>
              {timeAgo(thread.lastAt)}
            </span>
          </div>
          <div style={{ fontSize:"11px", color:C.accent, opacity:0.8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:"2px" }}>
            💡 {thread.ideaTitle}
          </div>
          <div style={{ fontSize:"11px", color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:"2px" }}>
            {thread.lastMessage}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px", flexShrink:0 }}>
          {thread.unreadCount > 0 && (
            <span style={{ background:C.accent, color:"#fff", borderRadius:"50%", width:"18px", height:"18px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"700" }}>
              {thread.unreadCount}
            </span>
          )}
          {nudge && <span title={`No reply for ${nudge.hoursSince}h`} style={{ fontSize:"13px" }}>⏰</span>}
        </div>
      </div>
    </div>
  );
}

function MessagesView({ token, initialChat, onChatLoad }) {
  const API = "http://localhost:5000/api/messages";
  const tok = () => ({ Authorization: `Bearer ${token}` });

  let userId = "";
  try { userId = JSON.parse(atob(token.split(".")[1])).id; } catch (e) { /* fallback */ }

  const [threads,     setThreads]     = useState([]);
  const [activeConv,  setActiveConv]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [nudges,      setNudges]      = useState([]);
  const [text,        setText]        = useState("");
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const loadThreads = useCallback(async () => {
    try {
      const [tr, nr] = await Promise.all([
        axios.get(`${API}/threads`, { headers: tok() }),
        axios.get(`${API}/nudge-check`, { headers: tok() }),
      ]);
      setThreads(tr.data);
      setNudges(nr.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadConv = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const r = await axios.get(`${API}/conversation/${convId}`, { headers: tok() });
      setMessages(r.data);
      await axios.put(`${API}/mark-read/${convId}`, {}, { headers: tok() });
      setThreads(prev => prev.map(t => t.conversationId === convId ? { ...t, unreadCount: 0 } : t));
    } catch (e) { console.error(e); }
  }, []);

  const openThread = async (t) => {
    setActiveConv(t.conversationId);
    await loadConv(t.conversationId);
  };

  const send = async () => {
    if (!text.trim() || !activeConv) return;
    setSending(true);
    try {
      const thread = threads.find(t => t.conversationId === activeConv);
      const r = await axios.post(`${API}/send`, {
        ideaId:     thread.ideaId,
        receiverId: thread.otherUser._id,
        content:    text.trim(),
      }, { headers: tok() });
      setMessages(prev => [...prev, r.data]);
      setText("");
      await loadThreads();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  // Auto-start chat from modal button
  useEffect(() => {
    const startInitialChat = async () => {
      if (initialChat) {
        try {
          const r = await axios.post(`${API}/send`, {
            ideaId: initialChat.ideaId,
            receiverId: initialChat.receiverId,
            content: `Hi ${initialChat.receiverName}, I am interested in your idea "${initialChat.ideaTitle}".`
          }, { headers: tok() });
          
          await loadThreads();
          setActiveConv(r.data.conversationId);
          await loadConv(r.data.conversationId);
          if (onChatLoad) onChatLoad();
        } catch (e) { console.error(e); }
      }
    };
    startInitialChat();
  }, [initialChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadThreads();
    pollRef.current = setInterval(async () => {
      await loadThreads();
      if (activeConv) await loadConv(activeConv);
    }, 15000);
    return () => clearInterval(pollRef.current);
  }, [loadThreads, loadConv, activeConv]);

  const activeThread = threads.find(t => t.conversationId === activeConv);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", color: C.muted }}>
      <div style={{ width:"28px", height:"28px", border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"calc(100vh - 160px)", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "8px", overflow:"hidden", animation: "fadeUp .4s ease-out" }}>
      
      {/* ══ SIDEBAR ══ */}
      <div style={{ width:"300px", flexShrink:0, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", background: C.surface2 }}>
        <div style={{ padding:"16px", borderBottom:`1px solid ${C.border}` }}>
          <h2 style={{ fontSize:"15px", fontWeight:"700", color: C.text, margin:0 }}>Conversations</h2>
          <p style={{ fontSize:"11px", color: C.muted, margin:"4px 0 0" }}>{threads.length} active connection{threads.length !== 1 ? "s" : ""}</p>
        </div>

        {nudges.length > 0 && (
          <div style={{ padding:"10px 12px", background:"rgba(210,153,34,0.08)", borderBottom:`1px solid rgba(210,153,34,0.2)` }}>
            <div style={{ fontSize:"11px", fontWeight:"700", color: C.warn, marginBottom:"6px" }}>⏰ Awaiting reply ({nudges.length})</div>
            {nudges.slice(0, 3).map((n, i) => (
              <div key={i} style={{ fontSize:"11px", color: C.muted, marginBottom:"4px", display:"flex", justifyContent:"space-between" }}>
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"160px" }}>{n.ideaTitle}</span>
                <span style={{ color: n.hoursSince > 72 ? C.danger : C.warn, fontWeight:"600", flexShrink:0 }}>{n.hoursSince}h</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex:1, overflowY:"auto" }}>
          {threads.length === 0 ? (
            <div style={{ padding:"32px 16px", textAlign:"center", color: C.muted }}>
              <div style={{ fontSize:"28px", marginBottom:"8px" }}>💬</div>
              <div style={{ fontSize:"12px", lineHeight:"1.6" }}>No conversations yet.</div>
            </div>
          ) : (
            threads.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt)).map((t) => (
              <ThreadRow key={t.conversationId} thread={t} active={activeConv === t.conversationId} onClick={() => openThread(t)} nudge={nudges.find(n => n.conversationId === t.conversationId)} />
            ))
          )}
        </div>
      </div>

      {/* ══ CHAT PANEL ══ */}
      {activeThread ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background: C.bg }}>
          {/* Header */}
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, background: C.surface, display:"flex", alignItems:"center", gap:"12px", flexShrink:0 }}>
            <Avatar name={activeThread.otherUser.name} size={36} />
            <div>
              <div style={{ fontWeight:"700", fontSize:"14px", color: C.text }}>{activeThread.otherUser.name}</div>
              <div style={{ fontSize:"11px", color: C.accent, opacity:0.8 }}>
                💡 Re: {activeThread.ideaTitle} {activeThread.ideaDomain && `· ${activeThread.ideaDomain}`}
              </div>
            </div>
            {nudges.find(n => n.conversationId === activeConv) && (
              <div style={{ marginLeft:"auto", background:"rgba(210,153,34,0.12)", border:"1px solid rgba(210,153,34,0.3)", borderRadius:"8px", padding:"6px 12px", fontSize:"11px", color: C.warn, fontWeight:"600" }}>
                ⚠️ No reply for {nudges.find(n => n.conversationId === activeConv)?.hoursSince}h
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:"10px" }}>
            {messages.map((msg) => {
              const mine = msg.sender._id?.toString() === userId || msg.sender === userId;
              return <MessageBubble key={msg._id} msg={msg} mine={mine} />;
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, background: C.surface, display:"flex", gap:"10px", flexShrink:0 }}>
            <textarea
              value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message… (Enter to send)" rows={2}
              style={{ flex:1, padding:"10px 14px", borderRadius:"6px", border:`1px solid ${C.border}`, background: C.card, color: C.text, fontSize:"13px", resize:"none", outline:"none", fontFamily:"inherit" }}
            />
            <button onClick={send} disabled={!text.trim() || sending}
              style={{ padding:"10px 20px", borderRadius:"6px", border:"none", background: text.trim() ? C.accent : C.border, color: text.trim() ? "#fff" : C.muted, fontWeight:"700", fontSize:"13px", cursor: text.trim() ? "pointer" : "default", alignSelf:"flex-end", transition:"all .15s" }}
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color: C.muted, flexDirection:"column", gap:"8px", background: C.bg }}>
          <div style={{ fontSize:"40px", opacity:0.5 }}>💬</div>
          <p style={{ fontSize:"15px", fontWeight:"600", color: C.text }}>Select a conversation</p>
          <p style={{ fontSize:"12px", maxWidth:"300px", textAlign:"center", lineHeight:"1.6" }}>
            Choose a thread from the sidebar to view your messages with innovators.
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════
   UNREAD BADGE (for nav tab)
══════════════════════ */
function UnreadBadge({ token }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    const check = async () => {
      try {
        const r = await axios.get("http://localhost:5000/api/messages/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCount(r.data.count);
      } catch {}
    };
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, [token]);

  if (count === 0) return null;
  return (
    <span style={{ background: C.red, color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "9px", fontWeight: "700", display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: "5px" }}>
      {count}
    </span>
  );
}

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

const Btn = { icon: { width:"26px",height:"26px",borderRadius:"4px",border:`1px solid ${C.border}`,background:C.surface2,color:C.muted,cursor:"pointer",fontSize:"11px",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif" } };

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

/* ══════════════════════════════ IDEA CARDS ══ */
function IdeaCard({ idea, onView, onLike, likeLoading }) {
  const stageColor=STAGE_COLORS[idea.stage]||C.accent;
  const [hov,setHov]=useState(false);
  return (
    <div style={{ background:hov?C.surface2:C.surface, border:`1px solid ${hov?C.accent+"40":C.border}`, borderRadius:"8px", padding:"14px", transition:"all .2s" }} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
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

/* ══════════════════════════════════════════════
   MAIN DASHBOARD
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

  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("tab") || "dashboard";
  const setActiveView = (tab) => setSearchParams({ tab });

  // For jumping to a specific chat when clicking "Message Innovator" in the Modal
  const [preselectedChat, setPreselectedChat] = useState(null);

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
      if(search.trim())        p.search=search.trim();
      const r = await axios.get("http://localhost:5000/api/investor/ideas",{headers,params:p});
      setIdeas(r.data);
    } catch(e){ console.error(e); }
  },[filterDomain,search]);

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

  const tabs = [
    { id: "dashboard", label: "Dashboard",    icon: "📊" },
    { id: "browse",    label: "Browse Ideas", icon: "🔍" },
    { id: "liked",     label: "Watchlist",    icon: "❤️" },
    { id: "messages",  label: "Messages",     icon: "💬", badge: true },
    { id: "trust",     label: "Why Innovest", icon: "🛡️" },
  ];

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

      <div style={{ borderBottom:`1px solid ${C.border}`, background:C.surface, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:"1600px", margin:"0 auto", padding:"0 24px", display:"flex", gap:"2px" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveView(tab.id)}
              style={{ padding: "11px 14px", background: "transparent", border: "none", borderBottom: activeView === tab.id ? `2px solid ${C.accent}` : "2px solid transparent", color: activeView === tab.id ? C.accent : C.muted, cursor: "pointer", fontSize: "11px", fontWeight: activeView === tab.id ? "700" : "500", fontFamily: "'IBM Plex Sans',sans-serif", display: "inline-flex", alignItems: "center", gap: "5px", transition: "color .15s", marginBottom: "-1px" }}
            >
              <span>{tab.icon}</span>{tab.label}{tab.badge && <UnreadBadge token={token} />}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:"1600px", margin:"0 auto", padding:"18px 24px" }}>

        {/* ════ DASHBOARD ════ */}
        {activeView==="dashboard" && (
          <div style={{ animation:"fadeUp .5s ease-out" }}>
            <div style={{ marginBottom:"16px", padding:"14px 18px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px" }}>
              <div>
                <div style={{ fontSize:"14px",fontWeight:"700",color:C.text }}>Startup Intelligence Dashboard</div>
                <div style={{ fontSize:"10px",color:C.muted,marginTop:"2px" }}>Live data from your platform · {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
              </div>
              <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                <TrustBadge icon="🔒" label="Secure Connection"/>
                <TrustBadge icon="🤖" label="AI-Powered Analysis"/>
              </div>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"16px" }}>
              <KpiTile label="Total Ideas"    value={stats?.total??0}              sub="Submitted on platform"   color={C.accent}  icon="💡"/>
              <KpiTile label="Your Watchlist" value={stats?.likedByMe??0}          sub="Ideas you have liked"    color={C.red}     icon="❤️"/>
              <KpiTile label="Domains"        value={stats?.ideasByDomain?.length??0} sub="Unique sectors"       color={C.green}   icon="🏷️"/>
              <KpiTile label="Stages Tracked" value={stats?.ideasByStage?.length??0}  sub="MVP · Prototype · Live" color={C.purple} icon="📊"/>
            </div>

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
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"14px" }}>
                <SectionHeader title="Platform Summary" sub="Live counts from your database"/>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <tbody>
                    {[
                      {label:"Total Ideas",          value:stats?.total??0,                color:C.text},
                      {label:"Your Watchlist",       value:stats?.likedByMe??0,            color:C.purple},
                      {label:"Unique Domains",       value:stats?.ideasByDomain?.length??0,color:C.text},
                      {label:"Stage Breakdown",      value:stats?.ideasByStage?.length??0, color:C.text},
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

        {/* ════ MESSAGES ════ */}
        {activeView==="messages" && (
          <MessagesView 
            token={token} 
            initialChat={preselectedChat} 
            onChatLoad={() => setPreselectedChat(null)} 
          />
        )}

        {/* ════ WHY INNOVEST ════ */}
        {activeView==="trust" && (
          <div style={{ animation:"fadeUp .4s ease-out" }}>
            <div style={{ marginBottom:"16px",padding:"22px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",textAlign:"center" }}>
              <div style={{ fontSize:"10px",fontWeight:"700",color:C.accent,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"8px" }}>Trusted by India's Smartest Investors</div>
              <div style={{ fontSize:"20px",fontWeight:"700",color:C.text,marginBottom:"6px" }}>Why Investors Choose Innovest</div>
              <div style={{ fontSize:"11px",color:C.muted,maxWidth:"560px",margin:"0 auto",lineHeight:"1.6" }}>
                Built on verified data, regulatory compliance and AI-powered intelligence.
              </div>
            </div>
            
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px" }}>
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px" }}>
                <SectionHeader title="Platform Security Features" sub="What is actually built into Innovest"/>
                <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
                  {[
                    {icon:"🔐",title:"Multi-Factor Authentication",  desc:"Every account is protected with OTP-based MFA."},
                    {icon:"🔑",title:"JWT-Based Session Security",   desc:"All API routes are protected with signed JWT tokens."},
                    {icon:"🛡️",title:"Password Hashing (bcrypt)",   desc:"Passwords are never stored in plain text."},
                    {icon:"📁",title:"Document Upload Verification", desc:"Identity proof uploads are required at registration."},
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
                <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px" }}>
                  <SectionHeader title="AI-Powered Due Diligence" sub="Objective, data-driven analysis — no human bias"/>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px" }}>
                    {[
                      {icon:"🤖",label:"40+ Metrics Scored"},
                      {icon:"📊",label:"Real-Time Sentiment"},
                      {icon:"🎯",label:"Sector Benchmarking"},
                      {icon:"🔍",label:"Competitor Mapping"},
                    ].map((f,i)=>(
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:"7px",padding:"7px 10px",background:C.surface2,borderRadius:"5px",border:`1px solid ${C.border}` }}>
                        <span style={{ fontSize:"13px" }}>{f.icon}</span>
                        <span style={{ fontSize:"10px",fontWeight:"600",color:C.muted }}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"16px" }}>
                  <SectionHeader title="No-Ghosting Guarantee" sub="Mandatory feedback after every pitch interaction"/>
                  <div style={{ display:"flex",flexDirection:"column",gap:"7px" }}>
                    {[
                      {icon:"📋",label:"Investors must submit structured feedback"},
                      {icon:"🔔",label:"Platform sends automated follow-up reminders"},
                    ].map((f,i)=>(
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",background:C.surface2,borderRadius:"5px",border:`1px solid ${C.border}` }}>
                        <span style={{ fontSize:"13px" }}>{f.icon}</span>
                        <span style={{ fontSize:"10px",color:C.muted }}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════ IDEA MODAL ════ */}
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
            
            <button
              onClick={() => { 
                setPreselectedChat({
                  ideaId: selectedIdea._id,
                  receiverId: selectedIdea.innovatorId._id,
                  ideaTitle: selectedIdea.title,
                  receiverName: selectedIdea.innovatorId.name
                });
                setSelectedIdea(null); 
                setIdeaAnalysis(null); 
                setActiveView("messages"); 
              }}
              style={{ marginLeft:"auto",padding:"7px 14px",borderRadius:"5px",border:`1px solid rgba(88,166,255,.3)`,background:"rgba(88,166,255,.06)",color:C.accent,cursor:"pointer",fontSize:"11px",fontWeight:"600",fontFamily:"'IBM Plex Sans',sans-serif" }}
            >
              💬 Message Innovator
            </button>
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

            const forecastData = [
              { year:"Now",   val:0 },
              { year:"+2 Yr", val:parseFloat((ideaAnalysis.market_forecast?.valuation_in_2_years*83.5*1e6/1e7).toFixed(1)) },
              { year:"+5 Yr", val:parseFloat((ideaAnalysis.market_forecast?.valuation_in_5_years*83.5*1e6/1e7).toFixed(1)) },
            ];

            const scoreBreakdown = [
              { label:"Initial Score",    val:rawScore, color:C.accent,   note:"Computed from historical startup patterns" },
              { label:"Calibrated Score", val:score,    color:scoreColor, note:`Risk-adjusted final score (${penalty.toFixed(1)}% calibration applied)` },
            ];

            return (
              <div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"12px" }}>
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
                  <div style={{ background:strategic.bg,border:`1px solid ${strategic.border}`,borderRadius:"7px",padding:"14px" }}>
                    <div style={{ fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px" }}>Strategic Assessment</div>
                    <div style={{ fontSize:"13px",fontWeight:"700",color:strategic.color,marginBottom:"6px" }}>{strategic.icon} {ideaAnalysis.strategic_assessment}</div>
                    <div style={{ fontSize:"10px",color:C.muted,lineHeight:"1.6" }}>{strategic.advice}</div>
                  </div>
                  <div style={{ background:C.surface2,border:`1px solid rgba(88,166,255,.2)`,borderRadius:"7px",padding:"14px" }}>
                    <div style={{ fontSize:"9px",color:C.accent,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px" }}>📊 Score Confidence</div>
                    <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                      {[
                        {label:"Data Source",      val:"Real startup outcomes"},
                        {label:"Analysis Method",  val:"Multi-factor scoring"},
                        {label:"Risk Calibration", val:"Stage & domain adjusted"},
                        {label:"Forecast Basis",   val:"Market growth patterns"},
                        {label:"Use As",           val:"Decision-support only"},
                      ].map((r,i)=>(
                        <div key={i} style={{ display:"flex",justifyContent:"space-between",fontSize:"9px",paddingBottom:"4px",borderBottom:`1px solid ${C.border}` }}>
                          <span style={{ color:C.muted }}>{r.label}</span>
                          <span style={{ color:C.text,fontWeight:"600",textAlign:"right",maxWidth:"55%" }}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display:"grid",gridTemplateColumns:"3fr 2fr",gap:"10px",marginBottom:"12px" }}>
                  <div style={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"14px" }}>
                    <div style={{ fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"4px" }}>Factor Impact Analysis</div>
                    <div style={{ fontSize:"9px",color:C.dim,marginBottom:"12px" }}>Green = strengthens · Red = weakens · Bars show relative weight</div>
                    {shapData.length===0 ? (
                      <div style={{ fontSize:"11px",color:C.muted }}>No factor data available.</div>
                    ) : (
                      <div style={{ display:"flex",flexDirection:"column",gap:"7px" }}>
                        {shapData.map((d,i)=>(
                          <div key={i} style={{ display:"flex",alignItems:"center",gap:"8px" }}>
                            <div style={{ width:"82px",fontSize:"10px",color:C.text,fontWeight:"600",textAlign:"right",flexShrink:0 }}>{d.name}</div>
                            <div style={{ flex:1,height:"10px",background:C.surface,borderRadius:"4px",overflow:"hidden" }}>
                              <div style={{ width:`${d.barWidth}%`,height:"100%",background:d.positive?`linear-gradient(90deg,${C.green}99,${C.green})`:`linear-gradient(90deg,${C.red}99,${C.red})`,borderRadius:"4px",transition:"width .8s ease",minWidth:d.barWidth>0?"4px":"0" }}/>
                            </div>
                            <div style={{ width:"36px",fontSize:"9px",fontWeight:"700",fontFamily:"'IBM Plex Mono',monospace",color:d.positive?C.green:C.red,flexShrink:0 }}>{d.label}</div>
                            <div style={{ fontSize:"8px",padding:"1px 5px",borderRadius:"3px",background:d.positive?"rgba(63,185,80,.12)":"rgba(248,81,73,.12)",color:d.positive?C.green:C.red,flexShrink:0 }}>{d.positive?"↑":"↓"}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize:"8px",color:C.dim,marginTop:"10px",borderTop:`1px solid ${C.border}`,paddingTop:"8px" }}>Values show relative contribution. Larger bar = stronger influence.</div>
                  </div>
                  <div style={{ background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"7px",padding:"14px" }}>
                    <div style={{ fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"4px" }}>Market Valuation Forecast (₹ Cr)</div>
                    <div style={{ fontSize:"9px",color:C.dim,marginBottom:"10px" }}>Projected trajectory based on sector benchmarks</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={forecastData} margin={{top:0,right:8,left:-16,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                        <XAxis dataKey="year" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"5px",fontSize:"10px"}} itemStyle={{color:C.text}} formatter={v=>[`₹${v} Cr`,"Projected Valuation"]}/>
                        <Bar dataKey="val" radius={[3,3,0,0]} maxBarSize={40}>
                          <Cell fill={C.dim}/><Cell fill={C.accent}/><Cell fill={C.purple}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {ideaAnalysis.model_warnings?.length>0 && (
                  <div style={{ background:"rgba(210,153,34,.06)",border:"1px solid rgba(210,153,34,.2)",borderRadius:"7px",padding:"12px",marginBottom:"12px" }}>
                    <div style={{ fontSize:"9px",fontWeight:"700",color:C.yellow,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px" }}>⚠️ Penalty Reasons</div>
                    <div style={{ display:"flex",flexDirection:"column",gap:"5px" }}>
                      {ideaAnalysis.model_warnings.map((w,i)=>(
                        <div key={i} style={{ display:"flex",gap:"8px",fontSize:"10px",color:C.muted,lineHeight:"1.5" }}>
                          <span style={{ color:C.yellow,flexShrink:0 }}>→</span><span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                <div style={{ fontSize:"9px",color:C.dim,padding:"8px 12px",background:C.surface2,borderRadius:"5px",lineHeight:"1.6" }}>
                  ℹ️ <strong style={{color:C.muted}}>About this score:</strong> Innovest's scoring engine analyses each venture across multiple dimensions. The score is calibrated against historical outcomes and adjusted for current stage and sector risk. It is a decision-support signal, not a financial guarantee.
                  Initial: <span style={{color:C.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{rawScore}%</span> → Calibrated: <span style={{color:scoreColor,fontFamily:"'IBM Plex Mono',monospace"}}>{score}%</span>
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