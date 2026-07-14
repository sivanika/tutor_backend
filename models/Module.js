import mongoose from "mongoose"

const moduleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 }, // display order within course
    videoUrl: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },
    quiz: [
      {
        questionText: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctOption: { type: Number, required: true }
      }
    ],
  },
  { timestamps: true }
)

// Ensure modules in a course are ordered correctly
moduleSchema.index({ courseId: 1, order: 1 })

export default mongoose.model("Module", moduleSchema)
