const mongoose = require("mongoose");

const IdeaSchema = new mongoose.Schema({
  innovatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:    { type: String, required: true, unique: true },
  domain:   { type: String, required: true },
  problem:  { type: String },
  solution: { type: String },
  market:   { type: String },
  revenue:  { type: String },
  stage:    { type: String },

  // Budget & Funding
  budget:            { type: Number, default: 0 },
  currentFunding:    { type: Number, default: 0 },
  isGoalReached:     { type: Boolean, default: false },
  funding_total_usd: { type: Number, default: 0 },

  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

}, { timestamps: true });

// Fast per-innovator queries
IdeaSchema.index({ innovatorId: 1, createdAt: -1 });

// NOTE: No TTL index. No auto-deletion. Ideas persist indefinitely
// unless manually deleted by the innovator via the delete route.

module.exports = mongoose.model("Idea", IdeaSchema);