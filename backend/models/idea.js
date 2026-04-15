const mongoose = require("mongoose");

const IdeaSchema = new mongoose.Schema({
  // Link to the user who created the idea
  innovatorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // Basic Idea Information
  title: { 
    type: String, 
    required: true, 
    unique: true 
  },
  domain: { 
    type: String, 
    required: true 
  },
  problem: { 
    type: String 
  },
  solution: { 
    type: String 
  },
  market: { 
    type: String 
  },
  revenue: { 
    type: String 
  },
  stage: { 
    type: String 
  },

  // Budget and Funding Fields
  // 'budget' is the target goal set by the innovator
  budget: { 
    type: Number, 
    default: 0 
  },
  // 'currentFunding' tracks manual pledges from investors
  currentFunding: { 
    type: Number, 
    default: 0 
  },
  // Tracks if the funding goal was met to trigger the notification logic
  isGoalReached: { 
    type: Boolean, 
    default: false 
  },
  
  // Legacy funding field from your previous version
  funding_total_usd: { 
    type: Number, 
    default: 0 
  },

  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },

  // Array of User IDs who liked the idea
  likes: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }
  ],
});

// TTL Index: Automatically deletes the document 1 hour after 'createdAt'
// Change 3600 to 31536000 for a 1-year duration
IdeaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model("Idea", IdeaSchema);