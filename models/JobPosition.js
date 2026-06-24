import mongoose from "mongoose";

const jobPositionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    dept: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("JobPosition", jobPositionSchema);
