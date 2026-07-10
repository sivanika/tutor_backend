import mongoose from "mongoose"

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contentUrl: { type: String, default: "" }, // link or text of submission
    submittedAt: { type: Date, default: Date.now },
    grade: { type: String, default: "" }, // e.g. "95/100"
    feedback: { type: String, default: "" },
    status: {
      type: String,
      enum: ["submitted", "graded"],
      default: "submitted",
    },
  },
  { timestamps: true }
)

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 })
assignmentSubmissionSchema.index({ studentId: 1 })

export default mongoose.model("AssignmentSubmission", assignmentSubmissionSchema)
