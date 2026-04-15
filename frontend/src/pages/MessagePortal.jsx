// frontend/src/pages/MessagePortal.jsx
import axios from "axios";
import { useEffect, useRef, useState, useCallback } from "react";

const API = "http://localhost:5000/api/messages";
const tok = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

/* ── Palette to match Dashboard ── */
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

/* ── tiny helpers ── */
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const initials = (name = "?") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

/* ============================================================
   MessagePortal
============================================================ */
export default function MessagePortal() {
  const userId = JSON.parse(atob(localStorage.getItem("token").split(".")[1])).id;

  const [threads,     setThreads]     = useState([]);
  const [activeConv,  setActiveConv]  = useState(null);   // conversationId
  const [messages,    setMessages]    = useState([]);
  const [nudges,      setNudges]      = useState([]);
  const [text,        setText]        = useState("");
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  /* ── fetch inbox ── */
  const loadThreads = useCallback(async () => {
    try {
      const [tr, nr] = await Promise.all([
        axios.get(`${API}/threads`,      { headers: tok() }),
        axios.get(`${API}/nudge-check`,  { headers: tok() }),
      ]);
      setThreads(tr.data);
      setNudges(nr.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  /* ── fetch messages in active thread ── */
  const loadConv = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const r = await axios.get(`${API}/conversation/${convId}`, { headers: tok() });
      setMessages(r.data);
      // mark as read
      await axios.put(`${API}/mark-read/${convId}`, {}, { headers: tok() });
      // update unread badge in thread list
      setThreads(prev =>
        prev.map(t => t.conversationId === convId ? { ...t, unreadCount: 0 } : t)
      );
    } catch (e) { console.error(e); }
  }, []);

  /* ── open a thread ── */
  const openThread = async (t) => {
    setActiveConv(t.conversationId);
    await loadConv(t.conversationId);
  };

  /* ── send message ── */
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

  /* ── scroll to bottom on new messages ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── poll every 15 s ── */
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
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background: C.bg, color: C.muted, fontFamily:"'IBM Plex Sans', sans-serif" }}>
      <div style={{ width:"28px", height:"28px", border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display:"flex", height:"calc(100vh - 64px)", background: C.bg, fontFamily:"'IBM Plex Sans', sans-serif", overflow:"hidden" }}>

      {/* ══ SIDEBAR ══ */}
      <div style={{ width:"320px", flexShrink:0, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", background: C.surface }}>
        <div style={{ padding:"18px 16px 12px", borderBottom:`1px solid ${C.border}` }}>
          <h2 style={{ fontSize:"16px", fontWeight:"700", color: C.text, margin:0 }}>Messages</h2>
          <p style={{ fontSize:"12px", color: C.muted, margin:"4px 0 0" }}>{threads.length} conversation{threads.length !== 1 ? "s" : ""}</p>
        </div>

        {/* ── Radio silence alerts ── */}
        {nudges.length > 0 && (
          <div style={{ padding:"10px 12px", background:"rgba(210,153,34,0.08)", borderBottom:`1px solid rgba(210,153,34,0.2)` }}>
            <div style={{ fontSize:"11px", fontWeight:"700", color: C.warn, marginBottom:"6px" }}>
              ⏰ Awaiting reply ({nudges.length})
            </div>
            {nudges.slice(0, 3).map((n, i) => (
              <div key={i} style={{ fontSize:"11px", color: C.muted, marginBottom:"4px", display:"flex", justifyContent:"space-between" }}>
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"160px" }}>{n.ideaTitle}</span>
                <span style={{ color: n.hoursSince > 72 ? C.danger : C.warn, fontWeight:"600", flexShrink:0 }}>{n.hoursSince}h</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Thread list ── */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {threads.length === 0 ? (
            <div style={{ padding:"32px 16px", textAlign:"center", color: C.muted, fontSize:"13px" }}>
              <div style={{ fontSize:"32px", opacity:0.5, marginBottom:"10px" }}>💬</div>
              No conversations yet.<br/>
              <span style={{ fontSize:"11px", marginTop:"6px", display:"block" }}>Conversations start when an investor likes an idea.</span>
            </div>
          ) : (
            threads
              .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
              .map((t) => (
                <ThreadRow
                  key={t.conversationId}
                  thread={t}
                  active={activeConv === t.conversationId}
                  onClick={() => openThread(t)}
                  nudge={nudges.find(n => n.conversationId === t.conversationId)}
                />
              ))
          )}
        </div>
      </div>

      {/* ══ CHAT PANEL ══ */}
      {activeThread ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Header */}
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, background: C.surface, display:"flex", alignItems:"center", gap:"12px", flexShrink:0 }}>
            <Avatar name={activeThread.otherUser.name} />
            <div>
              <div style={{ fontWeight:"700", fontSize:"14px", color: C.text }}>{activeThread.otherUser.name}</div>
              <div style={{ fontSize:"11px", color: C.accent, opacity:0.8, marginTop:"2px" }}>
                💡 {activeThread.ideaTitle}
                {activeThread.ideaDomain && <span> · {activeThread.ideaDomain}</span>}
                {activeThread.ideaStage  && <span> · {activeThread.ideaStage}</span>}
              </div>
            </div>
            {/* Nudge warning if this thread is silent */}
            {nudges.find(n => n.conversationId === activeConv) && (
              <div style={{ marginLeft:"auto", background:"rgba(210,153,34,0.12)", border:"1px solid rgba(210,153,34,0.3)", borderRadius:"8px", padding:"6px 12px", fontSize:"11px", color: C.warn, fontWeight:"600" }}>
                ⚠️ No reply for {nudges.find(n => n.conversationId === activeConv)?.hoursSince}h — consider a follow-up
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:"10px", background: C.bg }}>
            {messages.map((msg) => {
              const mine = msg.sender._id?.toString() === userId || msg.sender === userId;
              return (
                <MessageBubble key={msg._id} msg={msg} mine={mine} />
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:"14px 20px", borderTop:`1px solid ${C.border}`, background: C.surface, display:"flex", gap:"10px", flexShrink:0 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message… (Enter to send)"
              rows={2}
              style={{
                flex:1, padding:"10px 14px", borderRadius:"6px",
                border:`1px solid ${C.border}`, background: C.card,
                color: C.text, fontSize:"13px", resize:"none", outline:"none",
                fontFamily:"inherit",
              }}
            />
            <button
              onClick={send}
              disabled={!text.trim() || sending}
              style={{
                padding:"10px 20px", borderRadius:"6px", border:"none",
                background: text.trim() ? C.accent : C.border,
                color: text.trim() ? "#fff" : C.muted, fontWeight:"700", fontSize:"13px",
                cursor: text.trim() ? "pointer" : "default",
                opacity: sending ? 0.7 : 1, transition:"all .15s",
                alignSelf:"flex-end",
              }}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color: C.muted, flexDirection:"column", gap:"8px", background: C.bg }}>
          <div style={{ fontSize:"40px", opacity: 0.5 }}>💬</div>
          <p style={{ fontSize:"15px", fontWeight:"600", color: C.text }}>Select a conversation to start messaging</p>
          <p style={{ fontSize:"12px", maxWidth:"320px", textAlign:"center", lineHeight:"1.6" }}>
            All communication stays inside Innovest — no phone numbers or emails needed.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Thread row ── */
function ThreadRow({ thread, active, onClick, nudge }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding:"12px 16px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
        background: active ? "rgba(88,166,255,0.07)" : "transparent",
        borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
        transition:"background .1s",
      }}
    >
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <Avatar name={thread.otherUser.name} size={36} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight: thread.unreadCount > 0 ? "700" : "600", fontSize:"13px", color: C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {thread.otherUser.name}
            </span>
            <span style={{ fontSize:"10px", color: C.muted, flexShrink:0, marginLeft:"6px" }}>
              {timeAgo(thread.lastAt)}
            </span>
          </div>
          <div style={{ fontSize:"11px", color: C.accent, opacity:0.8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:"2px" }}>
            💡 {thread.ideaTitle}
          </div>
          <div style={{ fontSize:"11px", color: C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:"2px" }}>
            {thread.lastMessage}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px", flexShrink:0 }}>
          {thread.unreadCount > 0 && (
            <span style={{ background: C.accent, color:"#fff", borderRadius:"50%", width:"18px", height:"18px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"700" }}>
              {thread.unreadCount}
            </span>
          )}
          {nudge && (
            <span title={`No reply for ${nudge.hoursSince}h`} style={{ fontSize:"13px" }}>⏰</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Message bubble ── */
function MessageBubble({ msg, mine }) {
  const isSystem = msg.messageType === "system";
  if (isSystem) return (
    <div style={{ textAlign:"center", padding:"6px 20px" }}>
      <span style={{ fontSize:"11px", color: C.muted, background: C.surface2, padding:"4px 12px", borderRadius:"20px" }}>
        {msg.content}
      </span>
    </div>
  );
  return (
    <div style={{ display:"flex", justifyContent: mine ? "flex-end" : "flex-start", animation:"slideIn .2s ease-out" }}>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }`}</style>
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

/* ── Avatar ── */
function Avatar({ name, size = 40 }) {
  const colors = [C.accent, C.green, C.purple, C.orange, C.yellow];
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width:`${size}px`, height:`${size}px`, borderRadius:"50%",
      background: color, color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:`${Math.floor(size * 0.36)}px`, fontWeight:"700", flexShrink:0,
    }}>
      {initials(name)}
    </div>
  );
}