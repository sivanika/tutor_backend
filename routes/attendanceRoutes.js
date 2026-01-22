import express from "express"
import {
  markAttendance,
  getMyProgress,
} from "../controllers/attendanceController.js"
import { protect } from "../middleware/authMiddleware.js"

const router = express.Router()

router.post("/mark", protect, markAttendance)
router.get("/my-progress", protect, getMyProgress)

export default router
