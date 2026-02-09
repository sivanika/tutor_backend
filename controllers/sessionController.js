import Session from "../models/Session.js"

// CREATE SESSION (Professor only)
export const createSession = async (req, res) => {
  try {
    if (req.user.role !== "professor")
      return res.status(403).json({ message: "Forbidden" })

    const session = await Session.create({
      ...req.body,
      professor: req.user.id,
    })

    io.emit("dashboard:update")   // 🔴 Real-time update

    res.json(session)
  } catch (err) {
    console.error("CREATE SESSION ERROR:", err)
    res.status(500).json({ message: "Create failed" })
  }
}


// GET ALL SESSIONS (Student can see all available sessions)
export const getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.find()
      .populate("professor", "name email")
    res.json(sessions)
  } catch (err) {
    console.error("GET ALL SESSIONS ERROR:", err)
    res.status(500).json({ message: "Fetch failed" })
  }
}


// ENROLL SESSION (Student)
export const enrollSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)

    if (!session)
      return res.status(404).json({ message: "Session not found" })

    if (session.students.includes(req.user.id))
      return res.json({ message: "Already enrolled" })

    session.students.push(req.user.id)
    await session.save()

    io.emit("dashboard:update")   // 🔴 Real-time update

    res.json({ message: "Enrolled successfully" })
  } catch (err) {
    console.error("ENROLL ERROR:", err)
    res.status(500).json({ message: "Enroll failed" })
  }
}


// PROFESSOR SESSIONS
export const getProfessorSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      professor: req.user.id,
    }).populate("students", "name email")

    res.json(sessions)
  } catch (err) {
    console.error("GET PROFESSOR SESSIONS ERROR:", err)
    res.status(500).json({ message: "Fetch failed" })
  }
}


// 🔥 NEW: GET STUDENT ENROLLED SESSIONS
// 🔥 GET STUDENT ENROLLED SESSIONS
export const getEnrolledSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      students: req.user.id,   // ✅ correct field
    }).populate("professor", "name email");

    res.json(sessions);
  } catch (err) {
    console.error("ENROLLED SESSIONS ERROR:", err);
    res.status(500).json({ message: "Failed to load sessions" });
  }
};


