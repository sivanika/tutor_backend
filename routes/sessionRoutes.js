import express from "express"
import { protect } from "../middleware/authMiddleware.js"

import {
  createSession,
  getAllSessions,
  enrollSession,
  getProfessorSessions,
  getEnrolledSessions,
  markSessionComplete,
  cancelSession,
  rescheduleSession,
  cancelEnrollment,
} from "../controllers/sessionController.js"

const router = express.Router()

// Professor creates session
router.post("/", protect, createSession)

// Student fetches all sessions
router.get("/", protect, getAllSessions)

// Student enrolls session
router.post("/:id/enroll", protect, enrollSession)

// Student cancels enrollment
router.post("/:id/cancel-enrollment", protect, cancelEnrollment)

// Student marks session as complete
router.post("/:id/complete", protect, markSessionComplete)

// Professor dashboard sessions
router.get("/professor", protect, getProfessorSessions)

// Student enrolled sessions dashboard
router.get("/enrolled", protect, getEnrolledSessions)

// Professor cancels session
router.patch("/:id/cancel", protect, cancelSession)

// Professor reschedules session
router.patch("/:id/reschedule", protect, rescheduleSession)

export default router
