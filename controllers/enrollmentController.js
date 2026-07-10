import Enrollment from "../models/Enrollment.js"
import Course from "../models/Course.js"
import Lesson from "../models/Lesson.js"
import LessonProgress from "../models/LessonProgress.js"
import Certificate from "../models/Certificate.js"
import CoursePayment from "../models/CoursePayment.js"

// ─────────────────────────────────────────────────────────────
//  STUDENT ACTIONS
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/lms/enroll
 * Student applies for a published course
 */
export const applyForCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    const studentId = req.user._id

    if (!courseId) return res.status(400).json({ message: "courseId is required" })

    const course = await Course.findById(courseId)
    if (!course) return res.status(404).json({ message: "Course not found" })
    if (course.status !== "published") {
      return res.status(400).json({ message: "Course is not available for enrollment" })
    }

    // Check duplicate
    const existing = await Enrollment.findOne({ studentId, courseId })
    if (existing) {
      return res.status(409).json({
        message: "You have already applied for this course",
        enrollment: existing,
      })
    }

    const enrollment = await Enrollment.create({ studentId, courseId })
    res.status(201).json({ success: true, enrollment })
  } catch (e) {
    console.error("APPLY FOR COURSE:", e)
    res.status(500).json({ message: "Failed to apply for course" })
  }
}

/**
 * GET /api/lms/enrollments/my
 * Returns the logged-in student's enrollments with course details
 */
export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id })
      .populate("courseId", "title description thumbnailUrl subject level status duration instructor")
      .sort({ enrolledDate: -1 })

    res.json({ success: true, enrollments })
  } catch (e) {
    console.error("GET MY ENROLLMENTS:", e)
    res.status(500).json({ message: "Failed to fetch enrollments" })
  }
}

// ─────────────────────────────────────────────────────────────
//  ADMIN ACTIONS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/lms/enrollments
 * Admin — all enrollments with student + course info
 * Supports ?status=applied|approved|rejected|completed and ?courseId=
 */
export const getAllEnrollments = async (req, res) => {
  try {
    const query = {}
    if (req.query.status)   query.status   = req.query.status
    if (req.query.courseId) query.courseId = req.query.courseId

    const enrollments = await Enrollment.find(query)
      .populate("studentId", "name email studentPhoto")
      .populate("courseId", "title subject thumbnailUrl status")
      .sort({ enrolledDate: -1 })

    res.json({ success: true, enrollments })
  } catch (e) {
    console.error("GET ALL ENROLLMENTS:", e)
    res.status(500).json({ message: "Failed to fetch enrollments" })
  }
}

/**
 * PATCH /api/lms/enrollments/:id/approve  [Admin only]
 */
export const approveEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" })

    if (enrollment.status === "approved") {
      return res.status(400).json({ message: "Enrollment already approved" })
    }

    enrollment.status = "approved"
    enrollment.approvedDate = new Date()
    await enrollment.save()

    res.json({ success: true, message: "Enrollment approved", enrollment })
  } catch (e) {
    console.error("APPROVE ENROLLMENT:", e)
    res.status(500).json({ message: "Failed to approve enrollment" })
  }
}

/**
 * PATCH /api/lms/enrollments/:id/reject  [Admin only]
 */
export const rejectEnrollment = async (req, res) => {
  try {
    const { reason } = req.body
    const enrollment = await Enrollment.findById(req.params.id)
    if (!enrollment) return res.status(404).json({ message: "Enrollment not found" })

    enrollment.status = "rejected"
    enrollment.rejectionReason = reason || ""
    await enrollment.save()

    res.json({ success: true, message: "Enrollment rejected", enrollment })
  } catch (e) {
    console.error("REJECT ENROLLMENT:", e)
    res.status(500).json({ message: "Failed to reject enrollment" })
  }
}

// ─────────────────────────────────────────────────────────────
//  LESSON PROGRESS
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/lms/progress/mark
 * Manual completion (for PDF lessons)
 * Body: { lessonId, courseId }
 */
