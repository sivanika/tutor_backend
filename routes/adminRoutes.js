import express from "express";
import User from "../models/User.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import AdminLog from "../models/AdminLog.js";
import { sendApprovalMail } from "../utils/sendEmail.js";
import bcrypt from "bcryptjs";

const router = express.Router();

/* ============================
   GET PENDING PROFESSORS
============================ */
router.get("/pending-professors", protect, adminOnly, async (req, res) => {
  try {
    const professors = await User.find({
      role: "professor",
      isVerified: false,
    }).select("-password");

    res.json(professors);
  } catch (err) {
    console.error("ADMIN FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to load professors" });
  }
});

/* ============================
   GET VERIFIED PROFESSORS
============================ */
router.get("/verified-professors", protect, adminOnly, async (req, res) => {
  try {
    const professors = await User.find({
      role: "professor",
      isVerified: true,
    }).select("-password");

    res.json(professors);
  } catch (err) {
    res.status(500).json({ message: "Failed to load verified professors" });
  }
});

/* ============================
   VERIFY PROFESSOR
============================ */
router.put("/verify/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.role !== "professor") {
      return res.status(404).json({ message: "Professor not found" });
    }

    user.isVerified = true;
    await user.save();

    await sendApprovalMail(user.email, user.name);

    res.json({ success: true, message: "Professor verified successfully" });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

/* ============================
   APPROVE PROFESSOR (ALIAS)
============================ */
router.put("/approve-professor/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.role !== "professor") {
      return res.status(404).json({ message: "Professor not found" });
    }

    user.isVerified = true;
    await user.save();

    await sendApprovalMail(user.email, user.name);

    res.json({ success: true, message: "Professor approved successfully" });
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(500).json({ message: "Approval failed" });
  }
});

/* ============================
   GET ALL USERS (ORIGINAL)
============================ */
router.get("/all-users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to load users" });
  }
});

/* ============================
   GET USERS (FRONTEND ROUTE)
============================ */
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to load users" });
  }
});

/* ============================
   GET ADMIN LOGS
============================ */
router.get("/logs", protect, adminOnly, async (req, res) => {
  try {
    const logs = await AdminLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Failed to load logs" });
  }
});

/* ============================
   ADMIN ANALYTICS (ORIGINAL)
============================ */
router.get("/analytics", protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalProfessors = await User.countDocuments({ role: "professor" });
    const verifiedProfessors = await User.countDocuments({
      role: "professor",
      isVerified: true,
    });
    const pendingProfessors = await User.countDocuments({
      role: "professor",
      isVerified: false,
    });

    res.json({
      totalUsers,
      totalStudents,
      totalProfessors,
      verifiedProfessors,
      pendingProfessors,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load analytics" });
  }
});

/* ============================
   ANALYTICS CHARTS (FRONTEND)
============================ */
router.get("/analytics-charts", protect, adminOnly, async (req, res) => {
  try {
    const students = await User.countDocuments({ role: "student" });
    const professors = await User.countDocuments({ role: "professor" });

    res.json({
      labels: ["Students", "Professors"],
      data: [students, professors],
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load chart data" });
  }
});

/* ============================
   UPDATE ADMIN PROFILE
============================ */
router.put("/update-profile", protect, adminOnly, async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin = await User.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    admin.name = name || admin.name;
    admin.email = email || admin.email;
    await admin.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" });
  }
});

/* ============================
   CHANGE ADMIN PASSWORD
============================ */
router.put("/change-password", protect, adminOnly, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const admin = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password incorrect" });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to change password" });
  }
});
/* ============================
   UPDATE USER STATUS
============================ */
router.put("/user-status/:id", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = status;
    await user.save();

    // optional: log action
    await AdminLog.create({
      admin: req.user.id,
      action: `Changed user status to ${status}`,
      targetUser: user._id,
    });

    res.json({ message: "User status updated", user });
  } catch (err) {
    console.error("STATUS UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

export default router;
