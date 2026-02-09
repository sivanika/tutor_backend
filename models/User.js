import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,

  role: {
    type: String,
    enum: ["student", "professor", "admin"],
    default: "student",
  },

  // New fields for onboarding flow
  profileCompleted: {
    type: Boolean,
    default: false,   // false until student/professor submits full profile
  },

  isVerified: {
    type: Boolean,
    default: false,   // admin will approve later
  },

  status: {
    type: String,
    enum: ["active", "disabled", "banned"],
    default: "active",
  },

  // Common profile fields (already present)
  headline: String,
  location: String,
  bio: String,
  teachingStyle: String,
  specializations: String,

  // Professor specific fields (you can expand later)
  phone: String,
  country: String,
  timezone: String,
  highestDegree: String,
  fieldOfStudy: String,
  university: String,
  graduationYear: String,
  certifications: String,
  yearsExperience: String,
  teachingLevel: String,
  subjects: String,
  teachingPhilosophy: String,
  hourlyRate: String,
  availability: Object,

  // Student specific fields (optional now, can add step by step)
  birthDate: String,
  gradeLevel: String,
  school: String,
  learningGoals: String,
  parentName: String,
  parentEmail: String,
  parentPhone: String,

  studentsHelped: {
    type: Number,
    default: 0,
  },

  resetToken: String,
  resetTokenExpiry: Date,

}, { timestamps: true });

export default mongoose.model("User", userSchema);
