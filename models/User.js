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

  // ── Onboarding status ──────────────────────────────
  profileCompleted: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ["active", "disabled", "banned"],
    default: "active",
  },

  // ── Common profile ─────────────────────────────────
  headline: String,
  location: String,
  bio: String,
  teachingStyle: String,
  specializations: String,

  // ── Professor fields ───────────────────────────────
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

  // ── Professor uploaded files ───────────────────────
  profilePhoto: String,   // path on disk
  degreeCertificate: String,
  governmentId: String,
  videoIntroduction: String,

  // ── Student fields ─────────────────────────────────
  birthDate: String,
  gradeLevel: String,
  school: String,
  learningGoals: String,
  parentName: String,
  parentEmail: String,
  parentPhone: String,
  parentRelationship: String,
  parentConsent: Boolean,
  subscriptionTier: { type: String, default: null }, // Legacy string identifier (free_trial, premium)
  subscriptionPlan: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan" }, // New dynamic plan reference
  viewedProfessors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Tracks unique profiles viewed (students → professors)
  viewedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Tracks unique student profiles viewed (professors)
  currentPlanSessionsBooked: { type: Number, default: 0 }, // Tracks sessions booked in current cycle

  subscriptionStatus: {
    type: String,
    enum: ["active", "inactive", "expired", "cancelled"],
    default: "inactive",
  },
  subscriptionStartDate: Date,
  subscriptionExpiryDate: Date,
  razorpayPaymentId: String,
  razorpayOrderId: String,
  commissionRate: { type: Number, default: 18 }, // % for pay_per_session
  professorPreferences: String,

  // ── Student uploaded files ─────────────────────────
  studentPhoto: String,
  studentDocument: String,

  // ── Misc ───────────────────────────────────────────
  studentsHelped: { type: Number, default: 0 },

  // ── Featured / Recommended (admin-controlled) ──────
  isFeatured: { type: Boolean, default: false },
  featuredOrder: { type: Number, default: 0 },  // lower = appears first

  // ── Password reset (stores SHA256 hash, never plaintext) ──
  resetPasswordToken: String,
  resetPasswordExpire: Date,

}, { timestamps: true });

export default mongoose.model("User", userSchema);