export const markLessonComplete = async (req, res) => {
  try {
    const { lessonId, courseId } = req.body
    const studentId = req.user._id

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ studentId, courseId, status: "approved" })
    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this course" })
    }

    // Upsert progress record
    const progress = await LessonProgress.findOneAndUpdate(
      { studentId, lessonId },
      { studentId, lessonId, courseId, completed: true, completedAt: new Date() },
      { upsert: true, new: true }
    )

    // Recalculate overall course progress
    const newPercentage = await recalculateProgress(studentId, courseId)
    enrollment.progressPercentage = newPercentage

    // Auto-complete enrollment if 100%
    if (newPercentage === 100 && enrollment.status !== "completed") {
      enrollment.status = "completed"
      enrollment.completedDate = new Date()
      await enrollment.save()
      // Issue certificate
      await issueCertificate(studentId, courseId, enrollment._id)
    } else {
      await enrollment.save()
    }

    res.json({ success: true, progress, progressPercentage: newPercentage })
  } catch (e) {
    console.error("MARK LESSON COMPLETE:", e)
    res.status(500).json({ message: "Failed to mark lesson as complete" })
  }
}

/**
 * POST /api/lms/progress/video
 * Update video watch progress — auto-complete at 80%
 * Body: { lessonId, courseId, watchedSeconds, totalSeconds }
 */
export const updateVideoProgress = async (req, res) => {
  try {
    const { lessonId, courseId, watchedSeconds, totalSeconds } = req.body
    const studentId = req.user._id

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ studentId, courseId, status: "approved" })
    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this course" })
    }

    const existingProgress = await LessonProgress.findOne({ studentId, lessonId })
    // Don't regress a completed lesson
    if (existingProgress?.completed) {
      return res.json({ success: true, alreadyCompleted: true })
    }

    const watched = Number(watchedSeconds) || 0
    const total   = Number(totalSeconds)   || 0
    const autoComplete = total > 0 && watched / total >= 0.8

    const progress = await LessonProgress.findOneAndUpdate(
      { studentId, lessonId },
      {
        studentId, lessonId, courseId,
        watchedSeconds: watched,
        totalSeconds:   total,
        completed:      autoComplete,
        completedAt:    autoComplete ? new Date() : null,
      },
      { upsert: true, new: true }
    )

    let progressPercentage = enrollment.progressPercentage
    if (autoComplete) {
      progressPercentage = await recalculateProgress(studentId, courseId)
      enrollment.progressPercentage = progressPercentage

      if (progressPercentage === 100 && enrollment.status !== "completed") {
        enrollment.status = "completed"
        enrollment.completedDate = new Date()
        await enrollment.save()
        await issueCertificate(studentId, courseId, enrollment._id)
      } else {
        await enrollment.save()
      }
    }

    res.json({ success: true, progress, progressPercentage, autoCompleted: autoComplete })
  } catch (e) {
    console.error("UPDATE VIDEO PROGRESS:", e)
    res.status(500).json({ message: "Failed to update video progress" })
  }
}

/**
 * GET /api/lms/progress/:courseId
 * Returns all lesson progress records for the student in a course
 */
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params
    const studentId = req.user._id

    const course = await Course.findById(courseId)
    if (!course) return res.status(404).json({ message: "Course not found" })

    const enrollment = await Enrollment.findOne({ studentId, courseId })

    // Enforce purchase/enrollment check if course is paid and user is not admin
    if (course.price > 0 && req.user.role !== "admin") {
      if (!enrollment || (enrollment.status !== "approved" && enrollment.status !== "completed")) {
        return res.status(403).json({ message: "Access locked. You must enroll/purchase this course to view progress." })
      }
    }

    const progressRecords = await LessonProgress.find({ studentId, courseId })

    res.json({
      success: true,
      progressRecords,
      progressPercentage: enrollment?.progressPercentage || 0,
      enrollmentStatus: enrollment?.status || null,
    })
  } catch (e) {
    console.error("GET COURSE PROGRESS:", e)
    res.status(500).json({ message: "Failed to fetch progress" })
  }
}

