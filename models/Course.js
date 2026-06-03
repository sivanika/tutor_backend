import mongoose from "mongoose"

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    subject: { type: String, required: true, trim: true },
    instructor: { type: String, default: "Admin", trim: true },
    thumbnailUrl: { type: String, default: "" },
    videoUrl: { type: String, required: true, trim: true },
    duration: { type: String, default: "Self-paced" },
    level: { type: String, default: "All Levels" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default mongoose.model("Course", courseSchema)
