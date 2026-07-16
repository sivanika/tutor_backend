import mongoose from "mongoose";

const liveClassEnrollmentSchema = new mongoose.Schema(
  {
    student:       { type: mongoose.Schema.Types.ObjectId, ref: "User",      required: true },
    liveClass:     { type: mongoose.Schema.Types.ObjectId, ref: "LiveClass", required: true },
    amountPaid:    { type: Number, required: true, default: 0 },
    currency:      { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["pending", "paid", "free", "failed", "refunded"],
      default: "pending",
    },
    razorpayOrderId:   { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    enrolledAt:    { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Unique per student per class
liveClassEnrollmentSchema.index({ student: 1, liveClass: 1 }, { unique: true });

export default mongoose.model("LiveClassEnrollment", liveClassEnrollmentSchema);
