import express from "express"
import { protect } from "../middleware/authMiddleware.js"

import {
  createSession,
  getAllSessions,
  enrollSession,
  getProfessorSessions,
  getEnrolledSessions,
} from "../controllers/sessionController.js"

const router = express.Router()

// Professor creates session
router.post("/", protect, createSession)

// Student fetches all sessions
router.get("/", protect, getAllSessions)

// Student enrolls session
router.post("/:id/enroll", protect, enrollSession)

// Professor dashboard sessions
router.get("/professor", protect, getProfessorSessions)

// Student enrolled sessions dashboard
router.get("/enrolled", protect, getEnrolledSessions)

export default router
