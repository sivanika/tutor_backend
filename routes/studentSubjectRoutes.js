import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getStudentSubjects,
  addSubject,
  updateSubjectVisibility,
  updateRequirement,
  deleteSubject,
  acceptProfessorRequest,
  rejectProfessorRequest,
  simulateRequest,
  applyToSubject
} from "../controllers/studentSubjectController.js";

const router = express.Router();

router.get("/", protect, getStudentSubjects);
router.post("/", protect, addSubject);
router.patch("/:id/visibility", protect, updateSubjectVisibility);
router.put("/:id/requirement", protect, updateRequirement);
router.delete("/:id", protect, deleteSubject);
router.post("/:id/requests/:requestId/accept", protect, acceptProfessorRequest);
router.post("/:id/requests/:requestId/reject", protect, rejectProfessorRequest);
router.post("/:id/simulate-request", protect, simulateRequest);
router.post("/:id/apply", protect, applyToSubject);

export default router;
