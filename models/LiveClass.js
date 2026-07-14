import mongoose from "mongoose";

const syllabusWeekSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  topic: { type: String, required: true },
  details: { type: String, default: "" },
}, { _id: false });

const liveClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "Beginner to Advanced"],
      required: true,
    },
    instructor: { type: String, required: true, trim: true },
    instructorRole: { type: String, default: "" },
    startDate: { type: String, required: true },        // e.g. "21 July 2026"
    schedule: { type: String, required: true },         // e.g. "Mon / Wed / Fri · 7–8:30 PM IST"
    durationWeeks: { type: Number, required: true, min: 1 },
    seatsTotal: { type: Number, default: 30 },
    seatsLeft: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    gradient: { type: String, default: "from-[#1E9E8C] to-[#12283B]" },
    shortDesc: { type: String, required: true },
    longDesc: { type: String, default: "" },
    prerequisites: { type: [String], default: [] },
    syllabus: { type: [syllabusWeekSchema], default: [] },
    isPublished: { type: Boolean, default: true },
    cohort: { type: String, default: "" },
    days: { type: String, default: "" },
    time: { type: String, default: "" },
    seatsFilled: { type: Number, default: 0 },
    statusOverride: { type: String, default: "auto" },
    platform: { type: String, default: "Zoom" },
    meetingLink: { type: String, default: "" },
    autoRecord: { type: Boolean, default: true },
    trainerPhoto: { type: String, default: "" },
    trainerBio: { type: String, default: "" },
    whatsIncluded: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("LiveClass", liveClassSchema);
