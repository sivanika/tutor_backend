import express from "express"
import multer from "multer"
import { protect, adminOnly } from "../middleware/authMiddleware.js"
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js"

const router = express.Router()
const upload = multer({ dest: "uploads/" })

// Authenticated users routes (students, professors, admins)
router.get("/", protect, getCourses)
router.get("/:id", protect, getCourseById)

// Admin-only routes
router.post("/", protect, adminOnly, upload.fields([
  { name: "thumbnailFile", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
]), createCourse)

router.put("/:id", protect, adminOnly, upload.fields([
  { name: "thumbnailFile", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
]), updateCourse)

router.delete("/:id", protect, adminOnly, deleteCourse)

export default router
