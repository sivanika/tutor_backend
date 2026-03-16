import express from "express";
import User from "../models/User.js";
import Session from "../models/Session.js";
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

    // Email is best-effort — don't fail the whole request if it errors
    try {
      await sendApprovalMail(user.email, user.name || user.email);
    } catch (mailErr) {
      console.error("Approval email failed (non-fatal):", mailErr.message);
    }

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

    // Email is best-effort — don't fail the whole request if it errors
    try {
      await sendApprovalMail(user.email, user.name || user.email);
    } catch (mailErr) {
      console.error("Approval email failed (non-fatal):", mailErr.message);
    }

    res.json({ success: true, message: "Professor approved successfully" });
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(500).json({ message: "Approval failed" });
  }
});

/* ============================
   REJECT PROFESSOR
============================ */
router.put("/reject-professor/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.role !== "professor") {
      return res.status(404).json({ message: "Professor not found" });
    }

    // Since they are rejecting, we can either disable them or delete them.
    // Usually rejection for pending professors means deleting or setting status to "disabled"
    const email = user.email;
    await User.findByIdAndDelete(req.params.id);

    // log the action
    await AdminLog.create({
      admin: req.user.id,
      action: "Rejected Professor",
      target: `${email} (${req.params.id})`,
      description: "Professor application rejected and deleted",
    });

    res.json({ success: true, message: "Professor rejected and deleted" });
  } catch (err) {
    console.error("REJECT ERROR:", err);
    res.status(500).json({ message: "Rejection failed" });
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
    const verifiedProfessors = await User.countDocuments({ role: "professor", isVerified: true });
    const pendingProfessors = await User.countDocuments({ role: "professor", isVerified: false });
    const totalUsers = students + professors;

    res.json({
      labels: ["Students", "Professors"],
      data: [students, professors],
      totalUsers,
      verifiedProfessors,
      pendingProfessors,
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

    // log the action using the correct schema fields
    await AdminLog.create({
      admin: req.user.id,
      action: `Changed user status to ${status}`,
      target: `${user.email} (${user._id})`,
      description: `Status updated to "${status}" by admin`,
    });

    res.json({ message: "User status updated", user });
  } catch (err) {
    console.error("STATUS UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

/* ============================
   GET ALL VERIFIED PROFESSORS WITH FEATURED STATUS (ADMIN)
============================ */
router.get("/featured-professors", protect, adminOnly, async (req, res) => {
  try {
    const professors = await User.find({
      role: "professor",
      isVerified: true,
    })
      .select("-password")
      .sort({ featuredOrder: 1, name: 1 });
    res.json(professors);
  } catch (err) {
    res.status(500).json({ message: "Failed to load professors" });
  }
});

/* ============================
   TOGGLE FEATURED + SET ORDER (ADMIN)
   PUT /api/admin/feature-professor/:id
   Body: { isFeatured: true/false, featuredOrder: 1 }
============================ */
router.put("/feature-professor/:id", protect, adminOnly, async (req, res) => {
  try {
    const { isFeatured, featuredOrder } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.role !== "professor") {
      return res.status(404).json({ message: "Professor not found" });
    }

    if (typeof isFeatured === "boolean") user.isFeatured = isFeatured;
    if (typeof featuredOrder === "number") user.featuredOrder = featuredOrder;

    await user.save();

    await AdminLog.create({
      admin: req.user.id,
      action: `${isFeatured ? "Featured" : "Unfeatured"} professor`,
      target: `${user.email} (${user._id})`,
      description: `Featured: ${user.isFeatured}, Order: ${user.featuredOrder}`,
    });

    res.json({
      success: true,
      message: `Professor ${user.isFeatured ? "marked as featured" : "removed from featured"}`,
      isFeatured: user.isFeatured,
      featuredOrder: user.featuredOrder,
    });
  } catch (err) {
    console.error("FEATURE PROFESSOR ERROR:", err);
    res.status(500).json({ message: "Failed to update featured status" });
  }
});

/* ============================
   GET ALL STUDENTS (ADMIN)
============================ */
router.get("/students", protect, adminOnly, async (req, res) => {
  try {
    const { search = "", tier = "" } = req.query;
    const query = { role: "student" };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (tier) query.subscriptionTier = tier;

    const students = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (err) {
    console.error("ADMIN STUDENTS ERROR:", err);
    res.status(500).json({ message: "Failed to load students" });
  }
});

/* ============================
   GET SINGLE STUDENT DETAIL
============================ */
router.get("/student/:id", protect, adminOnly, async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select("-password");
    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Failed to load student" });
  }
});

/* ============================
   GET ALL PROFESSORS FULL (ADMIN)
   Includes pending + verified
============================ */
router.get("/professors-full", protect, adminOnly, async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    const query = { role: "professor" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { subjects: { $regex: search, $options: "i" } },
      ];
    }
    if (status === "verified") query.isVerified = true;
    if (status === "pending") query.isVerified = false;

    const professors = await User.find(query)
      .select("-password")
      .sort({ isVerified: -1, createdAt: -1 });

    res.json(professors);
  } catch (err) {
    console.error("ADMIN PROFESSORS FULL ERROR:", err);
    res.status(500).json({ message: "Failed to load professors" });
  }
});

