import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import "./config/env.js";

const createTestStudent = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "student@test.com";
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("❌ Student already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("student123", 10);

    const student = await User.create({
      name: "Test Student",
      email,
      password: hashedPassword,
      role: "student",
      isVerified: true,
      profileCompleted: true
    });

    // Create a mock professor too for simulation
    const profEmail = "prof@test.com";
    const existingProf = await User.findOne({ email: profEmail });
    if (!existingProf) {
      const hashedProfPassword = await bcrypt.hash("prof123", 10);
      await User.create({
        name: "Test Prof",
        email: profEmail,
        password: hashedProfPassword,
        role: "professor",
        isVerified: true,
        profileCompleted: true,
        rating: 4.5,
        headline: "Expert Tutor"
      });
      console.log("✅ Prof created successfully");
    }

    console.log("✅ Student created successfully");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createTestStudent();
