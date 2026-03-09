const express = require("express");
const router = express.Router();
const axios = require("axios");
const Idea = require("../models/idea");
const protect = require("../middleware/authMiddleware");

// ==============================
// POST IDEA — with duplicate check
// ==============================
router.post("/upload-idea", protect, async (req, res) => {
  console.log("Received idea upload request:", req.body);
  try {
    const { title, domain, problem, solution, market, revenue, stage } = req.body;

    // STEP 1 — CALL PYTHON SBERT DUPLICATE SERVICE
    const duplicateCheck = await axios.post(
      "http://127.0.0.1:8001/check-duplicate",
      { title, problem, solution },
      { proxy: false, timeout: 60000 }
    );

    console.log("Duplicate check response:", duplicateCheck.data);

    if (duplicateCheck.data.duplicate) {
      return res.status(400).json({
        duplicate: true,
        existingTitle: duplicateCheck.data.existing_title,
        similarity: duplicateCheck.data.similarity,
        reasons: duplicateCheck.data.reasons || []
      });
    }

    // STEP 2 — SAVE IDEA
    const newIdea = new Idea({
      innovatorId: req.user.id,
      title,
      domain,
      problem,
      solution,
      market,
      revenue,
      stage,
    });

    const savedIdea = await newIdea.save();
    res.status(201).json(savedIdea);

  } catch (err) {
    console.error("Upload Error Full:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      code: err.code
    });
    if (!res.headersSent) {
      if (err.code === 11000) {
        return res.status(400).json({ message: "An idea with this title already exists." });
      }
      if (err.response?.status === 400) {
        return res.status(400).json(err.response.data);
      }
      res.status(500).json({ message: err.message });
    }
  }
});

// ==============================
// GET MY IDEAS
// ==============================
router.get("/my-ideas", protect, async (req, res) => {
  try {
    const ideas = await Idea.find({ innovatorId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(ideas);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ideas" });
  }
});

// ==============================
// GET DASHBOARD STATS  ← NEW
// ==============================
router.get("/dashboard-stats", protect, async (req, res) => {
  try {
    const ideas = await Idea.find({ innovatorId: req.user.id });

    const total = ideas.length;

    // Count by stage
    const stageCounts = { Idea: 0, Prototype: 0, MVP: 0, Live: 0 };
    ideas.forEach((idea) => {
      if (stageCounts[idea.stage] !== undefined) {
        stageCounts[idea.stage]++;
      }
    });

    // Count by domain
    const domainMap = {};
    ideas.forEach((idea) => {
      const d = idea.domain || "Other";
      domainMap[d] = (domainMap[d] || 0) + 1;
    });

    const ideasByDomain = Object.entries(domainMap).map(([domain, count]) => ({
      domain,
      count,
    }));

    // Stage breakdown for pie chart (only stages that have at least 1 idea)
    const ideaStatusData = [
      { name: "Idea",      value: stageCounts.Idea },
      { name: "Prototype", value: stageCounts.Prototype },
      { name: "MVP",       value: stageCounts.MVP },
      { name: "Live",      value: stageCounts.Live },
    ].filter((s) => s.value > 0);

    res.status(200).json({
      total,
      stageCounts,
      ideasByDomain,
      ideaStatusData,
    });

  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// ==============================
// UPDATE IDEA
// ==============================
router.put("/update-idea/:id", protect, async (req, res) => {
  try {
    const updatedIdea = await Idea.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedIdea);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// ==============================
// GET FEEDBACK — who liked my ideas
// ==============================
router.get("/feedback", protect, async (req, res) => {
  try {
    const ideas = await Idea.find({ innovatorId: req.user.id })
      .populate({ path: "likes", select: "name email" })
      .sort({ createdAt: -1 });

    const feedback = ideas.map(idea => ({
      ideaId:    idea._id,
      ideaTitle: idea.title,
      domain:    idea.domain,
      stage:     idea.stage,
      likeCount: idea.likes?.length || 0,
      likedBy:   (idea.likes || []).map(investor => ({
        investorId:    investor._id,
        investorName:  investor.name,
        investorEmail: investor.email,
      })),
    }));

    const totalLikes    = feedback.reduce((sum, f) => sum + f.likeCount, 0);
    const mostLikedIdea = [...feedback].sort((a, b) => b.likeCount - a.likeCount)[0] || null;

    const domainLikes = {};
    feedback.forEach(f => { domainLikes[f.domain] = (domainLikes[f.domain] || 0) + f.likeCount; });
    const likesByDomain = Object.entries(domainLikes).map(([domain, likes]) => ({ domain, likes }));

    const stageLikes = {};
    feedback.forEach(f => { stageLikes[f.stage] = (stageLikes[f.stage] || 0) + f.likeCount; });
    const likesByStage = Object.entries(stageLikes).map(([stage, likes]) => ({ stage, likes }));

    const allInvestorIds = new Set();
    feedback.forEach(f => f.likedBy.forEach(inv => allInvestorIds.add(inv.investorId.toString())));

    res.json({
      feedback,
      stats: {
        totalLikes,
        uniqueInvestors: allInvestorIds.size,
        mostLikedIdea: mostLikedIdea
          ? { title: mostLikedIdea.ideaTitle, likes: mostLikedIdea.likeCount }
          : null,
        likesByDomain,
        likesByStage,
      },
    });
  } catch (err) {
    console.error("Feedback error:", err.message);
    res.status(500).json({ message: "Failed to load feedback" });
  }
});

// ==============================
// ANALYZE IDEA — AI Prediction
// ==============================
router.post("/analyze-idea", protect, async (req, res) => {
  try {
    const { ideaId } = req.body;

    const idea = await Idea.findById(ideaId);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    // Map stage to milestone count
    const milestoneMap = {
      "Idea": 1,
      "Prototype": 2,
      "MVP": 3,
      "Live": 4,
    };

    // Map stage to funding estimate
    const fundingMap = {
      "Idea": 50000,
      "Prototype": 200000,
      "MVP": 500000,
      "Live": 1500000,
    };

    const aiInput = {
      age_first_funding_year: 1.0,
      age_last_funding_year: 2.0,
      relationships: 5,
      funding_rounds: idea.stage === "Live" ? 2 : 1,
      funding_total_usd: fundingMap[idea.stage] || 50000,
      milestones: milestoneMap[idea.stage] || 1,
      is_CA: 0,
      is_web: ["AI", "Edtech", "Fintech", "Healthcare"].includes(idea.domain) ? 1 : 0,
      founded_year: new Date().getFullYear(),
      stage: idea.stage || "Idea",
      domain: idea.domain || "General"
    };

    console.log("Sending to AI:", aiInput);

    const pythonResponse = await axios.post(
      "http://127.0.0.1:8000/predict",
      aiInput,
      { proxy: false, timeout: 60000 }
    );

    res.json(pythonResponse.data);

  } catch (err) {
    console.error("AI Service Error Details:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });
    res.status(500).json({
      message: "AI Prediction Service failed.",
      error: err.response?.data || err.message
    });
  }
});

module.exports = router;
