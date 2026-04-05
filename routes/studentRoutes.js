import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import SubscriptionPlan from "../models/SubscriptionPlan.js";
import { sendPendingApprovalMail } from "../utils/sendEmail.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

import StudentSubject from "../models/StudentSubject.js";

/* ============================
   GET ALL STUDENTS FOR BROWSING
   Also returns the professor's current view count + tier for frontend gating
============================ */
router.get("/browse", protect, async (req, res) => {
  try {
    // 🔍 Aggregate students with their visible subject requests
    const students = await User.aggregate([
      { $match: { role: "student" } },
      { $project: { password: 0, availability: 0 } },
      {
        $lookup: {
          from: "studentsubjects", // mongoose pluralizes automatically: StudentSubject -> studentsubjects
          let: { studentId: "$_id" },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ["$student", "$$studentId"] },
                visible: true,
                status: { $in: ["Open", "Pending", "Engaged"] }
              } 
            },
            {
              $addFields: {
                hasApplied: {
                  $cond: {
                    if: { $in: [req.user._id, { $ifNull: ["$requests.professor", []] }] },
                    then: true,
                    else: false
                  }
                }
              }
            },
            { $project: { name: 1, requirement: 1, status: 1, icon: 1, hasApplied: 1 } }
          ],
          as: "subjectRequests"
        }
      }
    ]);

    // If the requester is a professor, attach their browse quota info
    let professorQuota = null;
    if (req.user && req.user.role === "professor") {
      const prof = await User.findById(req.user.id).select("subscriptionTier viewedStudents subscriptionStatus subscriptionPlan").populate("subscriptionPlan");
      if (prof) {
        professorQuota = {
          subscriptionTier: prof.subscriptionTier || "free_trial",
          subscriptionStatus: prof.subscriptionStatus || "inactive",
          viewedStudents: prof.viewedStudents || [],
          planTier: prof.subscriptionPlan ? prof.subscriptionPlan.name : null
        };
      }
    }

    res.json({ students, professorQuota });
  } catch (err) {
    console.error("Fetch students error:", err);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

/* ============================
   GET SINGLE STUDENT PROFILE (for professors)
   Tracks professor view — limit gate is enforced on the frontend (browse area only)
============================ */
router.get("/:id", protect, async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.params.id,
      role: "student",
    })
      .select(
        "name school gradeLevel learningGoals specializations bio parentConsent studentPhoto createdAt"
      )
      .lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Track this view for professors (no blocking — gate is frontend-only)
    if (req.user && req.user.role === "professor") {
      const profUser = await User.findById(req.user.id);
      if (profUser) {
        const hasViewed = (profUser.viewedStudents || []).some(
          (sid) => sid.toString() === student._id.toString()
        );
        if (!hasViewed) {
          if (!profUser.viewedStudents) profUser.viewedStudents = [];
          profUser.viewedStudents.push(student._id);
          await profUser.save();
        }
      }
    }

    res.json(student);
  } catch (err) {
    console.error("STUDENT PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to load student profile" });
  }
});


/* ============================
   COMPLETE STUDENT PROFILE
============================ */
router.put(
  "/complete-profile",
  protect,
  upload.fields([
    { name: "studentPhoto", maxCount: 1 },
    { name: "studentDocument", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // ✅ FIX: use req.user.id (not _id)
      const user = await User.findById(req.user.id);

      if (!user || user.role !== "student") {
        return res.status(403).json({ message: "Not authorized" });
      }

      const data = req.body;

      // Basic info
      user.name = `${data.firstName} ${data.lastName}`;
      user.phone = data.phone;
      user.birthDate = data.birthDate;
      user.gradeLevel = data.gradeLevel;
      user.school = data.school;
      user.learningGoals = data.learningGoals;
      user.specializations = data.subjects;

      // Parent info
      user.parentName = data.parentName;
      user.parentEmail = data.parentEmail;
      user.parentPhone = data.parentPhone;
      user.parentRelationship = data.parentRelationship;
      user.parentConsent = data.parentConsent === "true";

      // Availability parsing
      let availability = [];
      if (typeof data.availability === "string") {
        try {
          availability = JSON.parse(data.availability);
        } catch {
          availability = [];
        }
      } else {
        availability = data.availability || [];
      }
      user.availability = availability;

      // Subscription
      user.subscriptionTier = data.subscriptionTier || "free_trial";
      user.professorPreferences = data.professorPreferences;

      if (!user.subscriptionPlan && user.subscriptionTier === "free_trial") {
        const freePlan = await SubscriptionPlan.findOne({ name: /Free Trial/i });
        if (freePlan) {
          user.subscriptionPlan = freePlan._id;
          user.subscriptionStatus = "active";
          user.currentPlanSessionsBooked = 0;
          user.viewedProfessors = [];
        }
      }

      // File uploads
      if (req.files?.studentPhoto) {
        user.studentPhoto = req.files.studentPhoto[0].path;
      }
      if (req.files?.studentDocument) {
        user.studentDocument = req.files.studentDocument[0].path;
      }

      // 🔥 CRITICAL FIX
      user.profileCompleted = true;
      user.isVerified = false;

      await user.save();

      // 🔔 Non-blocking confirmation email
      sendPendingApprovalMail(user.email, user.name, "student").catch((e) =>
        console.warn("[studentRoutes] pending email failed:", e.message)
      );

      res.json({
        success: true,
        message: "Student profile submitted successfully",
        profileCompleted: user.profileCompleted,
      });
    } catch (err) {
      console.error("STUDENT PROFILE ERROR:", err);
      res.status(500).json({
        message: "Student profile submit failed",
        error: err.message,
      });
    }
  }
);

export default router;
