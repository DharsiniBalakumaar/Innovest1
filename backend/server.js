const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config(); // 👈 dotenv MUST be first

// ✅ ADD THIS CHECK HERE ⬇️
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in .env file");
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/innovator", require("./routes/innovatorRoutes"));

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
