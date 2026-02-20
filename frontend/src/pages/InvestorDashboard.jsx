import axios from "axios";
import { useEffect, useState } from "react";
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

const COLORS = ["#e17055", "#00b894", "#0984e3", "#fdcb6e"];

export default function InvestorDashboard() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    underReview: 0,
    funded: 0,
  });

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get("http://localhost:5000/api/ideas", { headers });
      setIdeas(res.data);

      // Compute stats
      const total = res.data.length;
      const underReview = res.data.filter(i => i.stage?.toLowerCase() === "under review").length;
      const funded = res.data.filter(i => i.stage?.toLowerCase() === "funded").length;

      setStats({ total, underReview, funded });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) return <p className="p-8">Loading ideas...</p>;

  // Prepare data for charts
  const ideaStatusData = [
    { name: "Under Review", value: stats.underReview },
    { name: "Funded", value: stats.funded },
    { name: "Others", value: stats.total - stats.underReview - stats.funded },
  ];

  const ideasByDomain = [];
  ideas.forEach((i) => {
    const existing = ideasByDomain.find(d => d.domain === i.domain);
    if (existing) existing.count++;
    else ideasByDomain.push({ domain: i.domain, count: 1 });
  });

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-2">Investor Dashboard</h1>
      <p className="text-gray-600 mb-6">
        Browse innovators' ideas and see visual analytics.
      </p>

      {/* ===== STATS ===== */}
      <div className="flex flex-wrap gap-6 mb-8">
        <StatBox title="Total Ideas" value={stats.total} color="#0984e3" />
        <StatBox title="Under Review" value={stats.underReview} color="#e17055" />
        <StatBox title="Funded" value={stats.funded} color="#00b894" />
      </div>

      {/* ===== CHARTS ===== */}
      <div className="flex flex-wrap gap-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Idea Status</h3>
          <PieChart width={260} height={260}>
            <Pie
              data={ideaStatusData}
              dataKey="value"
              outerRadius={90}
              label
            >
              {ideaStatusData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg flex-1">
          <h3 className="text-xl font-semibold mb-4">Ideas by Domain</h3>
          <BarChart width={360} height={260} data={ideasByDomain}>
            <XAxis dataKey="domain" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#6c5ce7" />
          </BarChart>
        </div>
      </div>

      {/* ===== IDEAS LIST ===== */}
      <div className="mt-10">
        <h3 className="text-2xl font-bold mb-4">All Ideas</h3>
        {ideas.map((i) => (
          <div
            key={i._id}
            className="bg-white p-4 rounded-xl shadow mb-4 hover:shadow-xl transition cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <strong className="text-lg">{i.title}</strong>
              <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                {i.domain}
              </span>
            </div>
            <div className="mt-2 text-gray-700 flex gap-6">
              <span><strong>Stage:</strong> {i.stage}</span>
              <span><strong>Innovator:</strong> {i.innovatorId?.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== SMALL COMPONENTS ===== */
const StatBox = ({ title, value, color }) => (
  <div
    className="p-6 rounded-xl shadow-lg text-center min-w-[160px]"
    style={{ backgroundColor: color, color: "#fff" }}
  >
    <h2 className="text-2xl font-bold">{value}</h2>
    <span>{title}</span>
  </div>
);
