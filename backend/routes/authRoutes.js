const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

/* ---------- MULTER CONFIG ---------- */
const storage = multer.diskStorage({
  // Ensure this folder exists in your backend root
  destination: "uploads/", 
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

/* ---------- REGISTER ---------- */
router.post("/register", upload.single("identityProof"), async (req, res) => {
  try {
    const { email, password, name, role, phone, linkedin } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // USE CASE: If the user was rejected, delete them to allow a fresh start
      if (existingUser.status === "rejected") {
        await User.deleteOne({ _id: existingUser._id });
        console.log(`Deleted rejected user: ${email} for re-registration.`);
      } else {
        // USE CASE: User is either approved or still pending
        return res.status(400).json({ 
          message: "This email is already registered. Please login or wait for approval." 
        });
      }
    }

    // 2. Check if file was actually uploaded
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an identity proof file." });
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create and Save User
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      linkedin,
      documents: {
        identityProof: req.file.filename,
      },
    });

    await user.save();

    res.status(201).json({
      message: "Registration successful. Awaiting admin approval.",
    });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Internal Server Error: " + err.message });
  }
});

/* ---------- LOGIN ---------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Ensure they are approved
    if (user.status !== "approved") {
      return res.status(403).json({ message: "Your account is not approved yet." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;