/* ============================
   GET SINGLE PROFESSOR DETAIL
============================ */
router.get("/professor/:id", protect, adminOnly, async (req, res) => {
  try {
    const prof = await User.findById(req.params.id).select("-password");
    if (!prof || prof.role !== "professor") {
      return res.status(404).json({ message: "Professor not found" });
    }
    res.json(prof);
  } catch (err) {
    res.status(500).json({ message: "Failed to load professor" });
  }
});

/* ============================
   GET EARNINGS (ADMIN)
   Calculates per-professor:
   - totalSessions (sessions they created)
   - grossEarning = hourlyRate * totalSessions (estimated)
   - commission = grossEarning * (commissionRate / 100)
   - netPayout = grossEarning - commission
============================ */
router.get("/earnings", protect, adminOnly, async (req, res) => {
  try {

    // Get all verified professors
    const professors = await User.find({ role: "professor", isVerified: true })
      .select("name email subjects hourlyRate commissionRate studentsHelped createdAt")
      .sort({ createdAt: -1 });

    // For each professor, get their session count
    const earningsData = await Promise.all(
      professors.map(async (prof) => {
        const totalSessions = await Session.countDocuments({ professor: prof._id });
        const activeStudents = await Session.aggregate([
          { $match: { professor: prof._id } },
          { $unwind: "$students" },
          { $group: { _id: "$students.student" } },
          { $count: "count" },
        ]);

        const rate = parseFloat(prof.hourlyRate) || 0;
        const commRate = parseFloat(prof.commissionRate) || 18;
        const grossEarning = rate * totalSessions;
        const commission = (grossEarning * commRate) / 100;
        const netPayout = grossEarning - commission;

        return {
          _id: prof._id,
          name: prof.name || "Unknown",
          email: prof.email,
          subjects: prof.subjects || "—",
          hourlyRate: rate,
          commissionRate: commRate,
          totalSessions,
          activeStudents: activeStudents[0]?.count || 0,
          grossEarning: Math.round(grossEarning),
          commission: Math.round(commission),
          netPayout: Math.round(netPayout),
          joinedAt: prof.createdAt,
        };
      })
    );

    // Platform totals
    const totalGross = earningsData.reduce((s, p) => s + p.grossEarning, 0);
    const totalCommission = earningsData.reduce((s, p) => s + p.commission, 0);
    const totalSessions = earningsData.reduce((s, p) => s + p.totalSessions, 0);
    const totalStudents = await User.countDocuments({ role: "student" });

    res.json({
      professors: earningsData,
      summary: {
        totalGross,
        totalCommission,
        totalSessions,
        totalStudents,
        totalProfessors: professors.length,
      },
    });
  } catch (err) {
    console.error("ADMIN EARNINGS ERROR:", err);
    res.status(500).json({ message: "Failed to load earnings" });
  }
});

export default router;
