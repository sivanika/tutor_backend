import mongoose from "mongoose"

const attendanceSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      default: "absent",
    },
    progress: {
      type: Number, // percentage
      default: 0,
    },
  },
  { timestamps: true }
)

export default mongoose.model("Attendance", attendanceSchema)
