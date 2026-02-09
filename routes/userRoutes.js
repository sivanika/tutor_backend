import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET current logged-in user profile
 * GET /api/users/me
 */
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to load profile" });
  }
});

/**
 * UPDATE user profile
 * PUT /api/users/profile
 */
router.put("/profile", protect, async (req, res) => {
  try {
    const {
      name,
      headline,
      location,
      bio,
      teachingStyle,
      specializations,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        headline,
        location,
        bio,
        teachingStyle,
        specializations,
      },
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;
