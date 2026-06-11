import mongoose from "mongoose"

const lessonProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    completed:   { type: Boolean, default: false },
    completedAt: { type: Date, default: null },

    // For video auto-complete: track watch time
    watchedSeconds: { type: Number, default: 0 },
    totalSeconds:   { type: Number, default: 0 },
  },
  { timestamps: true }
)

// One progress record per student per lesson
lessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true })
lessonProgressSchema.index({ studentId: 1, courseId: 1 })

export default mongoose.model("LessonProgress", lessonProgressSchema)
