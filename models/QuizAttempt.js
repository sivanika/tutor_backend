import mongoose from "mongoose"

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [{ type: Number }], // chosen option index for each question
    score: { type: Number, required: true }, // percentage, e.g. 85
    passed: { type: Boolean, required: true },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

quizAttemptSchema.index({ quizId: 1, studentId: 1 })
quizAttemptSchema.index({ studentId: 1 })

export default mongoose.model("QuizAttempt", quizAttemptSchema)
