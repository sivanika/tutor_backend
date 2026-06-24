import mongoose from "mongoose";

const careerApplicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    coverLetter: {
      type: String,
      required: true,
    },
    positionId: {
      type: String,
      required: true,
    },
    positionTitle: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Selected", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("CareerApplication", careerApplicationSchema);
