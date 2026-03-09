const express = require("express");
const router = express.Router();
const axios = require("axios");
const Idea = require("../models/idea");
const User = require("../models/user");
const protect = require("../middleware/authMiddleware");

// ── Investor-only guard ──
const investorOnly = (req, res, next) => {
  if (req.user.role !== "investor") {
    return res.status(403).json({ message: "Investors only" });
  }
  next();
};

// ==============================
// GET ALL APPROVED IDEAS (with innovator info)
// Supports ?domain=AI&stage=MVP&search=keyword
// ==============================
router.get("/ideas", protect, investorOnly, async (req, res) => {
  try {
    const { domain, stage, search } = req.query;

    let query = {};

    if (domain && domain !== "All") query.domain = domain;
    if (stage  && stage  !== "All") query.stage  = stage;

    if (search) {
      query.$or = [
        { title:    { $regex: search, $options: "i" } },
        { problem:  { $regex: search, $options: "i" } },
        { solution: { $regex: search, $options: "i" } },
      ];
    }

    const ideas = await Idea.find(query)
      .populate("innovatorId", "name email linkedin")
      .sort({ createdAt: -1 });

    // Attach like count + whether current investor has liked each idea
    const investorId = req.user.id;
    const enriched = ideas.map(idea => {
      const obj = idea.toObject();
      obj.likeCount   = idea.likes?.length || 0;
      obj.likedByMe   = idea.likes?.map(id => id.toString()).includes(investorId.toString());
      return obj;
    });

    res.json(enriched);
  } catch (err) {
    console.error("Fetch ideas error:", err.message);
    res.status(500).json({ message: "Failed to fetch ideas" });
  }
});

// ==============================
// TOGGLE LIKE on an idea
// ==============================
router.post("/like/:ideaId", protect, investorOnly, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.ideaId);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const investorId = req.user.id.toString();
    const alreadyLiked = idea.likes?.map(id => id.toString()).includes(investorId);

    if (alreadyLiked) {
      idea.likes = idea.likes.filter(id => id.toString() !== investorId);
    } else {
      if (!idea.likes) idea.likes = [];
      idea.likes.push(investorId);
    }

    await idea.save();

    res.json({
      liked:     !alreadyLiked,
      likeCount: idea.likes.length,
    });
  } catch (err) {
    console.error("Like error:", err.message);
    res.status(500).json({ message: "Like failed" });
  }
});

// ==============================
// AI ANALYSIS for a specific idea
// ==============================
router.post("/analyze-idea", protect, investorOnly, async (req, res) => {
  try {
    const { ideaId } = req.body;

    const idea = await Idea.findById(ideaId);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const milestoneMap = { Idea: 1, Prototype: 2, MVP: 3, Live: 4 };
    const fundingMap   = { Idea: 50000, Prototype: 200000, MVP: 500000, Live: 1500000 };

    const aiInput = {
      age_first_funding_year: 1.0,
      age_last_funding_year:  2.0,
      relationships:    5,
      funding_rounds:   idea.stage === "Live" ? 2 : 1,
      funding_total_usd: fundingMap[idea.stage] || 50000,
      milestones:       milestoneMap[idea.stage] || 1,
      is_CA:            0,
      is_web:           ["AI", "Edtech", "Fintech", "Healthcare"].includes(idea.domain) ? 1 : 0,
      founded_year:     new Date().getFullYear(),
      stage:            idea.stage  || "Idea",
      domain:           idea.domain || "General",
    };

    const pythonResponse = await axios.post(
      "http://127.0.0.1:8000/predict",
      aiInput,
      { proxy: false, timeout: 60000, headers: { "Content-Type": "application/json" } }
    );

    res.json(pythonResponse.data);
  } catch (err) {
    console.error("AI error:", err.message);
    res.status(500).json({
      message: "AI Prediction failed.",
      error: err.response?.data || err.message,
    });
  }
});

// ==============================
// INVESTOR DASHBOARD STATS
// ==============================
router.get("/dashboard-stats", protect, investorOnly, async (req, res) => {
  try {
    const investorId = req.user.id;

    const allIdeas = await Idea.find().populate("innovatorId", "name");

    const total      = allIdeas.length;
    const likedByMe  = allIdeas.filter(i => i.likes?.map(id => id.toString()).includes(investorId.toString())).length;

    // Domain breakdown
    const domainMap = {};
    allIdeas.forEach(i => {
      const d = i.domain || "Other";
      domainMap[d] = (domainMap[d] || 0) + 1;
    });
    const ideasByDomain = Object.entries(domainMap).map(([domain, count]) => ({ domain, count }));

    // Stage breakdown
    const stageMap = {};
    allIdeas.forEach(i => {
      const s = i.stage || "Unknown";
      stageMap[s] = (stageMap[s] || 0) + 1;
    });
    const ideasByStage = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }));

    // Top liked ideas (most likes overall)
    const topLiked = allIdeas
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      .slice(0, 5)
      .map(i => ({ title: i.title, likes: i.likes?.length || 0, domain: i.domain }));

    res.json({ total, likedByMe, ideasByDomain, ideasByStage, topLiked });
  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

module.exports = router;
