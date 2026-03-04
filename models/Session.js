import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    level: { type: String, required: true },
    date: String,
    time: String,
    meetLink: { type: String, required: true },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    professor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    students: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        enrolledAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["enrolled", "attended", "completed"],
          default: "enrolled",
        },
        completedAt: Date,
      },
    ],
  },
  { timestamps: true }
)

export default mongoose.model("Session", sessionSchema)
