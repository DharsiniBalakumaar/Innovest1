// backend/routes/messageRoutes.js
const express  = require("express");
const router   = express.Router();
const Message  = require("../models/message");
const Idea     = require("../models/idea");
const protect  = require("../middleware/authMiddleware");

// ── helper: build a stable conversation ID from two user IDs + idea ID ──
const buildConvId = (ideaId, uid1, uid2) =>
  [ideaId.toString(), uid1.toString(), uid2.toString()].sort().join("_");

// ==============================
// GET /api/messages/threads
// Returns one entry per unique conversation the user is part of
// ==============================
router.get("/threads", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // find all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender",   "name role")
      .populate("receiver", "name role")
      .populate("ideaId",   "title domain stage")
      .sort({ createdAt: -1 });

    // group into threads keyed by conversationId
    const threadMap = {};
    messages.forEach((msg) => {
      const cid = msg.conversationId;
      if (!threadMap[cid]) {
        // other party
        const other =
          msg.sender._id.toString() === userId.toString()
            ? msg.receiver
            : msg.sender;

        threadMap[cid] = {
          conversationId: cid,
          ideaId:    msg.ideaId?._id,
          ideaTitle: msg.ideaId?.title || "Unknown idea",
          ideaDomain:msg.ideaId?.domain,
          ideaStage: msg.ideaId?.stage,
          otherUser: { _id: other._id, name: other.name, role: other.role },
          lastMessage: msg.content,
          lastAt:      msg.createdAt,
          unreadCount: 0,
          messages: [],
        };
      }
      // count unread messages sent to me
      if (!msg.isRead && msg.receiver._id.toString() === userId.toString()) {
        threadMap[cid].unreadCount++;
      }
    });

    res.json(Object.values(threadMap));
  } catch (err) {
    console.error("Threads error:", err.message);
    res.status(500).json({ message: "Failed to load threads" });
  }
});

// ==============================
// GET /api/messages/conversation/:conversationId
// Returns all messages in a thread
// ==============================
router.get("/conversation/:conversationId", protect, async (req, res) => {
  try {
    const msgs = await Message.find({
      conversationId: req.params.conversationId,
    })
      .populate("sender",   "name role")
      .populate("receiver", "name role")
      .sort({ createdAt: 1 });

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: "Failed to load conversation" });
  }
});

// ==============================
// POST /api/messages/send
// Send a message — creates conversation ID if new
// ==============================
router.post("/send", protect, async (req, res) => {
  try {
    const { ideaId, receiverId, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Empty message" });

    const conversationId = buildConvId(ideaId, req.user.id, receiverId);

    const msg = await Message.create({
      conversationId,
      ideaId,
      sender:   req.user.id,
      receiver: receiverId,
      content:  content.trim(),
    });

    const populated = await msg.populate([
      { path: "sender",   select: "name role" },
      { path: "receiver", select: "name role" },
      { path: "ideaId",   select: "title" },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    console.error("Send error:", err.message);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// ==============================
// PUT /api/messages/mark-read/:conversationId
// Mark all messages in a thread as read for the current user
// ==============================
router.put("/mark-read/:conversationId", protect, async (req, res) => {
  try {
    await Message.updateMany(
      { conversationId: req.params.conversationId, receiver: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark read" });
  }
});

// ==============================
// GET /api/messages/unread-count
// Returns total unread message count for the current user
// ==============================
router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      isRead: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Failed to count unread" });
  }
});

// ==============================
// GET /api/messages/nudge-check
// Returns threads that have gone silent for > 48 hours
// (no reply from the OTHER person after your last message)
// ==============================
router.get("/nudge-check", protect, async (req, res) => {
  try {
    const userId   = req.user.id;
    const cutoff   = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 h ago

    // Find threads where the user sent the last message before the cutoff
    // and got no reply since
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("ideaId", "title")
      .sort({ createdAt: -1 });

    const threadLatest = {};
    messages.forEach((msg) => {
      const cid = msg.conversationId;
      if (!threadLatest[cid]) threadLatest[cid] = { lastMsg: msg, otherReplied: false };
      // if other person sent a message after our last message, they replied
      if (
        msg.sender.toString() !== userId.toString() &&
        msg.createdAt > threadLatest[cid].lastMsg.createdAt
      ) {
        threadLatest[cid].otherReplied = true;
      }
    });

    const silentThreads = Object.values(threadLatest).filter(
      ({ lastMsg, otherReplied }) =>
        lastMsg.sender.toString() === userId.toString() &&  // I sent last
        !otherReplied &&                                    // no reply
        lastMsg.createdAt < cutoff                         // over 48h ago
    ).map(({ lastMsg }) => ({
      conversationId: lastMsg.conversationId,
      ideaTitle:      lastMsg.ideaId?.title || "Unknown",
      lastSentAt:     lastMsg.createdAt,
      hoursSince:     Math.floor((Date.now() - lastMsg.createdAt) / 3_600_000),
    }));

    res.json(silentThreads);
  } catch (err) {
    res.status(500).json({ message: "Failed to check nudges" });
  }
});

// POST /api/messages/not-interested
// Sends a polite decline message from the current user to the other party
router.post("/not-interested", protect, async (req, res) => {
  try {
    const { conversationId, ideaId, receiverId, ideaTitle } = req.body;

    const content = `Thank you for reaching out regarding "${ideaTitle}". After careful consideration, I'm not interested in pursuing this further at this time. I wish you all the best with your venture.`;

    const msg = await Message.create({
      conversationId,
      ideaId,
      sender:   req.user.id,
      receiver: receiverId,
      content,
      messageType: "system",
    });

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error("Not interested error:", err.message);
    res.status(500).json({ message: "Failed to send decline message" });
  }
});

// POST /api/messages/not-interested/:conversationId
router.post("/not-interested/:conversationId", protect, async (req, res) => {
  try {
    const msg = await Message.findOne({ 
      conversationId: req.params.conversationId 
    }).populate("sender receiver", "name");

    if (!msg) return res.status(404).json({ message: "Conversation not found" });

    // figure out who the other party is
    const receiverId = msg.sender._id.toString() === req.user.id.toString()
      ? msg.receiver._id
      : msg.sender._id;

    await Message.create({
      conversationId: req.params.conversationId,
      ideaId:         msg.ideaId,
      sender:         req.user.id,
      receiver:       receiverId,
      content:        `👋 ${req.user.name} is not interested in pursuing this conversation further.`,
      messageType:    "system",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Not interested error:", err.message);
    res.status(500).json({ message: "Failed to send" });
  }
});

module.exports = router;