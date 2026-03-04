import Feedback from "../models/Feedback.js";

// Student gives feedback
export const createFeedback = async (req, res) => {
  try {
    const { professorId, rating, message } = req.body;

    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can give feedback" });
    }

    const feedback = await Feedback.create({
      student: req.user.id,
      professor: professorId,
      rating,
      message,
    });

    res.json(feedback);
  } catch (err) {
    console.error("CREATE FEEDBACK ERROR:", err);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
};

// Professor views feedback
export const getProfessorFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ professor: req.user.id })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (err) {
    console.error("GET FEEDBACK ERROR:", err);
    res.status(500).json({ message: "Failed to load feedback" });
  }
};
