import mongoose from "mongoose"

const certificateSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
    },
    certificateUrl: { type: String, default: "" },  // path to generated PDF in /uploads/certs/
    issuedDate:     { type: Date, default: Date.now },
    uniqueCode:     { type: String, unique: true },  // e.g. TH-2026-A3F9X — verifiable code
  },
  { timestamps: true }
)

// A student can only have one certificate per course
certificateSchema.index({ studentId: 1, courseId: 1 }, { unique: true })

export default mongoose.model("Certificate", certificateSchema)
