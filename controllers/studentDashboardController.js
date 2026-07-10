import Course from "../models/Course.js"
import Enrollment from "../models/Enrollment.js"
import Certificate from "../models/Certificate.js"
import LessonProgress from "../models/LessonProgress.js"
import Attendance from "../models/Attendance.js"
import Assignment from "../models/Assignment.js"
import AssignmentSubmission from "../models/AssignmentSubmission.js"
import Quiz from "../models/Quiz.js"
import QuizAttempt from "../models/QuizAttempt.js"
import Download from "../models/Download.js"
import CalendarEvent from "../models/CalendarEvent.js"
import User from "../models/User.js"
import AdminLog from "../models/AdminLog.js"

// Socket helper
const notifyStudentUpdate = (studentId, type, message) => {
  if (global.io) {
    global.io.to(String(studentId)).emit("dashboard:update", { type, message })
    console.log(`📡 Socket: Notified student ${studentId} about ${type} update`)
  }
}

// ─────────────────────────────────────────────────────────────
//  STUDENT ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/lms/student/stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    const studentId = req.user._id

    // 1. Course counts
    const enrollments = await Enrollment.find({ studentId }).lean()
    const approvedCourseIds = enrollments
      .filter(e => e.status === "approved" || e.status === "completed")
      .map(e => e.courseId)

    const totalCourses = enrollments.length
    const inProgress = enrollments.filter(e => e.status === "approved" && e.progressPercentage < 100).length
    const completed = enrollments.filter(e => e.status === "completed").length
    const certificates = await Certificate.countDocuments({ studentId })

    // 2. Learning Hours
    const progressAgg = await LessonProgress.aggregate([
      { $match: { studentId } },
      { $group: { _id: null, totalSeconds: { $sum: "$watchedSeconds" } } },
    ])
    const learningHours = progressAgg.length
      ? Math.round((progressAgg[0].totalSeconds / 3600) * 10) / 10
      : 0

    // 3. Last Active
    const lastActive = await Enrollment.findOne({ studentId, status: "approved" })
      .sort({ updatedAt: -1 })
      .populate("courseId", "title thumbnailUrl subject instructor level")
      .lean()

    // 4. Assignments
    const totalAssignments = await Assignment.countDocuments({ courseId: { $in: approvedCourseIds }, status: "active" })
    const activeAssignmentIds = await Assignment.find({ courseId: { $in: approvedCourseIds }, status: "active" }).select("_id")
    const submittedAssignments = await AssignmentSubmission.countDocuments({
      studentId,
      assignmentId: { $in: activeAssignmentIds }
    })
    const pendingAssignments = Math.max(0, totalAssignments - submittedAssignments)

    // 5. Quizzes
    const totalQuizzes = await Quiz.countDocuments({ courseId: { $in: approvedCourseIds } })
    const quizIds = await Quiz.find({ courseId: { $in: approvedCourseIds } }).select("_id")
    const quizAttempts = await QuizAttempt.find({ studentId, quizId: { $in: quizIds } }).lean()
    const uniqueQuizzesPassed = new Set(quizAttempts.filter(a => a.passed).map(a => String(a.quizId))).size
    const totalQuizAttempts = quizAttempts.length

    // 6. Attendance Rate
    const attendanceRecords = await Attendance.find({ student: studentId }).lean()
    const totalAttendance = attendanceRecords.length
    const presentAttendance = attendanceRecords.filter(r => r.status === "present").length
    const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 95 // default to 95 if no sessions logged

    res.json({
      success: true,
      stats: {
        totalCourses,
        inProgress,
        completed,
        certificates,
        learningHours,
        assignments: { total: totalAssignments, submitted: submittedAssignments, pending: pendingAssignments },
        quizzes: { total: totalQuizzes, passed: uniqueQuizzesPassed, attempts: totalQuizAttempts },
        attendance: attendanceRate,
      },
      lastActive,
    })
  } catch (e) {
    console.error("STUDENT DASHBOARD STATS:", e)
    res.status(500).json({ message: "Failed to fetch student statistics" })
  }
}

