import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createFeedback,
  getProfessorFeedback,
} from "../controllers/feedbackController.js";

const router = express.Router();

// student gives feedback
router.post("/", protect, createFeedback);

// professor sees feedback
router.get("/professor", protect, getProfessorFeedback);

export default router;
