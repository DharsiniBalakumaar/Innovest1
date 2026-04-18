const express  = require("express");
const router   = express.Router();
const axios    = require("axios");
const Idea     = require("../models/idea");
const User     = require("../models/user");
const Message  = require("../models/message");
const protect  = require("../middleware/authMiddleware");

// ── Investor-only guard ──
const investorOnly = (req, res, next) => {
  if (req.user.role !== "investor") {
    return res.status(403).json({ message: "Investors only" });
  }
  next();
};

// ── Messages ──
router.get("/my-messages", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
    })
      .populate("sender",   "name role")
      .populate("receiver", "name role")
      .populate("ideaId",   "title")
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});

router.post("/send-message", protect, async (req, res) => {
  try {
    const { ideaId, receiverId, content } = req.body;
    const msg = new Message({ ideaId, sender: req.user.id, receiver: receiverId, content });
    await msg.save();

    // Touch lastActivityAt so this idea is never wrongly expired
    Idea.findByIdAndUpdate(ideaId, { lastActivityAt: new Date() }).catch((err) =>
      console.error("Failed to update lastActivityAt:", err.message)
    );

    res.json({ success: true, message: "Message sent internally!" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

// ==============================
// GET ALL IDEAS — includes budget info
// ==============================
router.get("/ideas", protect, investorOnly, async (req, res) => {
  try {
    const { domain, stage, search } = req.query;
    const query = {};

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

    const investorId = req.user.id;
    const enriched   = ideas.map((idea) => {
      const obj            = idea.toObject();
      obj.likeCount        = idea.likes?.length || 0;
      obj.likedByMe        = idea.likes?.map((id) => id.toString()).includes(investorId.toString());
      obj.budget           = idea.budget         || 0;
      obj.currentFunding   = idea.currentFunding  || 0;
      obj.isGoalReached    = idea.isGoalReached   || false;
      obj.fundingProgress  = obj.budget > 0
        ? Math.min(100, Math.round((obj.currentFunding / obj.budget) * 100))
        : 0;
      return obj;
    });

    res.json(enriched);
  } catch (err) {
    console.error("Fetch ideas error:", err.message);
    res.status(500).json({ message: "Failed to fetch ideas" });
  }
});

// ==============================
// TOGGLE LIKE
// ==============================
router.post("/like/:ideaId", protect, investorOnly, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.ideaId).populate("innovatorId", "name email phone");
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const investorId   = req.user.id.toString();
    const alreadyLiked = idea.likes?.map((id) => id.toString()).includes(investorId);

    let firstLike = false;

    if (alreadyLiked) {
      // Unlike — still touch activity so an engaged idea isn't penalised
      idea.likes = idea.likes.filter((id) => id.toString() !== investorId);
      idea.lastActivityAt = new Date();
    } else {
      firstLike = (idea.likes?.length || 0) === 0;
      if (!idea.likes) idea.likes = [];
      idea.likes.push(investorId);

      // Touch activity on like
      idea.lastActivityAt = new Date();

      const conversationId = [
        req.params.ideaId,
        investorId,
        idea.innovatorId._id.toString(),
      ].sort().join("_");

      const existingWelcome = await Message.findOne({ conversationId, messageType: "system" });

      if (!existingWelcome) {
        const welcomeMessage = new Message({
          conversationId,
          ideaId:      idea._id,
          sender:      req.user.id,
          receiver:    idea.innovatorId._id,
          content:     `👋 ${req.user.name} (Investor) has liked your idea "${idea.title}" and is interested in learning more. Say hello!`,
          messageType: "system",
          isRead:      false,
        });
        await welcomeMessage.save();
      }
    }

    await idea.save();

    res.json({
      liked:     !alreadyLiked,
      likeCount: idea.likes.length,
      firstLike: firstLike && !alreadyLiked,
    });
  } catch (err) {
    console.error("Like error:", err.message);
    res.status(500).json({ message: "Like failed" });
  }
});

// ==============================
// AI ANALYSIS
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
      relationships:          5,
      funding_rounds:         idea.stage === "Live" ? 2 : 1,
      funding_total_usd:      fundingMap[idea.stage] || 50000,
      milestones:             milestoneMap[idea.stage] || 1,
      is_CA:                  0,
      is_web:                 ["AI", "Edtech", "Fintech", "Healthcare"].includes(idea.domain) ? 1 : 0,
      founded_year:           new Date().getFullYear(),
      stage:                  idea.stage  || "Idea",
      domain:                 idea.domain || "General",
    };

    const pythonResponse = await axios.post(
      "http://127.0.0.1:8000/predict",
      aiInput,
      { proxy: false, timeout: 60000, headers: { "Content-Type": "application/json" } }
    );

    res.json(pythonResponse.data);
  } catch (err) {
    console.error("AI error:", err.message);
    res.status(500).json({ message: "AI Prediction failed.", error: err.response?.data || err.message });
  }
});

// ==============================
// INVESTOR DASHBOARD STATS
// ==============================
router.get("/dashboard-stats", protect, investorOnly, async (req, res) => {
  try {
    const investorId = req.user.id;
    const allIdeas   = await Idea.find().populate("innovatorId", "name");

    const total     = allIdeas.length;
    const likedByMe = allIdeas.filter((i) =>
      i.likes?.map((id) => id.toString()).includes(investorId.toString())
    ).length;

    const domainMap = {};
    allIdeas.forEach((i) => { const d = i.domain || "Other"; domainMap[d] = (domainMap[d] || 0) + 1; });
    const ideasByDomain = Object.entries(domainMap).map(([domain, count]) => ({ domain, count }));

    const stageMap = {};
    allIdeas.forEach((i) => { const s = i.stage || "Unknown"; stageMap[s] = (stageMap[s] || 0) + 1; });
    const ideasByStage = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }));

    const topLiked = allIdeas
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      .slice(0, 5)
      .map((i) => ({ title: i.title, likes: i.likes?.length || 0, domain: i.domain }));

    const totalFundingNeeded   = allIdeas.reduce((s, i) => s + (i.budget || 0), 0);
    const totalFundingRaised   = allIdeas.reduce((s, i) => s + (i.currentFunding || 0), 0);
    const ideasWithGoalReached = allIdeas.filter((i) => i.isGoalReached).length;

    res.json({
      total,
      likedByMe,
      ideasByDomain,
      ideasByStage,
      topLiked,
      totalFundingNeeded,
      totalFundingRaised,
      ideasWithGoalReached,
    });
  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

router.post("/contact-innovator", protect, async (req, res) => {
  try {
    const { ideaId, innovatorId, text } = req.body;
    const msg = new Message({
      ideaId,
      sender:   req.user.id,
      receiver: innovatorId,
      content:  text,
    });
    await msg.save();

    // Touch lastActivityAt so this idea is never wrongly expired
    Idea.findByIdAndUpdate(ideaId, { lastActivityAt: new Date() }).catch((err) =>
      console.error("Failed to update lastActivityAt:", err.message)
    );

    res.json({ success: true, message: "Message sent to innovator's portal!" });
  } catch (err) {
    console.error("Contact innovator error:", err.message);
    res.status(500).json({ message: "Failed to send message" });
  }
});

module.exports = router;