/**
 * GET /api/lms/student/assignments
 */
export const getStudentAssignments = async (req, res) => {
  try {
    const studentId = req.user._id

    // Get courses
    const enrollments = await Enrollment.find({ studentId, status: { $in: ["approved", "completed"] } }).lean()
    const courseIds = enrollments.map(e => e.courseId)

    // Fetch assignments
    const assignments = await Assignment.find({ courseId: { $in: courseIds }, status: "active" })
      .populate("courseId", "title subject")
      .sort({ dueDate: 1 })
      .lean()

    // Fetch submissions
    const submissions = await AssignmentSubmission.find({ studentId }).lean()
    const submissionMap = new Map(submissions.map(s => [String(s.assignmentId), s]))

    // Combine
    const result = assignments.map(a => {
      const sub = submissionMap.get(String(a._id))
      return {
        _id: a._id,
        title: a.title,
        description: a.description,
        points: a.points,
        dueDate: a.dueDate,
        course: a.courseId?.title || "Course",
        status: sub ? sub.status : "pending",
        submittedDate: sub ? sub.submittedAt : null,
        feedback: sub ? sub.feedback : "",
        grade: sub ? sub.grade : "",
        submissionUrl: sub ? sub.contentUrl : "",
      }
    })

    res.json({ success: true, assignments: result })
  } catch (e) {
    console.error("GET ASSIGNMENTS:", e)
    res.status(500).json({ message: "Failed to fetch assignments" })
  }
}

/**
 * POST /api/lms/student/assignments/:id/submit
 */
export const submitAssignment = async (req, res) => {
  try {
    const studentId = req.user._id
    const assignmentId = req.params.id
    const { submissionUrl } = req.body

    const assignment = await Assignment.findById(assignmentId)
    if (!assignment) return res.status(404).json({ message: "Assignment not found" })

    // Check duplicate submission
    let submission = await AssignmentSubmission.findOne({ studentId, assignmentId })
    if (submission) {
      submission.contentUrl = submissionUrl
      submission.submittedAt = new Date()
      submission.status = "submitted"
      await submission.save()
    } else {
      submission = await AssignmentSubmission.create({
        assignmentId,
        studentId,
        contentUrl: submissionUrl,
        status: "submitted",
      })
    }

    notifyStudentUpdate(studentId, "assignments", "Assignment submitted successfully!")

    res.json({ success: true, message: "Assignment submitted successfully", submission })
  } catch (e) {
    console.error("SUBMIT ASSIGNMENT:", e)
    res.status(500).json({ message: "Failed to submit assignment" })
  }
}

/**
 * GET /api/lms/student/quizzes
 */
export const getStudentQuizzes = async (req, res) => {
  try {
    const studentId = req.user._id

    const enrollments = await Enrollment.find({ studentId, status: { $in: ["approved", "completed"] } }).lean()
    const courseIds = enrollments.map(e => e.courseId)

    const quizzes = await Quiz.find({ courseId: { $in: courseIds } })
      .populate("courseId", "title subject")
      .sort({ createdAt: -1 })
      .lean()

    const attempts = await QuizAttempt.find({ studentId }).lean()
    
    // Group attempts by quizId and take the best one
    const attemptsMap = {}
    attempts.forEach(a => {
      const qid = String(a.quizId)
      if (!attemptsMap[qid] || a.score > attemptsMap[qid].score) {
        attemptsMap[qid] = a
      }
    })

    const result = quizzes.map(q => {
      const bestAttempt = attemptsMap[String(q._id)]
      return {
        _id: q._id,
        title: q.title,
        course: q.courseId?.title || "Course",
        timeLimit: q.timeLimit,
        questionsCount: q.questions?.length || 0,
        questions: q.questions || [], // returned for taking quiz
        passingScore: `${q.passingScore}%`,
        status: bestAttempt ? (bestAttempt.passed ? "passed" : "failed") : "available",
        score: bestAttempt ? `${bestAttempt.score}%` : null,
        attemptedDate: bestAttempt ? bestAttempt.attemptedAt : null,
      }
    })

    res.json({ success: true, quizzes: result })
  } catch (e) {
    console.error("GET QUIZZES:", e)
    res.status(500).json({ message: "Failed to fetch quizzes" })
  }
}

