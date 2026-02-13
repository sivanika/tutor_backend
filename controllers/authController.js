import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// ================= REGISTER =================
export const registerUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role,
      profileCompleted: false,
      isVerified: false,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      profileCompleted: user.profileCompleted,
      isVerified: user.isVerified,
      token,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
};

// ================= LOGIN =================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("LOGIN REQUEST:", email, password);

    const user = await User.findOne({ email });
    console.log("USER FOUND:", user);

    if (!user) {
      console.log("❌ User not found");
      return res.status(400).json({ message: "User not found" });
    }

    console.log("Stored password hash:", user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      console.log("❌ Password incorrect");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    console.log("LOGIN USER:", {
      id: user._id,
      role: user.role,
      profileCompleted: user.profileCompleted,
    });

    console.log("✅ Login success");

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (error) {
    console.error("🔥 LOGIN ERROR:", error);
    res.status(500).json({ message: "Login server error" });
  }
};
