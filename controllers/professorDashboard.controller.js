const Session = require("../models/Session");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");

exports.getDashboardStats = async (req, res) => {
  try {
    const professorId = req.user.id;

    const sessions = await Session.find({ professor: professorId });
    const activeSessions = sessions.filter(s => s.status === "active").length;

    const enrollments = await Enrollment.find({ professor: professorId });
    const totalStudents = new Set(enrollments.map(e => e.student.toString())).size;

    const earnings = enrollments.reduce((sum, e) => sum + e.price, 0);

    res.json({
      totalStudents,
      activeSessions,
      earnings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyStudents = async (req, res) => {
  try {
    const professorId = req.user.id;

    const students = await Enrollment.find({ professor: professorId })
      .populate("student", "name email")
      .populate("session", "title");

    res.json(students.map(e => ({
      id: e.student._id,
      name: e.student.name,
      email: e.student.email,
      course: e.session.title,
      sessionsCompleted: e.completedSessions
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProfile = async (req, res) => {
  const professor = await User.findById(req.user.id).select("-password");
  res.json(professor);
};

exports.updateProfile = async (req, res) => {
  const updated = await User.findByIdAndUpdate(
    req.user.id,
    req.body,
    { new: true }
  );
  res.json(updated);
};

exports.updateCredentials = async (req, res) => {
  const updated = await User.findByIdAndUpdate(
    req.user.id,
    { credentials: req.body },
    { new: true }
  );
  res.json(updated);
};
