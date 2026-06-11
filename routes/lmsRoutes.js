import express from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import { protect, adminOnly, optionalProtect } from "../middleware/authMiddleware.js"

// ── LMS controllers ────────────────────────────────────────────
import {
  getLMSCourses,
  getLMSCourseById,
  createLMSCourse,
  updateLMSCourse,
  updateCourseStatus,
  deleteLMSCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../controllers/lmsController.js"

import {
  applyForCourse,
  getMyEnrollments,
  getAllEnrollments,
  approveEnrollment,
  rejectEnrollment,
  markLessonComplete,
  updateVideoProgress,
  getCourseProgress,
  getMyCertificates,
} from "../controllers/enrollmentController.js"

const router = express.Router()

// ─────────────────────────────────────────────────────────────
//  MULTER — Course thumbnail + promo video (admin uploads)
// ─────────────────────────────────────────────────────────────
const courseUploadDir = "uploads/lms/courses"
if (!fs.existsSync(courseUploadDir)) fs.mkdirSync(courseUploadDir, { recursive: true })

const courseStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, courseUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const courseUpload = multer({
  storage: courseStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|mp4|mov|webm|mkv/i
    if (allowed.test(path.extname(file.originalname))) return cb(null, true)
    cb(new Error("Only image and video files are allowed for courses"))
  },
})

// ─────────────────────────────────────────────────────────────
//  MULTER — Lesson content (video / PDF)
// ─────────────────────────────────────────────────────────────
const lessonUploadDir = "uploads/lms/lessons"
if (!fs.existsSync(lessonUploadDir)) fs.mkdirSync(lessonUploadDir, { recursive: true })

const lessonStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, lessonUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const lessonUpload = multer({
  storage: lessonStorage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB for large videos
  fileFilter: (_req, file, cb) => {
    const allowed = /mp4|mov|webm|mkv|pdf/i
    if (allowed.test(path.extname(file.originalname))) return cb(null, true)
    cb(new Error("Only video (mp4/mov/webm/mkv) and PDF files are allowed for lessons"))
  },
})

// ─────────────────────────────────────────────────────────────
//  COURSE ROUTES
// ─────────────────────────────────────────────────────────────
// GET  /api/lms/courses         — public (filtered by status for non-admin)
// POST /api/lms/courses         — admin only
router.get(
  "/courses",
  optionalProtect,
  getLMSCourses
)

router.post(
  "/courses",
  protect, adminOnly,
  courseUpload.fields([
    { name: "thumbnailFile", maxCount: 1 },
    { name: "videoFile",     maxCount: 1 },
  ]),
  createLMSCourse
)

// GET    /api/lms/courses/:id        — public (published only for non-admin)
// PUT    /api/lms/courses/:id        — admin only
// DELETE /api/lms/courses/:id        — admin only
router.get(   "/courses/:id", optionalProtect, getLMSCourseById)
router.put(
  "/courses/:id",
  protect, adminOnly,
  courseUpload.fields([
    { name: "thumbnailFile", maxCount: 1 },
    { name: "videoFile",     maxCount: 1 },
  ]),
  updateLMSCourse
)
router.delete("/courses/:id",    protect, adminOnly, deleteLMSCourse)

// PATCH /api/lms/courses/:id/status  — admin only (draft/published/archived toggle)
router.patch("/courses/:id/status", protect, adminOnly, updateCourseStatus)

// ─────────────────────────────────────────────────────────────
//  MODULE ROUTES
// ─────────────────────────────────────────────────────────────
router.post(  "/courses/:courseId/modules", protect, adminOnly, createModule)
router.put(   "/modules/:id",               protect, adminOnly, updateModule)
router.delete("/modules/:id",               protect, adminOnly, deleteModule)

// ─────────────────────────────────────────────────────────────
//  LESSON ROUTES
// ─────────────────────────────────────────────────────────────
router.post(
  "/modules/:moduleId/lessons",
  protect, adminOnly,
  lessonUpload.single("contentFile"),
  createLesson
)
router.put(
  "/lessons/:id",
  protect, adminOnly,
  lessonUpload.single("contentFile"),
  updateLesson
)
router.delete("/lessons/:id", protect, adminOnly, deleteLesson)

// ─────────────────────────────────────────────────────────────
//  ENROLLMENT ROUTES
// ─────────────────────────────────────────────────────────────
// Student: apply + view own
router.post("/enroll",             protect, applyForCourse)
router.get( "/enrollments/my",     protect, getMyEnrollments)

// Admin: view all, approve, reject
router.get(   "/enrollments",          protect, adminOnly, getAllEnrollments)
router.patch( "/enrollments/:id/approve", protect, adminOnly, approveEnrollment)
router.patch( "/enrollments/:id/reject",  protect, adminOnly, rejectEnrollment)

// ─────────────────────────────────────────────────────────────
//  PROGRESS ROUTES
// ─────────────────────────────────────────────────────────────
router.post("/progress/mark",       protect, markLessonComplete)
router.post("/progress/video",      protect, updateVideoProgress)
router.get( "/progress/:courseId",  protect, getCourseProgress)

// ─────────────────────────────────────────────────────────────
//  CERTIFICATE ROUTES
// ─────────────────────────────────────────────────────────────
router.get("/certificates/my", protect, getMyCertificates)

export default router
