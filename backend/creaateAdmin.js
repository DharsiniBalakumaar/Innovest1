const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("./models/user");

// 🔑 CHANGE THESE VALUES
const ADMIN_EMAIL = "admin@innovest.com";
const ADMIN_PASSWORD = "admin123";

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log("❌ Admin already exists");
      return process.exit();
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = new User({
      name: "Admin",
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      status: "approved",
    });

    await admin.save();
    console.log("✅ Admin user created successfully");

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAdmin();
