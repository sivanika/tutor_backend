import Conversation from "../models/Conversation.js"
import Message from "../models/Message.js"
import Notification from "../models/Notification.js"
import { emitNotification } from "../socketHandler.js"
import mongoose from "mongoose"

// GET /api/conversations — list all conversations for logged-in user
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email role profilePhoto studentPhoto")
      .sort({ updatedAt: -1 })

    // Attach unread count for each conversation
    const withUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
        })
        return { ...conv.toObject(), unreadCount }
      })
    )

    // Deduplicate: only keep the most recently updated conversation per unique other-user
    const seen = new Map()
    const deduplicated = withUnread.filter((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => String(p._id) !== String(req.user._id)
      )
      if (!otherParticipant) return true
      const otherId = String(otherParticipant._id)
      if (seen.has(otherId)) return false
      seen.set(otherId, true)
      return true
    })

    res.json(deduplicated)
  } catch (err) {
    console.error("GET CONVERSATIONS ERROR:", err)
    res.status(500).json({ message: "Failed to fetch conversations" })
  }
}


// POST /api/conversations — create or get existing conversation
export const getOrCreateConversation = async (req, res) => {
  try {
    const { otherUserId } = req.body

    if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Invalid user ID" })
    }

    const myId = req.user._id.toString()
    if (otherUserId === myId) {
      return res.status(400).json({ message: "Cannot chat with yourself" })
    }

    // Find ALL existing 1-on-1 conversations between these two users
    const existingConvs = await Conversation.find({
      $and: [
        { participants: req.user._id },
        { participants: new mongoose.Types.ObjectId(otherUserId) },
        // Only exact 2-person conversations
        { $expr: { $eq: [{ $size: "$participants" }, 2] } },
      ],
    })
      .populate("participants", "name email role profilePhoto studentPhoto")
      .sort({ updatedAt: -1 })

    // Use the most recently updated one if any exist
    let conversation = existingConvs[0] || null

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, new mongoose.Types.ObjectId(otherUserId)],
      })
      conversation = await conversation.populate(
        "participants",
        "name email role profilePhoto studentPhoto"
      )
    }

    res.json(conversation)
  } catch (err) {
    console.error("CREATE CONVERSATION ERROR:", err)
    res.status(500).json({ message: err.message || "Failed to create conversation" })
  }
}


// GET /api/conversations/:conversationId/messages — get messages
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" })
    }

    // Verify user is a participant
    const conversation = await Conversation.findById(conversationId)
    if (
      !conversation ||
      !conversation.participants.some((p) => p.equals(req.user._id))
    ) {
      return res.status(403).json({ message: "Not a participant" })
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "name role profilePhoto studentPhoto")
      .sort({ createdAt: 1 })

    res.json(messages)
  } catch (err) {
    console.error("GET MESSAGES ERROR:", err)
    res.status(500).json({ message: "Failed to fetch messages" })
  }
}

// PUT /api/conversations/:conversationId/read — mark all messages as read
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" })
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    )

    res.json({ success: true })
  } catch (err) {
    console.error("MARK READ ERROR:", err)
    res.status(500).json({ message: "Failed to mark as read" })
  }
}
// POST /api/conversations/:conversationId/messages — send a message (REST + socket push)
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { text } = req.body
    const senderId = req.user._id

    if (!text?.trim()) return res.status(400).json({ message: "Message text is required" })
    if (!mongoose.Types.ObjectId.isValid(conversationId))
      return res.status(400).json({ message: "Invalid conversation ID" })

    // Verify sender is a participant
    const conv = await Conversation.findById(conversationId)
    if (!conv || !conv.participants.some((p) => p.equals(senderId)))
      return res.status(403).json({ message: "Not a participant" })

    // Save message
    const raw = await Message.create({
      conversation: conversationId,
      sender: senderId,
      text: text.trim(),
      readBy: [senderId],
    })
    const msg = await raw.populate("sender", "name role profilePhoto studentPhoto")

    // Update conversation preview
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: { text: text.trim(), sender: senderId, createdAt: new Date() },
      updatedAt: new Date(),
    })

    const payload = { ...msg.toObject(), conversationId: String(conversationId) }

    // ✅ Push to ALL participants' personal rooms (always-on since joinUser at login)
    const io = global.io
    if (io) {
      conv.participants.forEach(async (pid) => {
        console.log(`📨 push newMessage → uid room: ${pid}`)
        io.to(String(pid)).emit("newMessage", payload)

        if (String(pid) !== String(senderId)) {
          const notif = await Notification.create({
            user: pid,
            title: "New Message",
            message: `You received a new message.`,
            type: "info"
          });
          emitNotification(pid, notif);
        }
      })
    }

    res.json(payload)
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err)
    res.status(500).json({ message: "Failed to send message" })
  }
}
