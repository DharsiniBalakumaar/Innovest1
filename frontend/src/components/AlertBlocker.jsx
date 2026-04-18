// frontend/src/components/AlertBlocker.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const API           = "http://localhost:5000/api/messages";
const INVESTOR_API  = "http://localhost:5000/api/investor";
const INNOVATOR_API = "http://localhost:5000/api/innovator";
const tok = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

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

function decodeToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return {};
    const d    = JSON.parse(atob(token.split(".")[1]));
    const role = String(d.role ?? d.userType ?? d.user_role ?? "").toLowerCase();
    return { role };
  } catch { return {}; }
}

const initials = (name = "?") =>
  name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

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
  text:    "#e6edf3",
  muted:   "#7d8590",
  dim:     "#484f58",
};

const MetaRow = ({ label, value }) =>
  value ? (
    <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
      <span style={{
        color: C.muted, fontWeight: "700", fontSize: "9px",
        textTransform: "uppercase", letterSpacing: "0.08em",
        minWidth: "68px", paddingTop: "2px", flexShrink: 0,
      }}>{label}</span>
      <span style={{ color: C.text, fontSize: "12px", lineHeight: "1.6" }}>{value}</span>
    </div>
  ) : null;

export default function AlertBlocker() {
  const navigate = useNavigate();
  const location = useLocation();

  const [alerts,      setAlerts]      = useState([]);
  const [current,     setCurrent]     = useState(0);
  const [sending,     setSending]     = useState(false);
  const [replyTxt,    setReplyTxt]    = useState("");
  const [dismissed,   setDismissed]   = useState(new Set());
  const [fullIdea,    setFullIdea]    = useState(null);
  const [loadingIdea, setLoadingIdea] = useState(false);

  const overlayRef = useRef(null);
  const pollRef    = useRef(null);
  const prevIds    = useRef(new Set());

  const { role }    = decodeToken();
  const isInvestor  = role === "investor";
  const isInnovator = role === "innovator";

  const isActive = alerts.length > 0;
  const thread   = alerts[current] ?? null;

  // ─────────────────────────────────────────────────────────────
  //  Fetch idea details whenever the active thread changes.
  //
  //  ROOT CAUSE OF THE BUG:
  //  The old code used `isInvestor ? investor/ideas : innovator/my-ideas`
  //  but both roles need to SEE the idea details in the alert.
  //
  //  CORRECT LOGIC:
  //  • Innovator receives a message from an investor about THEIR OWN idea
  //    → call /api/innovator/my-ideas  (their ideas list) and match by ideaId
  //
  //  • Investor receives a message from an innovator about an idea
  //    → call /api/investor/ideas (all platform ideas) and match by ideaId
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!thread?.ideaId) { setFullIdea(null); return; }
    let alive = true;
    setLoadingIdea(true);
    setFullIdea(null);

    (async () => {
      try {
        let endpoint = "";
        if (isInnovator) {
          endpoint = `${INNOVATOR_API}/my-ideas`;
        } else if (isInvestor) {
          endpoint = `${INVESTOR_API}/ideas`;
        }

        if (!endpoint) { if (alive) setLoadingIdea(false); return; }

        const r    = await axios.get(endpoint, { headers: tok() });
        const list = Array.isArray(r.data) ? r.data : [];
        const idea = list.find(i => String(i._id) === String(thread.ideaId));

        if (alive) setFullIdea(idea ?? null);
      } catch (err) {
        console.error("AlertBlocker: idea fetch failed —", err.response?.status, err.message);
        if (alive) setFullIdea(null);
      } finally {
        if (alive) setLoadingIdea(false);
      }
    })();

    return () => { alive = false; };
  }, [thread?.ideaId, isInvestor, isInnovator]);

  // Block all background interaction while alert is visible
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
      document.removeEventListener("click",      block, true);
      document.removeEventListener("mousedown",  block, true);
      document.removeEventListener("touchstart", block, true);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    window.history.pushState(null, "", window.location.href);
    const block = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, [isActive, location]);

  // Poll for unread threads
  const poll = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t || window.location.pathname.includes("/messages")) return;
    try {
      const r      = await axios.get(`${API}/threads`, { headers: tok() });
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

  const notInterested = async () => {
    if (!thread) return;
    setSending(true);
    try {
      await axios.post(
        `${API}/not-interested/${thread.conversationId}`,
        {}, { headers: tok() }
      );
      dismiss(thread.conversationId);
    } catch (e) {
      console.error("notInterested error:", e.message);
    } finally {
      setSending(false);
    }
  };

  if (!isActive || !thread) return null;

  const senderName = thread.otherUser?.name || "User";
  const senderRole = (thread.otherUser?.role || "user").toUpperCase();
  // Avatar colour: green when innovator is receiving (from investor), blue when investor is receiving
  const avatarBg   = isInnovator ? C.green : C.accent;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes abModalIn {
          from { opacity:0; transform:translateY(16px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes abSpin { to { transform:rotate(360deg); } }
        body.alert-blocking { overflow:hidden !important; }
        body.alert-blocking > *:not([data-alertroot]) {
          pointer-events:none !important;
          user-select:none !important;
        }
        [data-alertroot], [data-alertroot] * { pointer-events:all !important; }
        .ab-textarea {
          width:100%; padding:11px 14px; border-radius:8px;
          border:1px solid ${C.border}; background:${C.bg};
          color:${C.text}; font-size:13px; resize:none; outline:none;
          font-family:'IBM Plex Sans',sans-serif; box-sizing:border-box;
          transition:border-color .15s; margin-bottom:10px;
          display:block;
        }
        .ab-textarea:focus { border-color:${C.accent}; }
        .ab-textarea::placeholder { color:${C.dim}; }
        .ab-btn-danger {
          flex:1; padding:11px 16px; border-radius:8px;
          border:1px solid rgba(248,81,73,0.35);
          background:rgba(248,81,73,0.08); color:${C.red};
          font-size:13px; font-weight:600; cursor:pointer;
          font-family:'IBM Plex Sans',sans-serif; transition:background .15s;
        }
        .ab-btn-danger:hover:not(:disabled){background:rgba(248,81,73,0.16);}
        .ab-btn-danger:disabled{opacity:0.5;cursor:not-allowed;}
        .ab-btn-send {
          flex:1.6; padding:11px 16px; border-radius:8px; border:none;
          font-size:13px; font-weight:700;
          font-family:'IBM Plex Sans',sans-serif; transition:all .15s;
        }
      `}</style>

      {/* Backdrop */}
      <div
        data-alertroot
        ref={overlayRef}
        style={{
          position:"fixed", inset:0, zIndex:2147483647,
          background:"rgba(0,0,0,0.84)", backdropFilter:"blur(7px)",
          display:"flex", alignItems:"center", justifyContent:"center",
          padding:"20px", fontFamily:"'IBM Plex Sans',sans-serif",
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Modal */}
        <div
          style={{
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:"14px", width:"100%", maxWidth:"540px",
            maxHeight:"88vh", display:"flex", flexDirection:"column",
            boxShadow:"0 32px 80px rgba(0,0,0,0.75)",
            animation:"abModalIn .3s cubic-bezier(.34,1.3,.64,1) forwards",
            overflow:"hidden",
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >

          {/* HEADER */}
          <div style={{
            padding:"15px 20px", borderBottom:`1px solid ${C.border}`,
            background:C.surf2, display:"flex", alignItems:"center",
            gap:"12px", flexShrink:0,
          }}>
            <div style={{
              width:"40px", height:"40px", borderRadius:"50%",
              background:avatarBg, color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"14px", fontWeight:"700", flexShrink:0,
            }}>
              {initials(senderName)}
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <span style={{ fontSize:"14px", fontWeight:"700", color:C.text }}>
                  Message from {senderName}
                </span>
                <span style={{
                  fontSize:"9px", fontWeight:"700",
                  background:"rgba(88,166,255,0.14)", color:C.accent,
                  padding:"2px 8px", borderRadius:"4px", letterSpacing:"0.06em",
                }}>
                  {senderRole}
                </span>
              </div>
              <div style={{
                fontSize:"11px", color:C.muted, marginTop:"3px",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              }}>
                Re: {thread.ideaTitle}
              </div>
            </div>

            {alerts.length > 1 && (
              <div style={{
                background:C.red, color:"#fff", borderRadius:"10px",
                padding:"2px 8px", fontSize:"10px", fontWeight:"700", flexShrink:0,
              }}>
                {alerts.length}
              </div>
            )}
          </div>

          {/* BODY */}
          <div style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>

            {/* Message preview */}
            <div style={{ marginBottom:"18px" }}>
              <div style={{
                fontSize:"10px", fontWeight:"700", color:C.muted,
                textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px",
              }}>
                {thread.unreadCount} New Message{thread.unreadCount !== 1 ? "s" : ""}
              </div>
              <div style={{
                background:C.surf2, borderLeft:`3px solid ${C.accent}`,
                borderRadius:"0 8px 8px 0", padding:"12px 14px",
                color:C.text, fontSize:"13px", lineHeight:"1.65", fontStyle:"italic",
              }}>
                "{thread.lastMessage}"
              </div>
            </div>

            {/* Idea Overview */}
            <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"10px" }}>
              <span style={{ fontSize:"13px" }}>💡</span>
              <span style={{ fontSize:"12px", fontWeight:"700", color:C.text }}>Idea Overview</span>
            </div>

            {loadingIdea ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{
                  width:"20px", height:"20px", borderRadius:"50%",
                  border:`2px solid ${C.border}`, borderTopColor:C.accent,
                  animation:"abSpin .7s linear infinite", margin:"0 auto",
                }}/>
                <p style={{ color:C.dim, fontSize:"10px", marginTop:"8px" }}>Loading idea details…</p>
              </div>

            ) : fullIdea ? (
              <>
                {/* Domain / Stage / Innovator / Email */}
                <div style={{
                  display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2px 16px",
                  background:C.surf2, borderRadius:"8px",
                  padding:"12px 14px", marginBottom:"8px",
                  border:`1px solid ${C.border}`,
                }}>
                  <MetaRow label="Domain"    value={fullIdea.domain} />
                  <MetaRow label="Stage"     value={fullIdea.stage} />
                  <MetaRow
                    label="Innovator"
                    value={fullIdea.innovatorId?.name || (isInvestor ? thread.otherUser?.name : null)}
                  />
                  <MetaRow
                    label="Email"
                    value={fullIdea.innovatorId?.email || (isInvestor ? thread.otherUser?.email : null)}
                  />
                </div>

                {/* Problem / Solution / Market / Revenue */}
                {(fullIdea.problem || fullIdea.solution || fullIdea.market || fullIdea.revenue) && (
                  <div style={{
                    background:C.surf2, borderRadius:"8px",
                    padding:"12px 14px", border:`1px solid ${C.border}`,
                  }}>
                    <MetaRow label="Problem"  value={fullIdea.problem} />
                    <MetaRow label="Solution" value={fullIdea.solution} />
                    <MetaRow label="Market"   value={fullIdea.market} />
                    <MetaRow label="Revenue"  value={fullIdea.revenue} />
                  </div>
                )}
              </>

            ) : (
              /* Fallback: idea couldn't be fetched — show thread info */
              <div style={{
                background:C.surf2, border:`1px solid ${C.border}`,
                borderRadius:"8px", padding:"12px 14px",
              }}>
                <div style={{ fontSize:"12px", color:C.text, marginBottom:"4px", fontWeight:"600" }}>
                  {thread.ideaTitle}
                </div>
                {thread.ideaDomain && (
                  <div style={{ fontSize:"11px", color:C.muted }}>{thread.ideaDomain}</div>
                )}
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div style={{
            padding:"14px 20px", borderTop:`1px solid ${C.border}`,
            background:C.surface, flexShrink:0,
          }}>
            <textarea
              className="ab-textarea"
              rows={3}
              value={replyTxt}
              placeholder={`Reply to ${senderName.split(" ")[0]}… (Enter to send)`}
              onChange={e => setReplyTxt(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
              }}
            />
            <div style={{ display:"flex", gap:"10px" }}>
              <button className="ab-btn-danger" onClick={notInterested} disabled={sending}>
                {sending ? "Processing…" : "🚫 Not Interested"}
              </button>
              <button
                className="ab-btn-send"
                onClick={sendReply}
                disabled={!replyTxt.trim() || sending}
                style={{
                  background: replyTxt.trim() ? C.accent : C.surf3,
                  color:      replyTxt.trim() ? "#fff"   : C.dim,
                  cursor:     replyTxt.trim() && !sending ? "pointer" : "default",
                  opacity:    sending ? 0.7 : 1,
                }}
              >
                {sending ? "Sending…" : "Send Reply →"}
              </button>
            </div>
          </div>

          {/* Multi-alert dots */}
          {alerts.length > 1 && (
            <div style={{
              padding:"8px 20px 10px",
              display:"flex", justifyContent:"center", alignItems:"center", gap:"6px",
              background:C.surf2, borderTop:`1px solid ${C.border}`,
            }}>
              {alerts.map((_, i) => (
                <div
                  key={i}
                  onClick={() => { setCurrent(i); setReplyTxt(""); setFullIdea(null); }}
                  style={{
                    height:"8px", borderRadius:"4px", cursor:"pointer",
                    transition:"all .2s", flexShrink:0,
                    width:      i === current ? "20px" : "8px",
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