const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ── Existing routes you already have ──
const authRoutes      = require("./routes/authRoutes");
const innovatorRoutes = require("./routes/innovatorRoutes");
const adminRoutes     = require("./routes/adminRoutes");

app.use("/api/auth",      authRoutes);
app.use("/api/innovator", innovatorRoutes);
app.use("/api/admin",     adminRoutes);

// ── ADD THESE TWO LINES ──  ← THIS IS ALL YOU NEED
const investorRoutes = require("./routes/investorRoutes");
app.use("/api/investor", investorRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(5000, () => console.log("Server running on port 5000")))
  .catch(err => console.error(err));