// backend/models/message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  ideaId:   { type: mongoose.Schema.Types.ObjectId, ref: "Idea", required: true },
  sender:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content:  { type: String, required: true },
  isRead:   { type: Boolean, default: false },
  messageType: { type: String, enum: ["text", "system", "not-interested"], default: "text", },
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);