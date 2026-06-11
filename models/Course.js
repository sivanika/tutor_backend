import mongoose from "mongoose"

const courseSchema = new mongoose.Schema(
  {
    // ── Existing fields (kept for backward compatibility) ──────────────────
    title:        { type: String, required: true, trim: true },
    description:  { type: String, required: true },
    subject:      { type: String, required: true, trim: true },
    instructor:   { type: String, default: "Admin", trim: true },
    thumbnailUrl: { type: String, default: "" },
    videoUrl:     { type: String, default: "" },  // optional promo/intro video
    duration:     { type: String, default: "Self-paced" },
    level:        { type: String, default: "All Levels" },
    isActive:     { type: Boolean, default: true },

    // ── LMS fields ─────────────────────────────────────────────────────────
    price:     { type: Number, default: 0 },         // 0 = free
    startDate: { type: Date, default: null },
    endDate:   { type: Date, default: null },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tags:      [String],
    category:  { type: String, default: "" },
  },
  { timestamps: true }
)

export default mongoose.model("Course", courseSchema)
