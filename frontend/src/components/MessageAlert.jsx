// frontend/src/components/MessageAlert.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api/messages";
const tok = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function MessageAlert() {
  const [alerts,     setAlerts]     = useState([]);  // unread threads to show
  const [dismissed,  setDismissed]  = useState(new Set());
  const [sending,    setSending]    = useState({});
  const navigate  = useNavigate();
  const location  = useLocation();

  // Don't show alerts on the messages page itself
  const isOnMessages = location.pathname === "/messages";

  const fetchUnread = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || isOnMessages) return;
    try {
      const r = await axios.get(`${API}/threads`, { headers: tok() });
      // only threads with unread messages
      const unread = r.data.filter(t => t.unreadCount > 0);
      setAlerts(unread);
    } catch (e) { console.error(e); }
  }, [isOnMessages]);

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 10000); // poll every 10s
    return () => clearInterval(t);
  }, [fetchUnread]);

  const handleReply = (thread) => {
    // dismiss this alert then navigate to messages
    setDismissed(prev => new Set([...prev, thread.conversationId]));
    navigate("/messages");
  };

  const handleNotInterested = async (thread) => {
  setSending(prev => ({ ...prev, [thread.conversationId]: true }));
  try {
    await axios.post(`${API}/not-interested`, {
      conversationId: thread.conversationId,
      ideaId:         thread.ideaId,
      receiverId:     thread.otherUser._id,
      ideaTitle:      thread.ideaTitle,
    }, { headers: tok() });
    setDismissed(prev => new Set([...prev, thread.conversationId]));
  } catch (e) { console.error(e); }
  finally {
    setSending(prev => ({ ...prev, [thread.conversationId]: false }));
  }
};

  const handleDismiss = (convId) => {
    setDismissed(prev => new Set([...prev, convId]));
  };

  // visible alerts = unread & not dismissed
  const visible = alerts.filter(t => !dismissed.has(t.conversationId));

  if (isOnMessages || visible.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      maxWidth: "360px",
      width: "100%",
    }}>
      {visible.slice(0, 3).map((thread) => (
        <AlertCard
          key={thread.conversationId}
          thread={thread}
          onReply={() => handleReply(thread)}
          onNotInterested={() => handleNotInterested(thread)}
          onDismiss={() => handleDismiss(thread.conversationId)}
          sending={sending[thread.conversationId]}
        />
      ))}

      {/* If more than 3, show a count */}
      {visible.length > 3 && (
        <div
          onClick={() => navigate("/messages")}
          style={{
            background: "#6c5ce7",
            color: "#fff",
            borderRadius: "10px",
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: "700",
            cursor: "pointer",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(108,92,231,0.4)",
          }}
        >
          +{visible.length - 3} more messages → View all
        </div>
      )}
    </div>
  );
}

/* ── Single alert card ── */
function AlertCard({ thread, onReply, onNotInterested, onDismiss, sending }) {
  const [hovered, setHovered] = useState(false);

  // avatar color based on name
  const avatarColors = ["#6c5ce7","#00b894","#0984e3","#e17055","#fdcb6e"];
  const avatarColor  = avatarColors[(thread.otherUser?.name?.charCodeAt(0) || 0) % avatarColors.length];
  const initials = (name = "?") =>
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#1a1a2e",
        border: "1px solid rgba(108,92,231,0.4)",
        borderRadius: "14px",
        padding: "14px 16px",
        boxShadow: hovered
          ? "0 8px 32px rgba(108,92,231,0.35)"
          : "0 4px 20px rgba(0,0,0,0.5)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all .2s ease",
        animation: "slideIn .3s ease-out",
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(108,92,231,0.4); }
          50%       { border-color: rgba(108,92,231,0.9); }
        }
      `}</style>

      {/* Top row: avatar + name + dismiss */}
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
        {/* Avatar with pulse ring */}
        <div style={{ position:"relative", flexShrink:0 }}>
          <div style={{
            width:"36px", height:"36px", borderRadius:"50%",
            background: avatarColor, color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"13px", fontWeight:"700",
          }}>
            {initials(thread.otherUser?.name)}
          </div>
          {/* Live pulse dot */}
          <div style={{
            position:"absolute", bottom:0, right:0,
            width:"10px", height:"10px", borderRadius:"50%",
            background:"#00b894", border:"2px solid #1a1a2e",
            animation:"ping 1.5s ease-in-out infinite",
          }}/>
          <style>{`
            @keyframes ping {
              0%, 100% { transform: scale(1); opacity: 1; }
              50%       { transform: scale(1.3); opacity: 0.6; }
            }
          `}</style>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:"700", fontSize:"13px", color:"#e6edf3" }}>
            {thread.otherUser?.name}
            <span style={{
              marginLeft:"6px", fontSize:"9px", fontWeight:"700",
              background:"rgba(108,92,231,0.2)", color:"#a29bfe",
              padding:"1px 6px", borderRadius:"3px", textTransform:"uppercase",
            }}>
              {thread.otherUser?.role}
            </span>
          </div>
          <div style={{ fontSize:"10px", color:"#7d8590", marginTop:"1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            💡 {thread.ideaTitle}
          </div>
        </div>

        {/* Dismiss × */}
        <button
          onClick={onDismiss}
          style={{ background:"none", border:"none", color:"#484f58", cursor:"pointer", fontSize:"14px", padding:"2px", lineHeight:1, flexShrink:0 }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Message preview */}
      <div style={{
        background:"rgba(255,255,255,0.04)", borderRadius:"8px",
        padding:"8px 10px", marginBottom:"12px",
        fontSize:"11px", color:"#7d8590", lineHeight:"1.5",
        borderLeft:"2px solid rgba(108,92,231,0.5)",
      }}>
        <span style={{ color:"#a29bfe", fontWeight:"600" }}>
          {thread.unreadCount} new message{thread.unreadCount !== 1 ? "s" : ""}
        </span>
        {" · "}
        <span style={{ fontStyle:"italic" }}>{thread.lastMessage?.slice(0, 60)}{thread.lastMessage?.length > 60 ? "…" : ""}</span>
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:"8px" }}>
        {/* Reply → goes to chat */}
        <button
          onClick={onReply}
          style={{
            flex:1, padding:"8px 12px", borderRadius:"8px", border:"none",
            background:"linear-gradient(135deg,#6c5ce7,#a29bfe)",
            color:"#fff", fontWeight:"700", fontSize:"12px",
            cursor:"pointer", transition:"opacity .15s",
          }}
          onMouseEnter={e => e.target.style.opacity = "0.85"}
          onMouseLeave={e => e.target.style.opacity = "1"}
        >
          💬 Reply
        </button>

        {/* Not interested → sends auto-message */}
        <button
          onClick={onNotInterested}
          disabled={sending}
          style={{
            flex:1, padding:"8px 12px", borderRadius:"8px",
            border:"1px solid rgba(248,81,73,0.3)",
            background:"rgba(248,81,73,0.08)",
            color: sending ? "#484f58" : "#f85149",
            fontWeight:"700", fontSize:"12px",
            cursor: sending ? "not-allowed" : "pointer",
            transition:"all .15s",
          }}
        >
          {sending ? "Sending…" : "👎 Not Interested"}
        </button>
      </div>
    </div>
  );
}