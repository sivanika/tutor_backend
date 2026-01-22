import Attendance from "../models/Attendance.js"

// Mark attendance (Professor)
export const markAttendance = async (req, res) => {
  const { sessionId, studentId, status, progress } = req.body

  const record = await Attendance.findOneAndUpdate(
    { session: sessionId, student: studentId },
    { status, progress },
    { upsert: true, new: true }
  )

  res.json(record)
}

// Student view progress
export const getMyProgress = async (req, res) => {
  const records = await Attendance.find({ student: req.user.id })
    .populate("session", "title")

  res.json(records)
}
