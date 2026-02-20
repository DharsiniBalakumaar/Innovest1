const mongoose = require("mongoose");

const IdeaSchema = new mongoose.Schema({
  innovatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, unique: true },
  domain: { type: String, required: true },
  problem: String,
  solution: String,
  market: String,
  revenue: String,
  stage: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Idea", IdeaSchema);