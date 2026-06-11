import mongoose from "mongoose"

const lessonSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["video", "pdf", "quiz"],
      default: "video",
    },
    contentUrl: { type: String, default: "" }, // Multer disk path or external URL
    order: { type: Number, default: 0 },        // display order within module
    duration: { type: String, default: "" },    // e.g. "12:30" for video lessons
    isFree: { type: Boolean, default: false },  // true = preview without enrollment
    description: { type: String, default: "" },
  },
  { timestamps: true }
)

lessonSchema.index({ moduleId: 1, order: 1 })
lessonSchema.index({ courseId: 1 })

export default mongoose.model("Lesson", lessonSchema)
