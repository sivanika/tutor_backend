import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

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
      const user = await User.findById(req.user._id);

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
