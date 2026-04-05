import mongoose from "mongoose";

const studentSubjectSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subjectId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  icon: {
    type: String
  },
  status: {
    type: String,
    enum: ["Open", "Pending", "Engaged"],
    default: "Open"
  },
  visible: {
    type: Boolean,
    default: true
  },
  requirement: {
    topic: String,
    description: String,
    time: String,
    budget: String
  },
  requests: [{
    professor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

export default mongoose.model("StudentSubject", studentSubjectSchema);