// ─────────────────────────────────────────────────────────────
//  CERTIFICATES
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/lms/certificates/my
 */
export const getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ studentId: req.user._id })
      .populate("courseId", "title subject thumbnailUrl instructor")
      .sort({ issuedDate: -1 })

    res.json({ success: true, certificates })
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch certificates" })
  }
}

// ─────────────────────────────────────────────────────────────
//  DASHBOARD STATS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/lms/dashboard/stats
 * Aggregated stats for the student dashboard
 */
export const getDashboardStats = async (req, res) => {
  try {
    const studentId = req.user._id

    const enrollments = await Enrollment.find({ studentId }).lean()
    const totalCourses   = enrollments.length
    const inProgress     = enrollments.filter(e => e.status === "approved" && e.progressPercentage < 100).length
    const completed      = enrollments.filter(e => e.status === "completed").length
    const certificates   = await Certificate.countDocuments({ studentId })

    // Learning hours: sum watchedSeconds from LessonProgress / 3600
    const progressAgg = await LessonProgress.aggregate([
      { $match: { studentId } },
      { $group: { _id: null, totalSeconds: { $sum: "$watchedSeconds" } } },
    ])
    const learningHours = progressAgg.length
      ? Math.round((progressAgg[0].totalSeconds / 3600) * 10) / 10
      : 0

    // Last active enrollment (for "Continue Learning")
    const lastActive = await Enrollment.findOne({
      studentId,
      status: "approved",
    })
      .sort({ updatedAt: -1 })
      .populate("courseId", "title thumbnailUrl subject instructor level")
      .lean()

    res.json({
      success: true,
      stats: {
        totalCourses,
        inProgress,
        completed,
        certificates,
        learningHours,
        assignments: { total: 0, submitted: 0, pending: 0 },
        quizzes:     { total: 0, passed: 0, attempts: 0 },
        attendance:  0,
      },
      lastActive,
    })
  } catch (e) {
    console.error("DASHBOARD STATS:", e)
    res.status(500).json({ message: "Failed to fetch dashboard stats" })
  }
}

// ─────────────────────────────────────────────────────────────
//  PAYMENT HISTORY
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/lms/payments/my
 * Returns the student's course payment history
 */
export const getMyPayments = async (req, res) => {
  try {
    const payments = await CoursePayment.find({ studentId: req.user._id })
      .populate("courseId", "title thumbnailUrl subject")
      .sort({ createdAt: -1 })
      .lean()

    res.json({ success: true, payments })
  } catch (e) {
    console.error("GET MY PAYMENTS:", e)
    res.status(500).json({ message: "Failed to fetch payment history" })
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Recalculate course progress percentage for a student.
 * completedLessons / totalLessons * 100, rounded to nearest integer.
 */
async function recalculateProgress(studentId, courseId) {
  const totalLessons = await Lesson.countDocuments({ courseId })
  if (totalLessons === 0) return 0

  const completedLessons = await LessonProgress.countDocuments({
    studentId,
    courseId,
    completed: true,
  })

  return Math.round((completedLessons / totalLessons) * 100)
}

/**
 * Auto-issue a certificate once a student completes a course.
 * Silently skips if one already exists.
 */
async function issueCertificate(studentId, courseId, enrollmentId) {
  try {
    const exists = await Certificate.findOne({ studentId, courseId })
    if (exists) return

    // Generate a unique readable code: TH-YEAR-XXXXX
    const year = new Date().getFullYear()
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
    const uniqueCode = `TH-${year}-${rand}`

    await Certificate.create({ studentId, courseId, enrollmentId, uniqueCode })
    console.log(`✅ Certificate issued: ${uniqueCode}`)
  } catch (e) {
    console.error("ISSUE CERTIFICATE ERROR:", e)
  }
}
