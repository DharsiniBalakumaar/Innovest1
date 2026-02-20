const express = require("express");
const User = require("../models/user");
const Idea = require("../models/idea");
const authMiddleware = require("../middleware/authMiddleware");
const fs = require("fs");

const router = express.Router();

/* ================= ADMIN ONLY ================= */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* ================= PENDING USERS ================= */
router.get("/pending-users", authMiddleware, adminOnly, async (req, res) => {
  const users = await User.find({ status: "pending" });
  res.json(users);
});

/* ================= APPROVE USER ================= */
router.put("/approve/:id", authMiddleware, adminOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: "approved" });
  res.json({ message: "Approved" });
});

/* ================= REJECT USER ================= */
router.put("/reject/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (deletedUser.documents?.identityProof) {
      fs.unlinkSync(`./uploads/${deletedUser.documents.identityProof}`);
    }

    res.json({ message: "User rejected & deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ PENDING INVESTORS
router.get("/pending-investors", authMiddleware, adminOnly, async (req, res) => {
  const users = await User.find({ role: "investor", status: "pending" });
  res.json(users);
});

// ✅ APPROVED INVESTORS
router.get("/approved-investors", authMiddleware, adminOnly, async (req, res) => {
  const users = await User.find({ role: "investor", status: "approved" });
  res.json(users);
});


/* ================= DASHBOARD STATS ================= */
router.get("/dashboard-stats", authMiddleware, adminOnly, async (req, res) => {
  try {
    // Counts for Innovators
    const pending = await User.countDocuments({ role: "innovator", status: "pending" });
    const approved = await User.countDocuments({ role: "innovator", status: "approved" });
    
    // NEW: Counts for Investors (This is what was missing)
    const pendingInvestors = await User.countDocuments({ role: "investor", status: "pending" });
    const approvedInvestors = await User.countDocuments({ role: "investor", status: "approved" });
    
    const totalIdeas = await Idea.countDocuments();

    const ideasByDomain = await Idea.aggregate([
      { $group: { _id: "$domain", count: { $sum: 1 } } }
    ]);

    // Update the response to include the new investor fields
    res.json({
      pending,
      approved,
      pendingInvestors,  // Sent to frontend
      approvedInvestors, // Sent to frontend
      totalIdeas,
      ideasByDomain,
    });
  } catch (err) {
    res.status(500).json({ message: "Dashboard stats failed" });
  }
});

/* ================= ALL IDEAS (ADMIN) ================= */
router.get("/ideas", authMiddleware, adminOnly, async (req, res) => {
  try {
    const ideas = await Idea.find().populate("innovatorId", "name email");
    res.json(ideas);
  } catch (err) {
    res.status(500).json({ message: "Failed to load ideas" });
  }
});

module.exports = router;
