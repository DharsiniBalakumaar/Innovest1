// frontend/src/components/AlertBlocker.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const API           = "http://localhost:5000/api/messages";
const INVESTOR_API  = "http://localhost:5000/api/investor";
const INNOVATOR_API = "http://localhost:5000/api/innovator";
const tok = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

/* ── audio ding ── */
function playDing() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5,   ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    [{ freq: 880, delay: 0 }, { freq: 1100, delay: 0.06 }].forEach(({ freq, delay }) => {
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

function decodeUserRole() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const decoded = JSON.parse(atob(token.split(".")[1]));
    const raw = decoded.role ?? decoded.userType ?? decoded.user_role ?? null;
    return raw ? String(raw).toLowerCase() : null;
  } catch { return null; }
}

const initials = (name = "?") =>
  name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

/* ── palette — matching your dark theme ── */
const C = {
  bg:      "#0d1117",
  surface: "#161b22",
  surf2:   "#1c2128",
  surf3:   "#21262d",
  border:  "rgba(48,54,61,0.9)",
  accent:  "#58a6ff",
  green:   "#3fb950",
  red:     "#f85149",
  yellow:  "#d29922",
  purple:  "#bc8cff",
  orange:  "#f0883e",
  text:    "#e6edf3",
  muted:   "#7d8590",
  dim:     "#484f58",
};

/* ── MetaRow for idea details ── */
const MetaRow = ({ label, value }) => (
  <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
    <span style={{
      color: C.muted, fontWeight: "700", fontSize: "9px",
      textTransform: "uppercase", letterSpacing: "0.08em",
      minWidth: "70px", paddingTop: "2px", flexShrink: 0,
    }}>{label}</span>
    <span style={{ color: C.text, fontSize: "12px", lineHeight: "1.6" }}>{value || "N/A"}</span>
  </div>
);

