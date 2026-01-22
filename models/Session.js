import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    level: { type: String, required: true },
    date: String,
    time: String,
    meetLink: { type: String, required: true },

    professor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
)

export default mongoose.model("Session", sessionSchema)
