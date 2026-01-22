import express from "express"
import User from "../models/User.js"
import { protect, adminOnly } from "../middleware/authMiddleware.js"
import AdminLog from "../models/AdminLog.js"
import { sendApprovalMail } from "../utils/sendEmail.js"
import bcrypt from "bcryptjs"

const router = express.Router()

// ✅ GET ALL PENDING PROFESSORS
router.get("/pending-professors", protect, adminOnly, async (req, res) => {
  try {
    const professors = await User.find({
      role: "professor",
      isVerified: false,
    }).select("-password")

    res.json(professors)
  } catch (err) {
    console.error("ADMIN FETCH ERROR:", err)
    res.status(500).json({ message: "Failed to load professors" })
  }
})

// ✅ VERIFY PROFESSOR
router.put("/verify/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    )

    // Send Email
    await sendApprovalMail(user.email, user.name)

    res.json({ message: "Professor verified and email sent" })
  } catch (err) {
    res.status(500).json({ message: "Verification failed" })
  }
})


// VERIFIED PROFESSORS
router.get("/verified-professors", protect, adminOnly, async (req, res) => {
  const professors = await User.find({
    role: "professor",
    isVerified: true,
  }).select("-password")
  res.json(professors)
})
// ✅ GET ALL USERS (Student + Professor + Admin)
router.get("/all-users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password")
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: "Failed to load users" })
  }
})

// ✅ ADMIN ANALYTICS
router.get("/analytics", protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalStudents = await User.countDocuments({ role: "student" })
    const totalProfessors = await User.countDocuments({ role: "professor" })
    const verifiedProfessors = await User.countDocuments({
      role: "professor",
      isVerified: true,
    })
    const pendingProfessors = await User.countDocuments({
      role: "professor",
      isVerified: false,
    })

    res.json({
      totalUsers,
      totalStudents,
      totalProfessors,
      verifiedProfessors,
      pendingProfessors,
    })
  } catch (err) {
    res.status(500).json({ message: "Failed to load analytics" })
  }
})
// ✅ UPDATE ADMIN PROFILE
router.put("/update-profile", protect, adminOnly, async (req, res) => {
  try {
    const { name, email } = req.body

    const admin = await User.findById(req.user._id)

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" })
    }

    admin.name = name || admin.name
    admin.email = email || admin.email

    await admin.save()

    res.json({
      message: "Profile updated successfully",
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" })
  }
})
// GET USERS (with pagination + search + role filter)
router.get("/users", protect, adminOnly, async (req, res) => {
  const { page = 1, search = "", role = "" } = req.query
  const limit = 10
  const skip = (page - 1) * limit

  let query = {
    name: { $regex: search, $options: "i" }
  }

  if (role) query.role = role

  const users = await User.find(query)
    .select("-password")
    .skip(skip)
    .limit(limit)

  const total = await User.countDocuments(query)

  res.json({ users, total })
})

// UPDATE USER STATUS
router.put("/user-status/:id", protect, adminOnly, async (req, res) => {
  const { status } = req.body
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  )

  await AdminLog.create({
    admin: req.user._id,
    action: "Updated User Status",
    target: user.email,
    description: `Changed ${user.name}'s status to ${status}`,
  })

  res.json({ message: "Status updated" })
})


// 📊 DETAILED ANALYTICS
router.get("/analytics-charts", protect, adminOnly, async (req, res) => {
  try {
    const students = await User.countDocuments({ role: "student" })
    const professors = await User.countDocuments({ role: "professor" })

    const verified = await User.countDocuments({
      role: "professor",
      isVerified: true,
    })
    const pending = await User.countDocuments({
      role: "professor",
      isVerified: false,
    })

    // Growth: users per week (last 6 weeks)
    const sixWeeksAgo = new Date()
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42)

    const users = await User.find({
      createdAt: { $gte: sixWeeksAgo },
    })

    const weeklyGrowth = {}

    users.forEach((u) => {
      const week = new Date(u.createdAt).toLocaleDateString("en-US", {
        week: "numeric",
        year: "numeric",
      })
      weeklyGrowth[week] = (weeklyGrowth[week] || 0) + 1
    })

    const growthData = Object.keys(weeklyGrowth).map((week) => ({
      week,
      users: weeklyGrowth[week],
    }))

    res.json({
      roleChart: [
        { name: "Students", value: students },
        { name: "Professors", value: professors },
      ],
      verificationChart: [
        { name: "Verified", value: verified },
        { name: "Pending", value: pending },
      ],
      growthData,
    })
  } catch (err) {
    res.status(500).json({ message: "Analytics chart error" })
  }
})

// 🧾 GET ADMIN LOGS
router.get("/logs", protect, adminOnly, async (req, res) => {
  const logs = await AdminLog.find()
    .populate("admin", "name email")
    .sort({ createdAt: -1 })
    .limit(50)

  res.json(logs)
})
// 🔐 CHANGE PASSWORD
router.put("/change-password", protect, adminOnly, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    const admin = await User.findById(req.user._id)

    const isMatch = await bcrypt.compare(oldPassword, admin.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    admin.password = hashed
    await admin.save()

    res.json({ message: "Password updated successfully" })
  } catch (err) {
    res.status(500).json({ message: "Failed to change password" })
  }
})
// 🔍 GET SINGLE PROFESSOR FULL DETAILS
router.get("/professor/:id", protect, adminOnly, async (req, res) => {
  try {
    const professor = await User.findById(req.params.id).select("-password")

    if (!professor || professor.role !== "professor") {
      return res.status(404).json({ message: "Professor not found" })
    }

    res.json(professor)
  } catch (err) {
    res.status(500).json({ message: "Failed to load professor details" })
  }
})

export default router
