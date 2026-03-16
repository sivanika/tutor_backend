import express from "express"
import { protect, adminOnly } from "../middleware/authMiddleware.js"
import {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController.js"

const router = express.Router()

// Public — homepage reads active announcements
router.get("/", getActiveAnnouncements)

// Admin only
router.get("/all", protect, adminOnly, getAllAnnouncements)
router.post("/", protect, adminOnly, createAnnouncement)
router.put("/:id", protect, adminOnly, updateAnnouncement)
router.delete("/:id", protect, adminOnly, deleteAnnouncement)

export default router
