import mongoose from "mongoose"

const adminLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    action: String,       // "Verified Professor", "Changed User Status", etc.
    target: String,       // user email / name / id
    description: String,  // readable message
  },
  { timestamps: true }
)

export default mongoose.model("AdminLog", adminLogSchema)
