import mongoose from "mongoose"

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      text: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true }
)

// Index for fast participant lookup
conversationSchema.index({ participants: 1 })

export default mongoose.model("Conversation", conversationSchema)
