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

    global.io?.emit("dashboard:update")

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
      .populate("students.student", "name email")
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

    // Check if student is already enrolled
    const alreadyEnrolled = session.students.some(
      (s) => s.student.toString() === req.user.id
    )
    if (alreadyEnrolled)
      return res.json({ message: "Already enrolled" })

    session.students.push({
      student: req.user.id,
      status: "enrolled",
      enrolledAt: new Date(),
    })
    await session.save()

    global.io?.emit("dashboard:update")

    res.json({ message: "Enrolled successfully" })
  } catch (err) {
    console.error("ENROLL ERROR:", err)
    res.status(500).json({ message: "Enroll failed" })
  }
}


// MARK SESSION COMPLETE (Student)
export const markSessionComplete = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)

    if (!session)
      return res.status(404).json({ message: "Session not found" })

    // Find the student's enrollment entry
    const enrollment = session.students.find(
      (s) => s.student.toString() === req.user.id
    )

    if (!enrollment)
      return res.status(400).json({ message: "You are not enrolled in this session" })

    if (enrollment.status === "completed")
      return res.json({ message: "Already marked as completed" })

    enrollment.status = "completed"
    enrollment.completedAt = new Date()
    await session.save()

    global.io?.emit("dashboard:update")

    res.json({ message: "Session marked as completed" })
  } catch (err) {
    console.error("MARK COMPLETE ERROR:", err)
    res.status(500).json({ message: "Mark complete failed" })
  }
}


// PROFESSOR SESSIONS
export const getProfessorSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      professor: req.user.id,
    }).populate("students.student", "name email")

    res.json(sessions)
  } catch (err) {
    console.error("GET PROFESSOR SESSIONS ERROR:", err)
    res.status(500).json({ message: "Fetch failed" })
  }
}


// GET STUDENT ENROLLED SESSIONS
export const getEnrolledSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      "students.student": req.user.id,
    }).populate("professor", "name email")
      .populate("students.student", "name email");

    // Attach the current student's status to each session for easy frontend use
    const enriched = sessions.map((s) => {
      const sessionObj = s.toObject();
      const myEnrollment = sessionObj.students.find(
        (st) => st.student?._id?.toString() === req.user.id ||
          st.student?.toString() === req.user.id
      );
      sessionObj.myStatus = myEnrollment?.status || "enrolled";
      sessionObj.myCompletedAt = myEnrollment?.completedAt || null;
      return sessionObj;
    });

    res.json(enriched);
  } catch (err) {
    console.error("ENROLLED SESSIONS ERROR:", err);
    res.status(500).json({ message: "Failed to load sessions" });
  }
};


// CANCEL SESSION (Professor only)
export const cancelSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return res.status(404).json({ message: "Session not found" })
    if (session.professor.toString() !== req.user.id)
      return res.status(403).json({ message: "Only the session professor can cancel it" })
    if (session.status === "cancelled")
      return res.json({ message: "Session already cancelled" })

    session.status = "cancelled"
    await session.save()

    global.io?.emit("dashboard:update")

    res.json({ message: "Session cancelled", session })
  } catch (err) {
    console.error("CANCEL SESSION ERROR:", err)
    res.status(500).json({ message: "Cancel failed" })
  }
}


// RESCHEDULE SESSION (Professor only) — update date and/or time
export const rescheduleSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return res.status(404).json({ message: "Session not found" })
    if (session.professor.toString() !== req.user.id)
      return res.status(403).json({ message: "Only the session professor can reschedule it" })
    if (session.status === "cancelled")
      return res.status(400).json({ message: "Cannot reschedule a cancelled session" })

    const { date, time } = req.body
    if (!date && !time)
      return res.status(400).json({ message: "Provide at least a new date or time" })

    if (date) session.date = date
    if (time) session.time = time
    if (session.status === "completed") session.status = "active"
    await session.save()

    global.io?.emit("dashboard:update")

    res.json({ message: "Session rescheduled", session })
  } catch (err) {
    console.error("RESCHEDULE SESSION ERROR:", err)
    res.status(500).json({ message: "Reschedule failed" })
  }
}
