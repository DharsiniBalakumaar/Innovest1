const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["innovator", "investor"],
      required: true,
    },
    phone: { type: String, required: true },
    linkedin: { type: String },
    documents: {
      identityProof: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // ── ADDED: Notification Array ──
    notifications: [
      {
        message: { type: String, required: true },
        ideaTitle: { type: String },
        createdAt: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);