export default function AlertBlocker() {
  const navigate = useNavigate();
  const location = useLocation();

  const [alerts,    setAlerts]    = useState([]);
  const [current,   setCurrent]   = useState(0);
  const [sending,   setSending]   = useState(false);
  const [replyTxt,  setReplyTxt]  = useState("");
  const [dismissed, setDismissed] = useState(new Set());
  const [fullIdea,  setFullIdea]  = useState(null);
  const [loadingIdea, setLoadingIdea] = useState(false);

  const overlayRef   = useRef(null);
  const pollRef      = useRef(null);
  const prevIds      = useRef(new Set());

  const userRole   = decodeUserRole();
  const isInvestor = userRole === "investor";
  const isActive   = alerts.length > 0;
  const thread     = alerts[current];

  /* ── fetch full idea whenever thread changes ── */
  useEffect(() => {
    if (!thread?.ideaId) { setFullIdea(null); return; }
    let alive = true;
    setLoadingIdea(true);
    setFullIdea(null);

    (async () => {
      try {
        const endpoint = isInvestor
          ? `${INVESTOR_API}/ideas`
          : `${INNOVATOR_API}/my-ideas`;
        const r = await axios.get(endpoint, { headers: tok() });
        const list = Array.isArray(r.data) ? r.data : [];
        const idea = list.find(
          i => i._id === thread.ideaId || i._id?.toString() === thread.ideaId?.toString()
        );
        if (alive && idea) setFullIdea(idea);
      } catch (err) {
        console.error("Idea fetch error:", err.message);
      } finally {
        if (alive) setLoadingIdea(false);
      }
    })();

    return () => { alive = false; };
  }, [thread?.ideaId, isInvestor]);

  /* ── block body scroll & clicks outside ── */
  useEffect(() => {
    if (isActive) document.body.classList.add("alert-blocking");
    else          document.body.classList.remove("alert-blocking");
    return () => document.body.classList.remove("alert-blocking");
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const block = e => {
      if (overlayRef.current?.contains(e.target)) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    };
    document.addEventListener("click",      block, true);
    document.addEventListener("mousedown",  block, true);
    document.addEventListener("touchstart", block, { capture: true, passive: false });
    return () => {
      document.removeEventListener("click",     block, true);
      document.removeEventListener("mousedown", block, true);
      document.removeEventListener("touchstart",block, true);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isActive]);

  /* ── poll for unread threads ── */
  const poll = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t || window.location.pathname.includes("/messages")) return;
    try {
      const r = await axios.get(`${API}/threads`, { headers: tok() });
      const active = r.data.filter(
        th => th.unreadCount > 0 && !th.isBlocked && !dismissed.has(th.conversationId)
      );
      let ding = false;
      active.forEach(th => { if (!prevIds.current.has(th.conversationId)) ding = true; });
      if (ding) playDing();
      prevIds.current = new Set(active.map(th => th.conversationId));
      setAlerts(active);
    } catch {}
  }, [dismissed]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 10000);
    return () => clearInterval(pollRef.current);
  }, [poll]);

  /* ── dismiss a thread ── */
  const dismiss = useCallback((convId) => {
    setDismissed(prev => new Set([...prev, convId]));
    setAlerts(prev => {
      const next = prev.filter(a => a.conversationId !== convId);
      setCurrent(0);
      return next;
    });
    setReplyTxt("");
    setFullIdea(null);
  }, []);

  /* ── send reply ── */
  const sendReply = async () => {
    if (!replyTxt.trim() || !thread) return;
    setSending(true);
    const { conversationId, ideaId, otherUser } = thread;
    const content = replyTxt.trim();
    dismiss(conversationId);
    navigate("/messages");
    try {
      await axios.post(`${API}/send`, {
        conversationId,
        ideaId,
        receiverId: otherUser._id,
        content,
      }, { headers: tok() });
    } catch (e) {
      console.error("sendReply error:", e.response?.status, e.message);
    } finally {
      setSending(false);
    }
  };

  /* ── not interested ── */
  const notInterested = async () => {
    if (!thread) return;
    setSending(true);
    try {
      await axios.post(
        `${API}/not-interested/${thread.conversationId}`,
        {},
        { headers: tok() }
      );
      dismiss(thread.conversationId);
    } catch (e) {
      console.error("notInterested error:", e.message);
    } finally {
      setSending(false);
    }
  };

  if (!isActive || !thread) return null;

  const avatarLetter = initials(thread.otherUser?.name);
  const roleLabel    = thread.otherUser?.role
    ? thread.otherUser.role.toUpperCase()
    : "USER";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        @keyframes modalIn {
          from { opacity:0; transform:translateY(20px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-7px)}
          40%{transform:translateX(7px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
        body.alert-blocking { overflow:hidden !important; }
        body.alert-blocking > *:not([data-alert-root]) { pointer-events:none !important; }
        [data-alert-root], [data-alert-root] * { pointer-events:all !important; }
        .ab-reply-box {
          width:100%; padding:11px 14px; border-radius:8px;
          border:1px solid ${C.border}; background:${C.bg};
          color:${C.text}; font-size:13px; resize:none; outline:none;
          font-family:'IBM Plex Sans',sans-serif; box-sizing:border-box;
          transition:border-color .15s;
        }
        .ab-reply-box:focus { border-color:${C.accent}; }
        .ab-reply-box::placeholder { color:${C.dim}; }
        .ab-btn-ghost {
          flex:1; padding:11px 16px; border-radius:8px;
          border:1px solid rgba(248,81,73,0.35);
          background:rgba(248,81,73,0.08);
          color:${C.red}; font-size:13px; font-weight:600;
          cursor:pointer; transition:all .15s; font-family:'IBM Plex Sans',sans-serif;
        }
        .ab-btn-ghost:hover:not(:disabled) { background:rgba(248,81,73,0.15); }
        .ab-btn-ghost:disabled { opacity:0.5; cursor:not-allowed; }
        .ab-btn-primary {
          flex:1.6; padding:11px 16px; border-radius:8px; border:none;
          font-size:13px; font-weight:700; cursor:pointer;
          font-family:'IBM Plex Sans',sans-serif; transition:all .15s;
        }
        .ab-dot { width:8px; height:8px; border-radius:50%; cursor:pointer; transition:all .2s; }
      `}</style>

      {/* Backdrop */}
      <div
        data-alert-root
        ref={overlayRef}
        style={{
          position: "fixed", inset: 0, zIndex: 2147483647,
          background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px", fontFamily: "'IBM Plex Sans', sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: "14px",
            width: "100%", maxWidth: "560px",
            maxHeight: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            animation: "modalIn .32s cubic-bezier(.34,1.4,.64,1) forwards",
            overflow: "hidden",
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >

          {/* ── HEADER ── */}
          <div style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
            background: C.surf2,
            display: "flex", alignItems: "center", gap: "12px",
            flexShrink: 0,
          }}>
            {/* Avatar */}
            <div style={{
              width: "40px", height: "40px", borderRadius: "50%",
              background: C.accent, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "15px", fontWeight: "700", flexShrink: 0,
            }}>
              {avatarLetter}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>
                  Message from {thread.otherUser?.name || "User"}
                </span>
                <span style={{
                  fontSize: "9px", fontWeight: "700",
                  background: "rgba(88,166,255,0.15)", color: C.accent,
                  padding: "2px 7px", borderRadius: "4px", letterSpacing: "0.05em",
                }}>
                  {roleLabel}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Re: {thread.ideaTitle}
              </div>
            </div>

            {/* Multi-alert badge */}
            {alerts.length > 1 && (
              <div style={{
                background: C.red, color: "#fff",
                borderRadius: "10px", padding: "2px 7px",
                fontSize: "10px", fontWeight: "700", flexShrink: 0,
              }}>
                {alerts.length} alerts
              </div>
            )}
          </div>

          {/* ── BODY (scrollable) ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>

            {/* Unread message count + preview */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{
                fontSize: "10px", fontWeight: "700", color: C.muted,
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px",
              }}>
                {thread.unreadCount} New Message{thread.unreadCount !== 1 ? "s" : ""}
              </div>
              <div style={{
                background: C.surf2,
                borderLeft: `3px solid ${C.accent}`,
                borderRadius: "0 8px 8px 0",
                padding: "12px 14px",
                color: C.text, fontSize: "13px", lineHeight: "1.65",
                fontStyle: "italic",
              }}>
                "{thread.lastMessage}"
              </div>
            </div>

            {/* ── Idea Overview ── */}
            {loadingIdea ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  border: `2px solid ${C.border}`, borderTopColor: C.accent,
                  animation: "spin .7s linear infinite", margin: "0 auto",
                }}/>
                <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
              </div>
            ) : fullIdea ? (
              <div>
                {/* Section label */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  marginBottom: "10px",
                }}>
                  <span style={{ fontSize: "13px" }}>💡</span>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: C.text }}>
                    Idea Overview
                  </span>
                </div>

                {/* Grid: Domain / Stage / Innovator / Email */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  gap: "2px 16px",
                  background: C.surf2, borderRadius: "8px",
                  padding: "12px 14px", marginBottom: "10px",
                  border: `1px solid ${C.border}`,
                }}>
                  <MetaRow label="Domain"    value={fullIdea.domain} />
                  <MetaRow label="Stage"     value={fullIdea.stage} />
                  <MetaRow label="Innovator" value={fullIdea.innovatorId?.name || thread.otherUser?.name} />
                  <MetaRow label="Email"     value={fullIdea.innovatorId?.email || thread.otherUser?.email} />
                </div>

                {/* Problem / Solution / Market / Revenue */}
                <div style={{
                  background: C.surf2, borderRadius: "8px",
                  padding: "12px 14px", marginBottom: "6px",
                  border: `1px solid ${C.border}`,
                }}>
                  {fullIdea.problem  && <MetaRow label="Problem"  value={fullIdea.problem} />}
                  {fullIdea.solution && <MetaRow label="Solution" value={fullIdea.solution} />}
                  {fullIdea.market   && <MetaRow label="Market"   value={fullIdea.market} />}
                  {fullIdea.revenue  && <MetaRow label="Revenue"  value={fullIdea.revenue} />}
                </div>
              </div>
            ) : null}

          </div>

          {/* ── FOOTER ── */}
          <div style={{
            padding: "14px 20px",
            borderTop: `1px solid ${C.border}`,
            background: C.surface,
            flexShrink: 0,
          }}>
            <textarea
              className="ab-reply-box"
              rows={3}
              value={replyTxt}
              placeholder={`Reply to ${thread.otherUser?.name?.split(" ")[0] || "them"}… (Enter to send)`}
              onChange={e => setReplyTxt(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
              }}
              style={{ marginBottom: "10px" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="ab-btn-ghost"
                onClick={notInterested}
                disabled={sending}
              >
                {sending ? "Processing…" : "🚫 Not Interested"}
              </button>

              <button
                className="ab-btn-primary"
                onClick={sendReply}
                disabled={!replyTxt.trim() || sending}
                style={{
                  background: replyTxt.trim() ? C.accent : C.surf3,
                  color: replyTxt.trim() ? "#fff" : C.dim,
                  cursor: replyTxt.trim() && !sending ? "pointer" : "default",
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? "Sending…" : "Send Reply →"}
              </button>
            </div>
          </div>

          {/* ── multi-alert dots ── */}
          {alerts.length > 1 && (
            <div style={{
              padding: "8px 20px",
              display: "flex", justifyContent: "center", gap: "6px",
              background: C.surf2, borderTop: `1px solid ${C.border}`,
            }}>
              {alerts.map((_, i) => (
                <div
                  key={i}
                  className="ab-dot"
                  onClick={() => { setCurrent(i); setReplyTxt(""); }}
                  style={{
                    width: i === current ? "20px" : "8px",
                    background: i === current ? C.accent : C.border,
                  }}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}