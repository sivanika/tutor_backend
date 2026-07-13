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
    mode: {
      type: String,
      enum: ["Remote", "On-site", "Hybrid"],
      default: "Remote",
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
    responsibilities: {
      type: [String],
      default: [],
    },
    eligibility: {
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    salary: {
      type: String,
      default: "",
    },
    openings: {
      type: Number,
      default: 1,
    },
    deadline: {
      type: Date,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("JobPosition", jobPositionSchema);
