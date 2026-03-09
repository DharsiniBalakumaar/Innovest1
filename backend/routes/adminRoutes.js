const express = require("express");
const User = require("../models/user");
const Idea = require("../models/idea");
const authMiddleware = require("../middleware/authMiddleware");
const fs = require("fs");
const axios = require("axios");

const router = express.Router();

/* ── ADMIN ONLY GUARD ── */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

/* ── PENDING INNOVATORS ── */
router.get("/pending-users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: "innovator", status: "pending" });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── APPROVED INNOVATORS ── */
router.get("/approved-users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: "innovator", status: "approved" });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── PENDING INVESTORS ── */
router.get("/pending-investors", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: "investor", status: "pending" });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── APPROVED INVESTORS ── */
router.get("/approved-investors", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: "investor", status: "approved" });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── APPROVE USER ── */
router.put("/approve/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { status: "approved" });
    res.json({ message: "User approved" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── REJECT USER ── */
router.put("/reject/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });

    if (deletedUser.documents?.identityProof) {
      const filePath = `./uploads/${deletedUser.documents.identityProof}`;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ message: "User rejected and deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── DASHBOARD STATS ── */
router.get("/dashboard-stats", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [pending, approved, pendingInvestors, approvedInvestors, totalIdeas, ideasByDomain] =
      await Promise.all([
        User.countDocuments({ role: "innovator", status: "pending" }),
        User.countDocuments({ role: "innovator", status: "approved" }),
        User.countDocuments({ role: "investor",  status: "pending" }),
        User.countDocuments({ role: "investor",  status: "approved" }),
        Idea.countDocuments(),
        Idea.aggregate([{ $group: { _id: "$domain", count: { $sum: 1 } } }]),
      ]);

    res.json({ pending, approved, pendingInvestors, approvedInvestors, totalIdeas, ideasByDomain });
  } catch (err) {
    res.status(500).json({ message: "Dashboard stats failed" });
  }
});

/* ── ALL IDEAS (with innovator info) ── */
router.get("/ideas", authMiddleware, adminOnly, async (req, res) => {
  try {
    const ideas = await Idea.find()
      .populate("innovatorId", "name email phone status")
      .sort({ createdAt: -1 });
    res.json(ideas);
  } catch (err) {
    res.status(500).json({ message: "Failed to load ideas" });
  }
});

router.post("/analyze-idea", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { aiInput } = req.body;

    if (!aiInput) {
      return res.status(400).json({ message: "Missing aiInput in request body" });
    }

    const pythonResponse = await axios.post(
      "http://127.0.0.1:8000/predict",
      aiInput,
      { 
        proxy: false,          // ← THIS was missing
        timeout: 60000,
        headers: { "Content-Type": "application/json" }
      }
    );

    res.json(pythonResponse.data);

  } catch (err) {
    console.error("DETAILED ERROR:", err.message);
    console.error("FULL ERROR:", err.code, err.config?.url);
    res.status(500).json({ message: "Backend bridge error", details: err.message });
  }
});

/* ── IDEAS BY SPECIFIC INNOVATOR ── */
router.get("/ideas/by-user/:userId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const ideas = await Idea.find({ innovatorId: req.params.userId })
      .populate("innovatorId", "name email")
      .sort({ createdAt: -1 });
    res.json(ideas);
  } catch (err) {
    res.status(500).json({ message: "Failed to load ideas for user" });
  }
});

module.exports = router;
