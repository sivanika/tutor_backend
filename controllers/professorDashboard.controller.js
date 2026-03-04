import Session from "../models/Session.js";
import User from "../models/User.js";

// GET DASHBOARD STATS (Professor)
export const getDashboardStats = async (req, res) => {
  try {
    const professorId = req.user.id;

    const sessions = await Session.find({ professor: professorId });
    const activeSessions = sessions.filter(s => s.status === "active").length;

    // Collect unique students across all sessions
    // s.students is an array of { student (ObjectId), status, enrolledAt }
    const studentIdSet = new Set();
    sessions.forEach(s =>
      s.students.forEach(enrollment => {
        if (enrollment.student) studentIdSet.add(enrollment.student.toString());
      })
    );
    const totalStudents = studentIdSet.size;

    // Earnings estimate
    const earnings = sessions.reduce((sum, s) => sum + s.students.length * 500, 0);

    res.json({ totalStudents, activeSessions, earnings });
  } catch (err) {
    console.error("getDashboardStats error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET MY STUDENTS (Professor)
export const getMyStudents = async (req, res) => {
  try {
    const professorId = req.user.id;

    // Populate the nested `students.student` path
    const sessions = await Session.find({ professor: professorId })
      .populate("students.student", "name email");

    // Flatten and deduplicate students
    const seen = new Set();
    const students = [];
    sessions.forEach(session => {
      session.students.forEach(enrollment => {
        const student = enrollment.student;
        if (student && !seen.has(student._id.toString())) {
          seen.add(student._id.toString());
          students.push({
            id: student._id,
            name: student.name,
            email: student.email,
            course: session.title,
          });
        }
      });
    });

    res.json(students);
  } catch (err) {
    console.error("getMyStudents error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// GET PROFESSOR PROFILE
export const getProfile = async (req, res) => {
  try {
    const professor = await User.findById(req.user.id).select("-password");
    res.json(professor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.user.id, req.body, { new: true }).select("-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE CREDENTIALS
export const updateCredentials = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { credentials: req.body },
      { new: true }
    ).select("-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
