import mongoose from "mongoose"

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    icon: { type: String, default: "📢" },
    priority: { type: Boolean, default: false },   // urgent / priority flag
    active: { type: Boolean, default: true },       // visible on homepage
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

export default mongoose.model("Announcement", announcementSchema)
