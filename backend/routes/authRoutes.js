const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.post('/register', upload.single('kyc'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      kycDocument: req.file.path
    });

    await user.save();
    res.status(201).json({ message: 'Registration successful. Await approval.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