/**
 * POST /api/lms/student/quizzes/:id/attempt
 */
export const attemptQuiz = async (req, res) => {
  try {
    const studentId = req.user._id
    const quizId = req.params.id
    const { answers } = req.body // Array of option indexes chosen: [0, 1, 2...]

    const quiz = await Quiz.findById(quizId)
    if (!quiz) return res.status(404).json({ message: "Quiz not found" })

    // Grade quiz
    let correctCount = 0
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctOption) {
        correctCount++
      }
    })

    const totalQuestions = quiz.questions.length
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const passed = score >= quiz.passingScore

    const attempt = await QuizAttempt.create({
      quizId,
      studentId,
      answers,
      score,
      passed,
    })

    notifyStudentUpdate(studentId, "quizzes", passed ? "You passed the quiz!" : "Quiz completed. Keep trying!")

    res.json({
      success: true,
      score,
      passed,
      correctCount,
      totalQuestions,
      attempt,
    })
  } catch (e) {
    console.error("ATTEMPT QUIZ:", e)
    res.status(500).json({ message: "Failed to process quiz attempt" })
  }
}

/**
 * GET /api/lms/student/calendar
 */
export const getStudentCalendar = async (req, res) => {
  try {
    const studentId = req.user._id

    const enrollments = await Enrollment.find({ studentId, status: { $in: ["approved", "completed"] } }).lean()
    const courseIds = enrollments.map(e => e.courseId)

    const events = await CalendarEvent.find({ courseId: { $in: courseIds } })
      .populate("courseId", "title subject")
      .sort({ date: 1 })
      .lean()

    const result = events.map(e => ({
      _id: e._id,
      title: e.title,
      date: e.date,
      time: e.time,
      type: e.type,
      course: e.courseId?.title || "Course",
      meetLink: e.meetLink,
    }))

    res.json({ success: true, events: result })
  } catch (e) {
    console.error("GET CALENDAR:", e)
    res.status(500).json({ message: "Failed to fetch calendar events" })
  }
}

/**
 * GET /api/lms/student/downloads
 */
export const getStudentDownloads = async (req, res) => {
  try {
    const studentId = req.user._id

    const enrollments = await Enrollment.find({ studentId, status: { $in: ["approved", "completed"] } }).lean()
    const courseIds = enrollments.map(e => e.courseId)

    const downloads = await Download.find({ courseId: { $in: courseIds } })
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .lean()

    const result = downloads.map(d => ({
      _id: d._id,
      name: d.name,
      category: d.category,
      size: d.size,
      course: d.courseId?.title || "Course",
      fileUrl: d.fileUrl,
    }))

    res.json({ success: true, downloads: result })
  } catch (e) {
    console.error("GET DOWNLOADS:", e)
    res.status(500).json({ message: "Failed to fetch downloads" })
  }
}

// ─────────────────────────────────────────────────────────────
//  ADMIN CONTROL ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/courses-list (Helper for options dropdown)
 */
export const adminGetCoursesList = async (req, res) => {
  try {
    const courses = await Course.find({}).select("title subject").sort({ title: 1 }).lean()
    res.json({ success: true, courses })
  } catch (e) {
    res.status(500).json({ message: "Failed to load courses list" })
  }
}

/**
 * GET /api/admin/student/:id/academics
 */
