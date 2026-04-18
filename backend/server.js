const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
require("dotenv").config();
const path = require("path");

// NOTE: node-cron is intentionally NOT imported.
// There is NO auto-deletion of ideas anywhere in this file.

const app = express();

const Idea = require("./models/idea");
const User = require("./models/user");

// ==========================================
// 1. GLOBAL MIDDLEWARE
// ==========================================
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
  );
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==========================================
// 2. ROUTES
// ==========================================
const messageRoutes   = require("./routes/messageRoutes");
const authRoutes      = require("./routes/authRoutes");
const innovatorRoutes = require("./routes/innovatorRoutes");
const adminRoutes     = require("./routes/adminRoutes");
const investorRoutes  = require("./routes/investorRoutes");

app.use("/api/messages",  messageRoutes);
app.use("/api/auth",      authRoutes);
app.use("/api/innovator", innovatorRoutes);
app.use("/api/admin",     adminRoutes);
app.use("/api/investor",  investorRoutes);

// ==========================================
// 3. DATABASE & SERVER START
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(5000, () => console.log("Server running on port 5000"));
  })
  .catch((err) => console.error("Database Connection Error:", err));