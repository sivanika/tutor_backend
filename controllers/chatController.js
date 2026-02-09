import Message from "../models/Message.js"
import mongoose from "mongoose"

export const getMessagesBySession = async (req, res) => {
  try {
    const { sessionId } = req.params

    // ✅ HARD VALIDATION
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID" })
    }

    const messages = await Message.find({ session: sessionId })
      .populate("sender", "name role")
      .sort({ createdAt: 1 })

    res.json(messages)
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err)
    res.status(500).json({ message: "Failed to fetch messages" })
  }
}

export const sendMessage = async (req, res) => {
  try {
    const { sessionId, text } = req.body

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID" })
    }

    const message = await Message.create({
      session: sessionId,
      sender: req.user._id,
      text,
    })

    res.status(201).json(message)
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err)
    res.status(500).json({ message: "Message send failed" })
  }
}
