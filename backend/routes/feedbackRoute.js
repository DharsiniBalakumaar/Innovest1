const express = require("express");
const router = express.Router();
const Idea = require("../models/idea");
const User = require("../models/user");
const protect = require("../middleware/authMiddleware");

// ==============================
// GET FEEDBACK — who liked my ideas + timeline
// ==============================
router.get("/feedback", protect, async (req, res) => {
  try {
    // Get all ideas by this innovator, populate likes with investor info
    const ideas = await Idea.find({ innovatorId: req.user.id })
      .populate({
        path: "likes",
        select: "name email createdAt",
      })
      .sort({ createdAt: -1 });

    // Build response: per-idea like info
    const feedback = ideas.map(idea => ({
      ideaId:    idea._id,
      ideaTitle: idea.title,
      domain:    idea.domain,
      stage:     idea.stage,
      likeCount: idea.likes?.length || 0,
      likedBy:   (idea.likes || []).map(investor => ({
        investorId:   investor._id,
        investorName: investor.name,
        investorEmail:investor.email,
      })),
    }));

    // Overall stats
    const totalLikes     = feedback.reduce((sum, f) => sum + f.likeCount, 0);
    const mostLikedIdea  = [...feedback].sort((a, b) => b.likeCount - a.likeCount)[0] || null;

    // Domain breakdown of likes
    const domainLikes = {};
    feedback.forEach(f => {
      domainLikes[f.domain] = (domainLikes[f.domain] || 0) + f.likeCount;
    });
    const likesByDomain = Object.entries(domainLikes).map(([domain, likes]) => ({ domain, likes }));

    // Stage breakdown of likes
    const stageLikes = {};
    feedback.forEach(f => {
      stageLikes[f.stage] = (stageLikes[f.stage] || 0) + f.likeCount;
    });
    const likesByStage = Object.entries(stageLikes).map(([stage, likes]) => ({ stage, likes }));

    // Unique investors who liked at least one idea
    const allInvestorIds = new Set();
    feedback.forEach(f => f.likedBy.forEach(inv => allInvestorIds.add(inv.investorId.toString())));
    const uniqueInvestors = allInvestorIds.size;

    res.json({
      feedback,
      stats: {
        totalLikes,
        uniqueInvestors,
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

module.exports = router;
