import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function InnovatorDashboard() {
  const navigate = useNavigate();

  /* MOCK DATA (replace with API later) */
  const stats = {
    total: 6,
    underReview: 3,
    funded: 1,
  };

  const ideaStatusData = [
    { name: "Under Review", value: stats.underReview },
    { name: "Funded", value: stats.funded },
    { name: "Others", value: stats.total - stats.underReview - stats.funded },
  ];

  const ideasByDomain = [
    { domain: "AI", count: 2 },
    { domain: "FinTech", count: 1 },
    { domain: "Health", count: 2 },
    { domain: "EdTech", count: 1 },
  ];

  return (
    <div style={styles.page}>
      {/* ===== HERO HEADER ===== */}
      <div style={styles.header}>
        <h1>👨‍💻 Innovator Dashboard</h1>
        <p>Track your ideas and attract investors visually</p>
      </div>

      {/* ===== ACTION CARDS ===== */}
      <div style={styles.grid}>
        <Card
          title="Post New Idea"
          desc="Submit innovation for AI & investor review"
          icon="🚀"
          color="#6c5ce7"
          onClick={() => navigate("/innovator/post-idea")}
        />

        <Card
          title="My Ideas"
          desc="Track progress of submitted ideas"
          icon="📂"
          color="#00b894"
          onClick={() => navigate("/innovator/my-ideas")}
        />

        <Card
          title="Investor Feedback"
          desc="See interest & messages"
          icon="💬"
          color="#fdcb6e"
          onClick={() => navigate("/innovator/feedback")}
        />
      </div>

      {/* ===== STATS ===== */}
      <div style={styles.stats}>
        <Stat title="Ideas Submitted" value={stats.total} color="#0984e3" />
        <Stat title="Under Review" value={stats.underReview} color="#e17055" />
        <Stat title="Funded" value={stats.funded} color="#00b894" />
      </div>

      {/* ===== CHARTS ===== */}
      <div style={styles.charts}>
        <div style={styles.chartCard}>
          <h3>📊 Idea Status</h3>
          <PieChart width={260} height={260}>
            <Pie
              data={ideaStatusData}
              dataKey="value"
              outerRadius={90}
              label
            >
              {["#e17055", "#00b894", "#b2bec3"].map((c, i) => (
                <Cell key={i} fill={c} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        <div style={styles.chartCard}>
          <h3>📈 Ideas by Domain</h3>
          <BarChart width={360} height={260} data={ideasByDomain}>
            <XAxis dataKey="domain" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#6c5ce7" />
          </BarChart>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

const Card = ({ title, desc, icon, color, onClick }) => (
  <div
    onClick={onClick}
    style={{
      ...styles.card,
      borderLeft: `6px solid ${color}`,
    }}
  >
    <h3>{icon} {title}</h3>
    <p>{desc}</p>
  </div>
);

const Stat = ({ title, value, color }) => (
  <div style={{ ...styles.statBox, background: color }}>
    <h2>{value}</h2>
    <span>{title}</span>
  </div>
);

/* ================= STYLES ================= */

const styles = {
  page: {
    padding: "2.5rem",
    background: "#f4f6f8",
    minHeight: "100vh",
  },

  header: {
    background: "linear-gradient(135deg,#6c5ce7,#00b894)",
    color: "white",
    padding: "2rem",
    borderRadius: "18px",
    marginBottom: "2rem",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))",
    gap: "1.5rem",
    marginBottom: "2.5rem",
  },

  card: {
    background: "#fff",
    padding: "1.6rem",
    borderRadius: "16px",
    cursor: "pointer",
    boxShadow: "0 12px 30px rgba(0,0,0,.1)",
    transition: "transform .2s",
  },

  stats: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
    marginBottom: "2.5rem",
  },

  statBox: {
    color: "#fff",
    padding: "1.5rem 2.2rem",
    borderRadius: "14px",
    textAlign: "center",
    minWidth: "180px",
    boxShadow: "0 10px 24px rgba(0,0,0,.15)",
  },

  charts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))",
    gap: "2rem",
  },

  chartCard: {
    background: "#fff",
    padding: "1.8rem",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,.1)",
    textAlign: "center",
  },
};
