import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Keep for backwards compat with old session-based messages
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
  },
  { timestamps: true }
)

// Index for fast message lookup by conversation
messageSchema.index({ conversation: 1, createdAt: 1 })

export default mongoose.model("Message", messageSchema)
