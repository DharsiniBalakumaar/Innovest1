const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();

// ── ADD THIS — fixes the CSP blocking issue ──
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
  next();
});

app.use(cors({
  origin: "http://localhost:5173",  // your Vite frontend
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const authRoutes      = require("./routes/authRoutes");
const innovatorRoutes = require("./routes/innovatorRoutes");
const adminRoutes     = require("./routes/adminRoutes");
const investorRoutes  = require("./routes/investorRoutes");

app.use("/api/auth",      authRoutes);
app.use("/api/innovator", innovatorRoutes);
app.use("/api/admin",     adminRoutes);
app.use("/api/investor",  investorRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(5000, () => console.log("Server running on port 5000")))
  .catch(err => console.error(err));