export const getStudentAcademicDetails = async (req, res) => {
  try {
    const studentId = req.params.id

    const student = await User.findById(studentId).select("name email").lean()
    if (!student) return res.status(404).json({ message: "Student not found" })

    // Enrollments
    const enrollments = await Enrollment.find({ studentId })
      .populate("courseId", "title subject")
      .lean()
    const courseIds = enrollments.map(e => e.courseId?._id).filter(Boolean)

    // Attendance
    const attendance = await Attendance.find({ student: studentId })
      .populate({
        path: "session",
        select: "title date time"
      })
      .sort({ createdAt: -1 })
      .lean()

    // Assignments & Submissions
    const assignments = await Assignment.find({ courseId: { $in: courseIds }, status: "active" })
      .populate("courseId", "title")
      .lean()
    const submissions = await AssignmentSubmission.find({ studentId }).lean()

    // Quizzes & Attempts
    const quizzes = await Quiz.find({ courseId: { $in: courseIds } })
      .populate("courseId", "title")
      .lean()
    const quizAttempts = await QuizAttempt.find({ studentId }).lean()

    // Calendar
    const events = await CalendarEvent.find({ courseId: { $in: courseIds } })
      .populate("courseId", "title")
      .sort({ date: 1 })
      .lean()

    // Downloads
    const downloads = await Download.find({ courseId: { $in: courseIds } })
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .lean()

    // Certificates
    const certificates = await Certificate.find({ studentId })
      .populate("courseId", "title subject")
      .sort({ issuedDate: -1 })
      .lean()

    res.json({
      success: true,
      student,
      enrollments,
      attendance,
      assignments,
      submissions,
      quizzes,
      quizAttempts,
      events,
      downloads,
      certificates,
    })
  } catch (e) {
    console.error("GET ACADEMIC DETAILS:", e)
    res.status(500).json({ message: "Failed to load academic records" })
  }
}

/**
 * POST /api/admin/student/:id/attendance
 */
export const adminMarkAttendance = async (req, res) => {
  try {
    const studentId = req.params.id
    const { sessionId, sessionTitle, status, progress } = req.body

    let finalSessionId = sessionId
    // If sessionId is not provided or is custom, we can check or create a Session, or create a mock/placeholder
    if (!finalSessionId) {
      // Find or create a default session for tracking purposes
      const Session = (await import("../models/Session.js")).default
      // Create a Session just to satisfy references
      const newSess = await Session.create({
        title: sessionTitle || "LMS Live Interactive Session",
        date: new Date().toISOString().split("T")[0],
        time: "10:00 AM",
        professor: req.user._id, // admin as prof fallback
        students: [{ student: studentId, status: "enrolled" }],
      })
      finalSessionId = newSess._id
    }

    const record = await Attendance.findOneAndUpdate(
      { session: finalSessionId, student: studentId },
      { status, progress: progress || 100 },
      { upsert: true, new: true }
    )

    await AdminLog.create({
      admin: req.user._id,
      action: `Marked attendance for student`,
      target: String(studentId),
      description: `Session: ${finalSessionId}, Status: ${status}, Progress: ${progress}%`,
    })

    notifyStudentUpdate(studentId, "attendance", "Your attendance has been updated.")

    res.json({ success: true, record })
  } catch (e) {
    console.error("ADMIN MARK ATTENDANCE:", e)
    res.status(500).json({ message: "Failed to mark attendance" })
  }
}

/**
 * PUT /api/admin/student/:id/assignments/:submissionId/grade
 */
export const adminGradeAssignment = async (req, res) => {
  try {
    const studentId = req.params.id
    const { submissionId } = req.params
    const { grade, feedback } = req.body

    const submission = await AssignmentSubmission.findById(submissionId)
    if (!submission) return res.status(404).json({ message: "Submission not found" })

    submission.grade = grade
    submission.feedback = feedback || ""
    submission.status = "graded"
    await submission.save()

    await AdminLog.create({
      admin: req.user._id,
      action: `Graded assignment submission`,
      target: String(studentId),
      description: `SubmissionId: ${submissionId}, Grade: ${grade}`,
    })

    notifyStudentUpdate(studentId, "assignments", `Your assignment has been graded: ${grade}`)

    res.json({ success: true, submission })
  } catch (e) {
    console.error("ADMIN GRADE ASSIGNMENT:", e)
    res.status(500).json({ message: "Failed to grade assignment" })
  }
}

/**
 * POST /api/admin/assignments
 */
