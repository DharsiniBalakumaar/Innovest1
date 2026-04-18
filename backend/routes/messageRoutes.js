// backend/routes/messageRoutes.js
const express  = require("express");
const router   = express.Router();
const Message  = require("../models/message");
const Idea     = require("../models/idea");
const protect  = require("../middleware/authMiddleware");

const buildConvId = (ideaId, uid1, uid2) =>
  [ideaId.toString(), uid1.toString(), uid2.toString()].sort().join("_");

// ==============================
// GET /api/messages/threads
// ==============================
router.get("/threads", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender",   "name role")
      .populate("receiver", "name role")
      .populate("ideaId",   "title domain stage")
      .sort({ createdAt: -1 });

    const threadMap = {};
    messages.forEach((msg) => {
      const cid = msg.conversationId;
      if (!cid) return;

      if (!threadMap[cid]) {
        const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
        const other =
          senderId === userId.toString() ? msg.receiver : msg.sender;

        threadMap[cid] = {
          conversationId: cid,
          ideaId:     msg.ideaId?._id || null,
          ideaTitle:  msg.ideaId?.title || "Unknown idea",
          ideaDomain: msg.ideaId?.domain,
          ideaStage:  msg.ideaId?.stage,
          otherUser:  other
            ? { _id: other._id, name: other.name, role: other.role }
            : { _id: null, name: "Unknown", role: "unknown" },
          lastMessage: msg.content,
          lastAt:      msg.createdAt,
          unreadCount: 0,
          isBlocked:   false,
        };
      }

      if (msg.messageType === "not-interested") {
        threadMap[cid].isBlocked = true;
      }

      const receiverId = msg.receiver?._id?.toString() || msg.receiver?.toString();
      if (!msg.isRead && receiverId === userId.toString()) {
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
    console.error("Conversation fetch error:", err.message);
    res.status(500).json({ message: "Failed to load conversation" });
  }
});

// ==============================
// POST /api/messages/send
// ==============================
router.post("/send", protect, async (req, res) => {
  try {
    const { ideaId, receiverId, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Empty message" });
    if (!ideaId)          return res.status(400).json({ message: "ideaId is required" });
    if (!receiverId)      return res.status(400).json({ message: "receiverId is required" });

    const conversationId = buildConvId(ideaId, req.user.id, receiverId);

    const blocked = await Message.findOne({
      conversationId,
      messageType: "not-interested",
    });
    if (blocked) {
      return res.status(403).json({ message: "This conversation has been closed." });
    }

    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const duplicate = await Message.findOne({
      conversationId,
      sender:    req.user.id,
      content:   content.trim(),
      createdAt: { $gte: fiveSecondsAgo },
    });
    if (duplicate) {
      const populated = await duplicate.populate([
        { path: "sender",   select: "name role" },
        { path: "receiver", select: "name role" },
        { path: "ideaId",   select: "title" },
      ]);
      return res.status(200).json(populated);
    }

    const msg = await Message.create({
      conversationId,
      ideaId,
      sender:   req.user.id,
      receiver: receiverId,
      content:  content.trim(),
      isRead:   false,
    });

    // Fire-and-forget: reset inactivity timer
    Idea.findByIdAndUpdate(ideaId, { lastActivityAt: new Date() }).catch((err) =>
      console.error("Failed to update lastActivityAt:", err.message)
    );

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
// ==============================
router.put("/mark-read/:conversationId", protect, async (req, res) => {
  try {
    await Message.updateMany(
      { conversationId: req.params.conversationId, receiver: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Mark-read error:", err.message);
    res.status(500).json({ message: "Failed to mark read" });
  }
});

// ==============================
// GET /api/messages/unread-count
// ==============================
router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      isRead:   false,
    });
    res.json({ count });
  } catch (err) {
    console.error("Unread-count error:", err.message, err);
    res.status(500).json({ message: "Failed to count unread", error: err.message });
  }
});

// ==============================
// GET /api/messages/nudge-check
// ==============================
router.get("/nudge-check", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("ideaId", "title")
      .sort({ createdAt: -1 });

    const threadLatest = {};
    messages.forEach((msg) => {
      const cid = msg.conversationId;
      if (!cid) return;
      if (!threadLatest[cid]) {
        threadLatest[cid] = { lastMsg: msg, otherReplied: false };
      }
      const senderId = msg.sender?.toString();
      if (
        senderId !== userId.toString() &&
        msg.createdAt > threadLatest[cid].lastMsg.createdAt
      ) {
        threadLatest[cid].otherReplied = true;
      }
    });

    const silentThreads = Object.values(threadLatest)
      .filter(({ lastMsg, otherReplied }) => {
        const senderId = lastMsg.sender?.toString();
        return (
          senderId === userId.toString() &&
          !otherReplied &&
          lastMsg.createdAt < cutoff
        );
      })
      .map(({ lastMsg }) => ({
        conversationId: lastMsg.conversationId,
        ideaTitle:      lastMsg.ideaId?.title || "Unknown",
        lastSentAt:     lastMsg.createdAt,
        hoursSince:     Math.floor((Date.now() - new Date(lastMsg.createdAt)) / 3_600_000),
      }));

    res.json(silentThreads);
  } catch (err) {
    console.error("Nudge-check error:", err.message);
    res.status(500).json({ message: "Failed to check nudges" });
  }
});

