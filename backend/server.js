const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const cron = require("node-cron");

const app = express();

// Import Models
const Idea = require("./models/idea"); 
const User = require("./models/user"); // Ensure case matches your filename (e.g., user.js or User.js)

// ==========================================
// 1. GLOBAL MIDDLEWARE
// ==========================================
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
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

    // ==========================================
    // 4. AUTO-DELETION CRON JOB
    // ==========================================
    cron.schedule("0 0 * * *", async () => {
      try {
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() - 1);

        const expiredIdeas = await Idea.find({ createdAt: { $lt: expirationDate } });

        if (expiredIdeas.length > 0) {
          for (const idea of expiredIdeas) {
            // Find the innovator to notify them
            const innovator = await User.findById(idea.innovatorId);
            
            if (innovator) {
              // Push notification to the user's notification array
              // Ensure your User schema has a 'notifications' field
              innovator.notifications.push({
                message: `Your idea "${idea.title}" was automatically deleted after 1 year.`,
                createdAt: new Date(),
                read: false
              });
              await innovator.save();
              console.log(`Notified: ${innovator.email} about deletion of ${idea.title}`);
            }
          }

          // Delete the ideas from DB
          await Idea.deleteMany({ _id: { $in: expiredIdeas.map(i => i._id) } });
          console.log(`System: Deleted ${expiredIdeas.length} expired ideas.`);
        }
      } catch (err) {
        console.error("Cron Job Error:", err);
      }
    });
  })
  .catch(err => console.error("Database Connection Error:", err));