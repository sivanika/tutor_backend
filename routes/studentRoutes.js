import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.put(
  "/complete-profile",
  protect,
  upload.fields([
    { name: "studentPhoto", maxCount: 1 },
    { name: "studentDocument", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user || user.role !== "student") {
        return res.status(403).json({ message: "Not authorized" });
      }

      const data = req.body;

      // ❌ DO NOT update email again
      // user.email = data.email || user.email;

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

      // Availability (safe parse)
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
      user.subscriptionTier = data.subscriptionTier;
      user.professorPreferences = data.professorPreferences;

      // Files
      if (req.files?.studentPhoto) {
        user.studentPhoto = req.files.studentPhoto[0].path;
      }
      if (req.files?.studentDocument) {
        user.studentDocument = req.files.studentDocument[0].path;
      }

      // Profile status
      user.profileCompleted = true;
      user.isVerified = false; // Admin must verify later

      await user.save();

      res.json({
        success: true,
        message: "Student profile submitted for verification",
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
