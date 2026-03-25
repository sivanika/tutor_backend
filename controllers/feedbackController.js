import Feedback from "../models/Feedback.js";
import Notification from "../models/Notification.js";
import { emitNotification } from "../socketHandler.js";

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

    // Notify Professor
    const notif = await Notification.create({
      user: professorId,
      title: "New Review Received",
      message: `A student left a ${rating}-star review for you.`,
      type: "info",
    });
    emitNotification(professorId, notif);

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
