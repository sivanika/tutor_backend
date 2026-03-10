import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Feedback from "../models/Feedback.js";
import Session from "../models/Session.js";

const router = express.Router();

/* ============================
   GET FEATURED / VERIFIED TUTORS (PUBLIC)
   Returns top verified professors with real rating + session count
   No auth required — used on the public home page
============================ */
router.get("/featured", async (req, res) => {
  try {
    // Fetch verified, active professors — prioritize featured ones but fall back to normal to populate the home page
    const professors = await User.find({
      role: "professor",
      isVerified: true,
      status: "active",
    })
      .select("name subjects profilePhoto studentsHelped featuredOrder isFeatured")
      .sort({ isFeatured: -1, featuredOrder: 1 })  // ← prioritize featured, then admin-controlled display order
      .lean();

    if (!professors.length) {
      return res.json([]);
    }

    const professorIds = professors.map((p) => p._id);

    // 2️⃣ Aggregate average ratings per professor from Feedback
    const ratingAgg = await Feedback.aggregate([
      { $match: { professor: { $in: professorIds } } },
      {
        $group: {
          _id: "$professor",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);
    const ratingMap = {};
    ratingAgg.forEach((r) => {
      ratingMap[r._id.toString()] = {
        avgRating: r.avgRating,
        reviewCount: r.reviewCount,
      };
    });

    // 3️⃣ Aggregate session counts per professor from Session
    const sessionAgg = await Session.aggregate([
      { $match: { professor: { $in: professorIds } } },
      { $group: { _id: "$professor", sessionCount: { $sum: 1 } } },
    ]);
    const sessionMap = {};
    sessionAgg.forEach((s) => {
      sessionMap[s._id.toString()] = s.sessionCount;
    });

    // Merge rating + session data, preserve admin's featuredOrder sort
    const enriched = professors
      .map((p) => {
        const id = p._id.toString();
        const ratingData = ratingMap[id] || {};
        return {
          _id: id,
          name: p.name,
          subjects: p.subjects || "",
          profilePhoto: p.profilePhoto || null,
          featuredOrder: p.featuredOrder ?? 0,
          avgRating: ratingData.avgRating
            ? parseFloat(ratingData.avgRating.toFixed(1))
            : null,
          reviewCount: ratingData.reviewCount || 0,
          sessionCount: sessionMap[id] || p.studentsHelped || 0,
        };
      })
      // Keep the DB sort order (featuredOrder ASC), already sorted from the query
      .slice(0, 6);  // max 6 on landing page

    res.json(enriched);
  } catch (err) {
    console.error("FEATURED PROFESSORS ERROR:", err);
    res.status(500).json({ message: "Failed to load featured professors" });
  }
});

/* ============================
   GET SINGLE PROFESSOR PROFILE (PUBLIC)
   Gating (blur/lock) is enforced on the frontend.
============================ */
router.get("/:id", async (req, res) => {
  try {
    const professor = await User.findOne({
      _id: req.params.id,
      role: "professor",
      isVerified: true,
      status: "active",
    })
      .select(
        "name subjects bio headline profilePhoto yearsExperience teachingLevel teachingStyle specializations availability phone email studentsHelped"
      )
      .lean();

    if (!professor) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    // Aggregate rating
    const ratingAgg = await Feedback.aggregate([
      { $match: { professor: professor._id } },
      {
        $group: {
          _id: "$professor",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    // Aggregate reviews (last 10 for display)
    const reviews = await Feedback.find({ professor: professor._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("student", "name studentPhoto")
      .lean();

    // Session count
    const sessionCount = await Session.countDocuments({ professor: professor._id });

    const ratingData = ratingAgg[0] || {};

    res.json({
      ...professor,
      avgRating: ratingData.avgRating
        ? parseFloat(ratingData.avgRating.toFixed(1))
        : null,
      reviewCount: ratingData.reviewCount || 0,
      sessionCount: sessionCount || professor.studentsHelped || 0,
      reviews,
    });
  } catch (err) {
    console.error("PROFESSOR PROFILE ERROR:", err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

// multer config
const upload = multer({ dest: "uploads/" });

// Submit professor profile
router.post(
  "/",
  protect,
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "degreeCertificate", maxCount: 1 },
    { name: "governmentId", maxCount: 1 },
    { name: "videoIntroduction", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user || user.role !== "professor") {
        return res.status(403).json({ message: "Not authorized" });
      }

      const data = req.body;

      // 🔥 BASIC INFO
      user.name = `${data.firstName || ""} ${data.lastName || ""}`;
      user.email = data.email || user.email;
      user.phone = data.phone;
      user.country = data.country;
      user.timezone = data.timezone;
      user.bio = data.bio;

      // 🎓 ACADEMIC
      user.highestDegree = data.highestDegree;
      user.fieldOfStudy = data.fieldOfStudy;
      user.university = data.university;
      user.graduationYear = data.graduationYear;
      user.specializations = data.specializations;
      user.certifications = data.certifications;

      // 🧑‍🏫 EXPERIENCE
      user.yearsExperience = data.yearsExperience;
      user.teachingLevel = data.teachingLevel;
      user.subjects = data.subjects;
      user.teachingPhilosophy = data.teachingPhilosophy;
      user.hourlyRate = data.hourlyRate;

      // 🗓 Availability
      if (data.availability) {
        try {
          user.availability = JSON.parse(data.availability);
        } catch {
          user.availability = {};
        }
      }

      // 📂 FILES
      if (req.files?.profilePhoto) {
        user.profilePhoto = req.files.profilePhoto[0].path;
      }

      if (req.files?.degreeCertificate) {
        user.degreeCertificate = req.files.degreeCertificate[0].path;
      }

      if (req.files?.governmentId) {
        user.governmentId = req.files.governmentId[0].path;
      }

      if (req.files?.videoIntroduction) {
        user.videoIntroduction = req.files.videoIntroduction[0].path;
      }

      // 🔐 STATUS
      user.profileCompleted = true;
      user.isVerified = false; // Admin must verify

      await user.save();

      res.json({
        success: true,
        message: "Professor profile submitted for verification",
      });
    } catch (err) {
      console.error("PROFESSOR PROFILE ERROR:", err);
      res.status(500).json({
        message: "Professor profile submit failed",
        error: err.message,
      });
    }
  }
);

export default router;
