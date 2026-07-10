import mongoose from "mongoose"

const calendarEventSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    time: { type: String, required: true }, // Format: HH:MM AM/PM - HH:MM AM/PM
    type: {
      type: String,
      enum: ["class", "assignment", "exam"],
      default: "class",
    },
    meetLink: { type: String, default: "" },
  },
  { timestamps: true }
)

calendarEventSchema.index({ courseId: 1 })
calendarEventSchema.index({ date: 1 })

export default mongoose.model("CalendarEvent", calendarEventSchema)