export const adminCreateAssignment = async (req, res) => {
  try {
    const { courseId, title, description, points, dueDate } = req.body

    const assignment = await Assignment.create({
      courseId,
      title,
      description,
      points: points || 100,
      dueDate,
    })

    await AdminLog.create({
      admin: req.user._id,
      action: `Created new assignment`,
      target: String(courseId),
      description: `Title: ${title}, Points: ${points}, Due: ${dueDate}`,
    })

    // Notify all approved students of the course
    const enrollments = await Enrollment.find({ courseId, status: { $in: ["approved", "completed"] } }).select("studentId")
    enrollments.forEach(e => {
      notifyStudentUpdate(e.studentId, "assignments", `New assignment: "${title}" is assigned.`)
    })

    res.json({ success: true, assignment })
  } catch (e) {
    console.error("ADMIN CREATE ASSIGNMENT:", e)
    res.status(500).json({ message: "Failed to create assignment" })
  }
}

/**
 * POST /api/admin/quizzes
 */
export const adminCreateQuiz = async (req, res) => {
  try {
    const { courseId, title, timeLimit, passingScore, questions } = req.body

    const quiz = await Quiz.create({
      courseId,
      title,
      timeLimit: timeLimit || "15 min",
      passingScore: passingScore || 70,
      questions,
    })

    await AdminLog.create({
      admin: req.user._id,
      action: `Created new quiz`,
      target: String(courseId),
      description: `Title: ${title}, Questions: ${questions.length}`,
    })

    // Notify all approved students of the course
    const enrollments = await Enrollment.find({ courseId, status: { $in: ["approved", "completed"] } }).select("studentId")
    enrollments.forEach(e => {
      notifyStudentUpdate(e.studentId, "quizzes", `New assessment quiz: "${title}" is available.`)
    })

    res.json({ success: true, quiz })
  } catch (e) {
    console.error("ADMIN CREATE QUIZ:", e)
    res.status(500).json({ message: "Failed to create quiz" })
  }
}

/**
 * POST /api/admin/events
 */
export const adminCreateEvent = async (req, res) => {
  try {
    const { courseId, title, date, time, type, meetLink } = req.body

    const event = await CalendarEvent.create({
      courseId,
      title,
      date,
      time,
      type: type || "class",
      meetLink: meetLink || "",
    })

    await AdminLog.create({
      admin: req.user._id,
      action: `Scheduled calendar event`,
      target: String(courseId),
      description: `Title: ${title}, Date: ${date}, Type: ${type}`,
    })

    const enrollments = await Enrollment.find({ courseId, status: { $in: ["approved", "completed"] } }).select("studentId")
    enrollments.forEach(e => {
      notifyStudentUpdate(e.studentId, "calendar", `New calendar schedule: "${title}" is added.`)
    })

    res.json({ success: true, event })
  } catch (e) {
    console.error("ADMIN CREATE EVENT:", e)
    res.status(500).json({ message: "Failed to schedule event" })
  }
}

/**
 * POST /api/admin/downloads
 */