// ==============================
// POST /api/messages/not-interested/:conversationId
// ==============================
router.post("/not-interested/:conversationId", protect, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const alreadyBlocked = await Message.findOne({
      conversationId,
      messageType: "not-interested",
    });
    if (alreadyBlocked) {
      return res.json({ success: true, alreadyBlocked: true });
    }

    let existingMsg = await Message.findOne({ conversationId })
      .populate("sender",   "name _id")
      .populate("receiver", "name _id")
      .populate("ideaId",   "title _id");

    if (!existingMsg) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const senderId    = existingMsg.sender?._id?.toString()   || existingMsg.sender?.toString();
    const receiverId  = existingMsg.receiver?._id?.toString() || existingMsg.receiver?.toString();
    const myId        = req.user.id.toString();
    const otherUserId = senderId === myId ? receiverId : senderId;

    if (!otherUserId) {
      return res.status(500).json({ message: "Could not determine the other user in this conversation." });
    }

    let ideaId    = null;
    let ideaTitle = "this idea";

    if (existingMsg.ideaId) {
      if (typeof existingMsg.ideaId === "object" && existingMsg.ideaId._id) {
        ideaId    = existingMsg.ideaId._id;
        ideaTitle = existingMsg.ideaId.title || "this idea";
      } else {
        ideaId = existingMsg.ideaId;
      }
    }

    if (!ideaId) {
      const mongoose = require("mongoose");
      const segments  = conversationId.split("_");
      const userIds   = [senderId, receiverId].filter(Boolean);
      const candidate = segments.find((seg) => !userIds.includes(seg));
      if (candidate && mongoose.Types.ObjectId.isValid(candidate)) {
        ideaId = new mongoose.Types.ObjectId(candidate);
      }
    }

    if (!ideaId) {
      return res.status(500).json({ message: "Could not resolve ideaId for this conversation." });
    }

    const content = `👋 Not interested in pursuing this conversation further regarding "${ideaTitle}".`;

    await Message.create({
      conversationId,
      ideaId,
      sender:      req.user.id,
      receiver:    otherUserId,
      content,
      messageType: "not-interested",
      isRead:      false,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Not-interested error:", err.message);
    res.status(500).json({ message: "Failed to send not-interested: " + err.message });
  }
});

// ==============================
// GET /api/messages/blocked-ideas
// ==============================
router.get("/blocked-ideas", protect, async (req, res) => {
  try {
    const blocked = await Message.find({
      sender:      req.user.id,
      messageType: "not-interested",
    }).distinct("ideaId");
    res.json(blocked);
  } catch (err) {
    console.error("Blocked-ideas error:", err.message);
    res.status(500).json({ message: "Failed to fetch blocked ideas" });
  }
});

module.exports = router;