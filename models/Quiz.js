import mongoose from "mongoose"

const quizQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOption: { type: Number, required: true }, // 0-indexed correct option
})

const quizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    timeLimit: { type: String, default: "15 min" },
    passingScore: { type: Number, default: 70 }, // percentage
    questions: [quizQuestionSchema],
  },
  { timestamps: true }
)

quizSchema.index({ courseId: 1 })

export default mongoose.model("Quiz", quizSchema)
