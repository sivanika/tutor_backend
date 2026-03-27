import User from "../models/User.js";
import { sendApprovalMail } from "../utils/sendEmail.js"; // ✅ Add this import

export const getPendingProfessors = async (req, res) => {
  try {
    const professors = await User.find({
      role: "professor",
      isVerified: false,
    });
    res.json(professors);
  } catch (error) {
    console.error("getPendingProfessors error:", error.message);
    res.status(500).json({ message: "Failed to fetch pending professors" });
  }
};

export const verifyProfessor = async (req, res) => {
  try {
    const professor = await User.findById(req.params.id);

    if (!professor) {
      return res.status(404).json({ message: "Professor not found" });
    }

    professor.isVerified = true;
    await professor.save();

    // ✅ Send approval email after saving
    try {
      await sendApprovalMail(professor.email, professor.name);
      console.log("Approval email sent to:", professor.email);
    } catch (emailError) {
      // Email failure should NOT block the approval response
      console.error("Approval email failed:", emailError.message);
    }

    res.json({ message: "Professor verified" });
  } catch (error) {
    console.error("verifyProfessor error:", error.message);
    res.status(500).json({ message: "Verification failed" });
  }
};