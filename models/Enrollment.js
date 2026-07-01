import mongoose from "mongoose"

const enrollmentSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["applied", "approved", "rejected", "completed"],
      default: "applied",
    },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    enrolledDate:       { type: Date, default: Date.now },
    approvedDate:       { type: Date, default: null },
    completedDate:      { type: Date, default: null },
    rejectionReason:    { type: String, default: "" },
    
    // Payment details
    razorpayOrderId:    { type: String },
    razorpayPaymentId:  { type: String }, // transaction ID
    paymentStatus:      { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    paymentAmount:      { type: Number },
  },
  { timestamps: true }
)

// Prevent a student from applying to the same course twice
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true })

export default mongoose.model("Enrollment", enrollmentSchema)
