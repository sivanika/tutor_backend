import mongoose from "mongoose"

const assignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    points: { type: Number, default: 100 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true }
)

assignmentSchema.index({ courseId: 1 })

export default mongoose.model("Assignment", assignmentSchema)
