const express = require("express");
const router = express.Router();
const axios = require("axios");
const Idea = require("../models/idea"); 
const protect = require("../middleware/authMiddleware");

router.post("/upload-idea", protect, async (req, res) => {
  console.log("Received idea upload request:", req.body); // Debug log
  try {
    const { title, domain, problem, solution, market, revenue, stage } = req.body;

    console.log("Extracted fields:", { title, domain, problem, solution }); // Debug log

    // STEP 1 — CALL PYTHON SBERT SERVICE
    const duplicateCheck = await axios.post(
      "http://127.0.0.1:8001/check-duplicate",
      { title, problem, solution },
      {
        proxy: false,        // 🔥 THIS FIXES IT
        timeout: 60000
      }
    );

    console.log("Duplicate check response:", duplicateCheck.data); // Debug log

    if (duplicateCheck.data.duplicate) {
      return res.status(400).json({
        message: `Similar idea found: "${duplicateCheck.data.existing_title}"`,
        similarity: duplicateCheck.data.similarity
      });
    }

    // STEP 2 — SAVE IDEA IF NO DUPLICATE
    const newIdea = new Idea({
      innovatorId: req.user.id,
      title,
      domain,
      problem,
      solution,
      market,
      revenue,
      stage,
    });

    const savedIdea = await newIdea.save();
    res.status(201).json(savedIdea);

  } catch (err) {
    console.error("Upload Error Full:", {
    message: err.message,
    status: err.response?.status,
    data: err.response?.data,
    code: err.code
  });
    if (!res.headersSent) {
      // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: `An idea with this title already exists.` 
      });
    }
    // Handle SBERT service duplicate detection
    if (err.response?.status === 400) {
      return res.status(400).json(err.response.data);
    }
    res.status(500).json({ message: err.message });
    }
  }
});


router.get("/my-ideas", protect, async (req, res) => {
  try {
    const ideas = await Idea.find({
      innovatorId: req.user.id, // ✅ JWT user id
    }).sort({ createdAt: -1 });

    res.status(200).json(ideas);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ideas" });
  }
});

router.put("/update-idea/:id", protect, async (req, res) => {
  try {
    const updatedIdea = await Idea.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedIdea);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// 🤖 UPDATE THIS ROUTE IN YOUR BACKEND innovatorRoutes.js
router.post("/analyze-idea", protect, async (req, res) => {
  try {
    const { ideaId } = req.body;

    const idea = await Idea.findById(ideaId);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    const aiInput = {
      age_first_funding_year: 1.0,
      age_last_funding_year: 2.0,
      relationships: 5,
      funding_rounds: 1,
      funding_total_usd: 500000,
      milestones: idea.stage === "Prototype" || idea.stage === "MVP" ? 2 : 1,
      is_CA: 1,
      is_web: ["AI", "Edtech", "Fintech"].includes(idea.domain) ? 1 : 0,
      founded_year: new Date().getFullYear()
    };

    const pythonURL = "http://127.0.0.1:8000/predict";

    console.log("Sending to AI:", aiInput);

    const pythonResponse = await axios.post(
    pythonURL,
    aiInput,
    {
      proxy: false,
      timeout: 60000
    }
    );


    res.json(pythonResponse.data);

  } catch (err) {
    console.error("AI Service Error Details:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });

    res.status(500).json({
      message: "AI Prediction Service failed.",
      error: err.response?.data || err.message
    });
  }
});


module.exports = router;