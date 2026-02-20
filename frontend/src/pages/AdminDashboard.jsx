import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#4CAF50", "#FF9800", "#2196F3", "#E91E63"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [ideas, setIdeas] = useState([]);

  const [activeSection, setActiveSection] = useState("pendingInnovators");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedIdea, setSelectedIdea] = useState(null);

  const [pendingInvestors, setPendingInvestors] = useState([]);
  const [approvedInvestors, setApprovedInvestors] = useState([]);

  useEffect(() => {
    if (!token) return navigate("/");
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const headers = { Authorization: `Bearer ${token}` };

    const [statsRes, pendingRes] = await Promise.all([
      axios.get("http://localhost:5000/api/admin/dashboard-stats", { headers }),
      axios.get("http://localhost:5000/api/admin/pending-users", { headers }),
    ]);

    setStats(statsRes.data);
    setPendingUsers(pendingRes.data);
  };

  const fetchApprovedUsers = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/admin/approved-users",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setApprovedUsers(res.data);
  };

  const fetchIdeas = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/admin/ideas",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setIdeas(res.data);
  };

  const approveUser = async (id) => {
    await axios.put(
      `http://localhost:5000/api/admin/approve/${id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    loadDashboard();
    fetchApprovedUsers();
    setSelectedUser(null);
  };

  const rejectUser = async (id) => {
    await axios.put(
      `http://localhost:5000/api/admin/reject/${id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    loadDashboard();
    setSelectedUser(null);
  };

  const fetchPendingInvestors = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/admin/pending-investors",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setPendingInvestors(res.data);
  };

  const fetchApprovedInvestors = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/admin/approved-investors",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setApprovedInvestors(res.data);
  };

  if (!stats) return <p>Loading dashboard...</p>;

  return (
    <div style={{ padding: 30, background: "#eef2f7", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "2.2rem", marginBottom: 20 }}>Admin Dashboard</h1>

      {/* ===== STAT CARDS ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 20 }}>
        <Stat label="Pending Innovators" value={stats.pending} color="#FF9800"
          onClick={() => setActiveSection("pendingInnovators")} />

        <Stat label="Approved Innovators" value={stats.approved} color="#4CAF50"
          onClick={() => {
            fetchApprovedUsers();
            setActiveSection("approvedInnovators");
          }} />

        <Stat label="Pending Investors" value={stats.pendingInvestors} color="#E91E63"
          onClick={() => {
            fetchPendingInvestors();
            setActiveSection("pendingInvestors");
          }} />

        <Stat label="Approved Investors" value={stats.approvedInvestors} color="#009688"
          onClick={() => {
            fetchApprovedInvestors();
            setActiveSection("approvedInvestors");
          }} />

        <Stat label="Total Ideas" value={stats.totalIdeas} color="#2196F3"
          onClick={() => {
            fetchIdeas();
            setActiveSection("ideas");
          }} />

        <Stat label="Domains" value={stats.ideasByDomain.length} color="#9C27B0" />
      </div>

      {/* ===== CHARTS ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginTop: 30 }}>
        <Card title="Ideas by Domain">
          <BarChart width={520} height={300} data={stats.ideasByDomain}>
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#2196F3" />
          </BarChart>
        </Card>

        <Card title="Approval Status">
          <PieChart width={300} height={300}>
            <Pie
              data={[
                { name: "Approved", value: stats.approved },
                { name: "Pending", value: stats.pending },
              ]}
              dataKey="value"
              outerRadius={110}
            >
              {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </Card>
      </div>

      {/* ===== SECTIONS ===== */}
      <Section title={
        activeSection === "pendingInnovators" ? "Pending Innovators" :
        activeSection === "approvedInnovators" ? "Approved Innovators" :
        activeSection === "pendingInvestors" ? "Pending Investors" :
        activeSection === "approvedInvestors" ? "Approved Investors" :
        "Submitted Ideas"
      }>

        {(activeSection === "pendingInnovators") &&
          pendingUsers.map(u => <UserRow key={u._id} user={u} onView={() => setSelectedUser(u)} />)}

        {(activeSection === "approvedInnovators") &&
          approvedUsers.map(u => <UserRow key={u._id} user={u} onView={() => setSelectedUser(u)} />)}

        {(activeSection === "pendingInvestors") &&
          pendingInvestors.map(u => <UserRow key={u._id} user={u} onView={() => setSelectedUser(u)} />)}

        {(activeSection === "approvedInvestors") &&
          approvedInvestors.map(u => <UserRow key={u._id} user={u} onView={() => setSelectedUser(u)} />)}

        {(activeSection === "ideas") &&
          ideas.map(i => (
            <IdeaCard key={i._id} idea={i} onClick={() => setSelectedIdea(i)} />
          ))}
      </Section>

      {/* ===== USER MODAL ===== */}
      {selectedUser && (
        <Modal onClose={() => setSelectedUser(null)}>
          <h2>KYC Details</h2>
          <Detail label="Name" value={selectedUser.name} />
          <Detail label="Email" value={selectedUser.email} />
          <Detail label="Phone" value={selectedUser.phone || "N/A"} />
          <Detail label="LinkedIn" value={selectedUser.linkedin || "N/A"} />

          {selectedUser.documents?.identityProof && (
            <a
              href={`http://localhost:5000/uploads/${selectedUser.documents.identityProof}`}
              target="_blank"
              rel="noreferrer"
            >
              Download Document
            </a>
          )}

          <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
  <button
    onClick={() => approveUser(selectedUser._id)}
    style={{
      background: "#4CAF50",
      color: "#fff",
      border: "none",
      padding: "12px 24px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: "1rem",
    }}
  >
    Approve
  </button>

  <button
    onClick={() => rejectUser(selectedUser._id)}
    style={{
      background: "#E53935",
      color: "#fff",
      border: "none",
      padding: "12px 24px",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: "1rem",
    }}
  >
    Reject
  </button>
</div>

        </Modal>
      )}

      {/* ===== IDEA MODAL ===== */}
      {selectedIdea && (
        <Modal onClose={() => setSelectedIdea(null)}>
          <h2>{selectedIdea.title}</h2>
          <Detail label="Domain" value={selectedIdea.domain} />
          <Detail label="Stage" value={selectedIdea.stage} />
          <Detail label="Problem" value={selectedIdea.problem} />
          <Detail label="Solution" value={selectedIdea.solution} />
          <Detail label="Market" value={selectedIdea.market} />
          <Detail label="Revenue" value={selectedIdea.revenue} />
          <Detail label="Innovator" value={selectedIdea.innovatorId?.name} />
        </Modal>
      )}
    </div>
  );
}

