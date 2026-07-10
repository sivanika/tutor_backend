import mongoose from "mongoose"

const downloadSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "Slides" }, // Slides, Datasets, Assignments, Other
    size: { type: String, default: "1.0 MB" },
    fileUrl: { type: String, required: true },
  },
  { timestamps: true }
)

downloadSchema.index({ courseId: 1 })

export default mongoose.model("Download", downloadSchema)
