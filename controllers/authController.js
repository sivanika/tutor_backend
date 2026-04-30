import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { sendApprovalMail, sendPasswordResetMail } from "../utils/sendEmail.js";

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ================= REGISTER =================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name || "",
      email,
      password: hashedPassword,
      role,
      profileCompleted: false,
      isVerified: false,
    });

    const token = generateToken(user._id, user.role);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // Required for sameSite: "none"
      sameSite: "none", 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
        isVerified: user.isVerified,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionTier: user.subscriptionTier,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Registration failed" });
  }
};

// ================= LOGIN =================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.role);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // Required for sameSite: "none"
      sameSite: "none", 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        profileCompleted: user.profileCompleted,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionTier: user.subscriptionTier,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Login server error" });
  }
};

// ================= FORGOT PASSWORD =================
// Security: We send the RAW token to the user's email, but store
// only its SHA-256 hash in MongoDB.  Even if the database is
// compromised, attackers cannot use the hashed token.
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal whether the email exists in the system
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    // 1️⃣  Generate a cryptographically secure random token (raw)
    const rawToken = crypto.randomBytes(32).toString("hex");

    // 2️⃣  Hash with SHA-256 before saving to DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    // 3️⃣  Build the reset URL with the RAW token (not the hash)
    const baseUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
    const resetLink = `${baseUrl}/reset-password/${rawToken}`;

    try {
      await sendPasswordResetMail(user.email, resetLink);
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      console.error("❌ Email failed — token cleared:", emailError.message);
      
      return res.status(500).json({
        message: "Email sending failed. " + (emailError.message || "Please check your server configuration."),
        errorDetail: emailError.message,
        suggestion: "Ensure your Resend API key is valid and your sender email is verified in the Resend dashboard."
      });
    }

    res.json({ message: "Reset link sent! Please check your inbox (and spam folder)." });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({ message: "Server error", errorDetail: error.message });
  }
};

// ================= RESET PASSWORD =================
// The URL contains the RAW token.  We hash it again with SHA-256
// and look for the matching hash in the DB.
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, newPassword } = req.body;
    const newPass = password || newPassword;

    if (!newPass || newPass.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // 1️⃣  Hash the incoming token the same way we stored it
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // 2️⃣  Find user by hashed token AND check expiry
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // 3️⃣  Set new password (hashed with bcrypt)
    user.password = await bcrypt.hash(newPass, 10);

    // 4️⃣  Clear the reset fields so the token can never be reused
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful! You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGOUT =================
export const logoutUser = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: true,
    sameSite: "none",
  });
  res.json({ message: "Logged out successfully" });
};

// ================= GET ME =================
export const getMe = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        profileCompleted: req.user.profileCompleted,
        isVerified: req.user.isVerified,
        subscriptionStatus: req.user.subscriptionStatus,
        subscriptionTier: req.user.subscriptionTier,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching user" });
  }
};

// ================= GOOGLE LOGIN =================
export const googleLogin = async (req, res) => {
  try {
    const { idToken, role } = req.body;

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      if (!role) {
        return res.status(400).json({ message: "Role is required for new users" });
      }
      user = await User.create({
        name,
        email,
        role,
        isVerified: true, // Google verified emails are trusted
        profileCompleted: false,
        googleId: ticket.getUserId(),
      });
    }

    const token = generateToken(user._id, user.role);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, 
      sameSite: "none", 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        profileCompleted: user.profileCompleted,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionTier: user.subscriptionTier,
      },
    });
  } catch (error) {
    console.error("Google login error:", error.message);
    res.status(500).json({ message: "Google login failed" });
  }
};
