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

    // ── Pricing & social proof fields ──────────────────────────────────────
    oldPrice:  { type: Number, default: 0 },
    students:  { type: String, default: "0" },
    rating:    { type: Number, default: 0 },
    reviews:   { type: Number, default: 0 },
    bestseller:{ type: Boolean, default: false },

    // ── DRM & security ──────────────────────────────────────────────────────
    drm:       { type: String, default: "Signed URL (expiring)" },

    // ── Assessment & certification ──────────────────────────────────────────
    passScore:      { type: Number, default: 70 },
    attemptPolicy:  { type: String, default: "unlimited" },
    autoCertificate:{ type: Boolean, default: true },
    certIssuer:     { type: String, default: "Vishidh Academy" },
    certDomain:     { type: String, default: "vishidhacademy.com" },
  },
  { timestamps: true }
)

export default mongoose.model("Course", courseSchema)