export const adminCreateDownload = async (req, res) => {
  try {
    const { courseId, name, category, size } = req.body

    // Resolve file URL — prefer uploaded file, fall back to plain URL
    let fileUrl = req.body.fileUrl || ""
    let fileSize = size || "1.0 MB"

    if (req.file) {
      // File was uploaded — build the server-relative URL
      fileUrl = `/uploads/lms/downloads/${req.file.filename}`
      // Auto-calculate human-readable size
      const bytes = req.file.size
      if (bytes < 1024) fileSize = `${bytes} B`
      else if (bytes < 1024 * 1024) fileSize = `${(bytes / 1024).toFixed(1)} KB`
      else fileSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    if (!fileUrl) return res.status(400).json({ message: "Provide a file URL or upload a file" })

    const download = await Download.create({
      courseId,
      name,
      category: category || "Slides",
      size: fileSize,
      fileUrl,
    })

    await AdminLog.create({
      admin: req.user._id,
      action: `Uploaded/added resource material`,
      target: String(courseId),
      description: `Name: ${name}, Category: ${category}, File: ${fileUrl}`,
    })

    const enrollments = await Enrollment.find({ courseId, status: { $in: ["approved", "completed"] } }).select("studentId")
    enrollments.forEach(e => {
      notifyStudentUpdate(e.studentId, "downloads", `New resource added: "${name}" is available for download.`)
    })

    res.json({ success: true, download })
  } catch (e) {
    console.error("ADMIN CREATE DOWNLOAD:", e)
    res.status(500).json({ message: "Failed to create resource download" })
  }
}

/**
 * DELETE /api/admin/student/:id/quizzes/:quizId/attempts
 */
export const adminResetQuizAttempts = async (req, res) => {
  try {
    const studentId = req.params.id
    const { quizId } = req.params

    await QuizAttempt.deleteMany({ studentId, quizId })

    await AdminLog.create({
      admin: req.user._id,
      action: `Reset quiz attempts`,
      target: String(studentId),
      description: `Quiz: ${quizId}`,
    })

    notifyStudentUpdate(studentId, "quizzes", "Your quiz attempts have been reset by admin.")

    res.json({ success: true, message: "Quiz attempts reset successfully" })
  } catch (e) {
    console.error("ADMIN RESET QUIZ:", e)
    res.status(500).json({ message: "Failed to reset attempts" })
  }
}

// ─────────────────────────────────────────────────────────────
//  ADMIN LIST ENDPOINTS — for LMS Content Manager page
// ─────────────────────────────────────────────────────────────

export const adminListAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({})
      .populate("courseId", "title subject")
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, assignments })
  } catch (e) {
    res.status(500).json({ message: "Failed to list assignments" })
  }
}

export const adminListQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({})
      .populate("courseId", "title subject")
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, quizzes })
  } catch (e) {
    res.status(500).json({ message: "Failed to list quizzes" })
  }
}

export const adminListEvents = async (req, res) => {
  try {
    const events = await CalendarEvent.find({})
      .populate("courseId", "title subject")
      .sort({ date: 1 })
      .lean()
    res.json({ success: true, events })
  } catch (e) {
    res.status(500).json({ message: "Failed to list events" })
  }
}

export const adminListDownloads = async (req, res) => {
  try {
    const downloads = await Download.find({})
      .populate("courseId", "title subject")
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, downloads })
  } catch (e) {
    res.status(500).json({ message: "Failed to list downloads" })
  }
}

// ─────────────────────────────────────────────────────────────
//  ADMIN ISSUE CERTIFICATE
// ─────────────────────────────────────────────────────────────
export const adminIssueCertificate = async (req, res) => {
  try {
    const { studentId, courseId } = req.body
    if (!studentId || !courseId) return res.status(400).json({ message: "studentId and courseId required" })

    let certificateUrl = req.body.certificateUrl || ""
    if (req.file) {
      certificateUrl = `/uploads/certs/${req.file.filename}`
    }

    const uniqueCode = `VA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    let cert = await Certificate.findOne({ studentId, courseId })
    const enrollment = await Enrollment.findOne({ studentId, courseId })

    if (cert) {
      cert.certificateUrl = certificateUrl
      // Optionally update unique code or issued date if needed, but usually we just update the file
      cert.issuedDate = Date.now()
      await cert.save()
    } else {
      cert = await Certificate.create({
        studentId,
        courseId,
        enrollmentId: enrollment?._id,
        certificateUrl,
        uniqueCode,
      })
    }

    await AdminLog.create({
      admin: req.user._id,
      action: "Issued certificate",
      target: String(studentId),
      description: `Course: ${courseId}, Code: ${uniqueCode}`,
    })

    notifyStudentUpdate(studentId, "certificates", `🎓 Congratulations! Your certificate has been issued.`)

    res.json({ success: true, certificate: cert })
  } catch (e) {
    console.error("ISSUE CERT:", e)
    res.status(500).json({ message: "Failed to issue certificate" })
  }
}