/* ================= UI COMPONENTS ================= */

const Stat = ({ label, value, color, onClick }) => (
  <div onClick={onClick}
    style={{
      background: color,
      color: "#fff",
      padding: 22,
      borderRadius: 14,
      cursor: "pointer",
      boxShadow: "0 6px 16px rgba(0,0,0,.15)"
    }}>
    <h3 style={{ fontSize: "1rem", opacity: 0.9 }}>{label}</h3>
    <h1 style={{ fontSize: "2.4rem" }}>{value}</h1>
  </div>
);

const Card = ({ title, children }) => (
  <div style={{ background: "#fff", padding: 20, borderRadius: 14 }}>
    <h3 style={{ marginBottom: 10 }}>{title}</h3>
    {children}
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ background: "#fff", padding: 25, marginTop: 30, borderRadius: 14 }}>
    <h2 style={{ marginBottom: 20 }}>{title}</h2>
    {children}
  </div>
);

const UserRow = ({ user, onView }) => (
  <div style={{
    display: "flex",
    justifyContent: "space-between",
    padding: "18px 22px",
    background: "#f9fafc",
    marginBottom: 12,
    borderRadius: 12
  }}>
    <div>
      <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{user.name}</div>
      <div style={{ color: "#666" }}>{user.email}</div>
    </div>
    <button
  onClick={onView}
  style={{
    background: "linear-gradient(135deg, #6c5ce7, #5a4bdc)",
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 4px 10px rgba(108,92,231,.3)",
  }}
>
  View Full KYC
</button>

  </div>
);

const IdeaCard = ({ idea, onClick }) => (
  <div onClick={onClick}
    style={{
      padding: 20,
      borderLeft: "6px solid #2196F3",
      background: "#f9fbff",
      marginBottom: 15,
      borderRadius: 10,
      cursor: "pointer"
    }}>
    <strong style={{ fontSize: "1.2rem" }}>{idea.title}</strong>
    <div style={{ marginTop: 8, color: "#555" }}>
      {idea.domain} • {idea.stage}
    </div>
  </div>
);

const Detail = ({ label, value }) => (
  <p><strong>{label}:</strong> {value}</p>
);

const Modal = ({ children, onClose }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
  >
    <div
      style={{
        background: "#ffffff",
        width: "85%",
        maxWidth: "900px",
        maxHeight: "85vh",
        borderRadius: "18px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ===== MODAL HEADER ===== */}
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f8f9fb",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#2c3e50" }}>
          Details
        </h2>

        {/* ❌ CLOSE ICON */}
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            fontSize: "1.8rem",
            cursor: "pointer",
            color: "#888",
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {/* ===== MODAL BODY (SCROLLABLE) ===== */}
      <div
        style={{
          padding: "24px",
          overflowY: "auto",
          flex: 1,
        }}
      >
        {children}
      </div>

      {/* ===== MODAL FOOTER ===== */}
      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid #eee",
          textAlign: "right",
          background: "#fafafa",
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "#eceff1",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

