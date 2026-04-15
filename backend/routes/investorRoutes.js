const express = require("express");
const router = express.Router();
const axios = require("axios");
const Idea = require("../models/idea");
const User = require("../models/user");
const Message = require("../models/message");
const protect = require("../middleware/authMiddleware");


// ── Investor-only guard ──
const investorOnly = (req, res, next) => {
  if (req.user.role !== "investor") {
    return res.status(403).json({ message: "Investors only" });
  }
  next();
};

// Get messages for the logged-in user (works for both Innovator and Investor)
router.get("/my-messages", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    })
    .populate("sender", "name role")
    .populate("receiver", "name role")
    .populate("ideaId", "title")
    .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// Internal send (No SMS/External API)
router.post("/send-message", protect, async (req, res) => {
  try {
    const { ideaId, receiverId, content } = req.body;
    const msg = new Message({
      ideaId,
      sender: req.user.id,
      receiver: receiverId,
      content
    });
    await msg.save();
    res.json({ success: true, message: "Message sent internally!" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

// ==============================
// GET ALL APPROVED IDEAS (with innovator info)
// Supports ?domain=AI&stage=MVP&search=keyword
// ==============================
router.get("/ideas", protect, investorOnly, async (req, res) => {
  try {
    const { domain, stage, search } = req.query;

    let query = {};

    if (domain && domain !== "All") query.domain = domain;
    if (stage && stage !== "All") query.stage = stage;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { problem: { $regex: search, $options: "i" } },
        { solution: { $regex: search, $options: "i" } },
      ];
    }

    const ideas = await Idea.find(query)
      .populate("innovatorId", "name email linkedin")
      .sort({ createdAt: -1 });

    // Attach like count + whether current investor has liked each idea
    const investorId = req.user.id;
    const enriched = ideas.map((idea) => {
      const obj = idea.toObject();
      obj.likeCount = idea.likes?.length || 0;
      obj.likedByMe = idea.likes
        ?.map((id) => id.toString())
        .includes(investorId.toString());
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
// ↳ AUTO-SEND SMS & CREATE WELCOME MESSAGE
// ==============================
router.post("/like/:ideaId", protect, investorOnly, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.ideaId).populate(
      "innovatorId",
      "name email phone"
    );
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const investorId = req.user.id.toString();
    const alreadyLiked = idea.likes
      ?.map((id) => id.toString())
      .includes(investorId);

    let likeStatusChanged = false;
    let firstLike = false;

    if (alreadyLiked) {
      // UNLIKE
      idea.likes = idea.likes.filter((id) => id.toString() !== investorId);
      likeStatusChanged = true;
    } else {
      // LIKE — Check if this is the first like from any investor
      firstLike = (idea.likes?.length || 0) === 0;

      if (!idea.likes) idea.likes = [];
      idea.likes.push(investorId);
      likeStatusChanged = true;

      // ════════════════════════════════════════
      // SEND SMS TO INNOVATOR (first like only)
      // ════════════════════════════════════════
      if (firstLike && idea.innovatorId.phone) {
        console.log(`🔔 Sending first-like SMS to ${idea.innovatorId.phone}`);

        const smsResult = await vonageSMS.sendFirstLikeNotification(
          idea.innovatorId.phone,
          req.user.name,
          idea.title
        );

        console.log("SMS Result:", smsResult);
      }

      // ════════════════════════════════════════
      // CREATE WELCOME MESSAGE AUTOMATICALLY
      // ════════════════════════════════════════
      const conversationId = [req.params.ideaId, investorId, idea.innovatorId._id]
        .sort()
        .join("-");

      // Check if welcome message already exists
      const existingWelcome = await Message.findOne({
        conversationId,
        messageType: "system",
      });

      if (!existingWelcome) {
        const welcomeMessage = new Message({
          conversationId,
          ideaId: idea._id,
          ideaTitle: idea.title,
          senderId: investorId,
          senderName: req.user.name,
          senderPhone: req.user.phone,
          senderRole: "investor",
          receiverId: idea.innovatorId._id,
          receiverName: idea.innovatorId.name,
          receiverPhone: idea.innovatorId.phone,
          receiverRole: "innovator",
          messageText: `👋 ${req.user.name} (Investor) has liked your idea "${idea.title}" and is interested in learning more. Say hello!`,
          messageType: "system",
          smsSent: firstLike, // Mark as sent if we sent SMS
          smsStatus: firstLike ? "delivered" : "pending",
        });

        await welcomeMessage.save();
        console.log(`✅ Welcome message created for conversation:`, conversationId);
      }
    }

    if (likeStatusChanged) {
      await idea.save();
    }

    res.json({
      liked: !alreadyLiked,
      likeCount: idea.likes.length,
      firstLike: firstLike && !alreadyLiked, // Indicates if SMS was sent
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
    const fundingMap = {
      Idea: 50000,
      Prototype: 200000,
      MVP: 500000,
      Live: 1500000,
    };

    const aiInput = {
      age_first_funding_year: 1.0,
      age_last_funding_year: 2.0,
      relationships: 5,
      funding_rounds: idea.stage === "Live" ? 2 : 1,
      funding_total_usd: fundingMap[idea.stage] || 50000,
      milestones: milestoneMap[idea.stage] || 1,
      is_CA: 0,
      is_web: ["AI", "Edtech", "Fintech", "Healthcare"].includes(
        idea.domain
      )
        ? 1
        : 0,
      founded_year: new Date().getFullYear(),
      stage: idea.stage || "Idea",
      domain: idea.domain || "General",
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

    const total = allIdeas.length;
    const likedByMe = allIdeas
      .filter((i) =>
        i.likes
          ?.map((id) => id.toString())
          .includes(investorId.toString())
      ).length;

    // Domain breakdown
    const domainMap = {};
    allIdeas.forEach((i) => {
      const d = i.domain || "Other";
      domainMap[d] = (domainMap[d] || 0) + 1;
    });
    const ideasByDomain = Object.entries(domainMap).map(([domain, count]) => ({
      domain,
      count,
    }));

    // Stage breakdown
    const stageMap = {};
    allIdeas.forEach((i) => {
      const s = i.stage || "Unknown";
      stageMap[s] = (stageMap[s] || 0) + 1;
    });
    const ideasByStage = Object.entries(stageMap).map(([stage, count]) => ({
      stage,
      count,
    }));

    // Top liked ideas (most likes overall)
    const topLiked = allIdeas
      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
      .slice(0, 5)
      .map((i) => ({ title: i.title, likes: i.likes?.length || 0, domain: i.domain }));

    res.json({ total, likedByMe, ideasByDomain, ideasByStage, topLiked });
  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

router.post("/contact-innovator", protect, async (req, res) => {
  const { ideaId, innovatorId, text } = req.body;
  const msg = new Message({
    ideaId,
    sender: req.user.id,
    receiver: innovatorId,
    content: text
  });
  await msg.save();
  res.json({ success: true, message: "Message sent to innovator's portal!" });
});

module.exports = router;
