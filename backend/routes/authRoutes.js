const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const client = require('../config/otpConfig');

const router = express.Router();
let otpStore = {};
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
// 1. SEND OTP (Finds phone by email)
router.post('/forgot-password-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });
        if (!user.phone) return res.status(400).json({ message: "No phone number linked" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP against EMAIL to keep it consistent with the frontend
        otpStore[email] = { otp, expires: Date.now() + 300000 };

        const formattedPhone = user.phone.startsWith('+') ? user.phone : `+91${user.phone}`;

        await client.messages.create({
            body: `Your Innovest reset code is ${otp}.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
        });

        res.json({ message: `OTP sent to number ending in ${user.phone.slice(-4)}` });
    } catch (err) {
        res.status(500).json({ message: "SMS Error", error: err.message });
    }
});

// 2. VERIFY OTP & UPDATE DB
router.post('/reset-password-otp', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const entry = otpStore[email];

        if (!entry || entry.otp !== otp || entry.expires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Hash the new password before saving!
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.findOneAndUpdate({ email }, { password: hashedPassword });

        delete otpStore[email]; // Clear OTP after success
        res.json({ message: "Password updated successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Database Error", error: err.message });
    }
});

module.exports = router;