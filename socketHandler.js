import Message from "./models/Message.js"
import Conversation from "./models/Conversation.js"

/*
 * KEY DESIGN:
 * - Messages are sent via REST (POST /messages) not socket
 * - Server pushes newMessage to BOTH users' personal rooms (uid-based)
 * - Personal rooms are registered at login (joinUser) and NEVER change
 * - This means delivery works regardless of which tab is open
 * - Socket is ONLY used for: real-time push, typing, online status
 */

// userId -> Set<socketId>  (supports multiple browser tabs)
const online = new Map()

export function emitToUser(io, userId, event, data) {
  io.to(String(userId)).emit(event, data)
}

export function emitNotification(userId, notification) {
  if (global.io) {
    global.io.to(String(userId)).emit("newNotification", notification);
  }
}

export default function socketHandler(io) {
  // Attach io to global so controllers can push via HTTP routes
  global.io = io

  io.on("connection", (socket) => {
    console.log("🔌 connected:", socket.id)

    /* ── Register personal room (called from dashboard on login) ── */
    socket.on("joinUser", ({ userId }) => {
      if (!userId) {
        console.warn("⚠️ joinUser called without userId");
        return;
      }
      const uid = String(userId);
      socket.join(uid);
      if (!online.has(uid)) online.set(uid, new Set());
      online.get(uid).add(socket.id);
      io.emit("userOnline", { userId: uid });
      console.log(`✅ joinUser connected: socket=${socket.id} userRoom=${uid}`);
    });

    /* ── Typing indicators (simple broadcast to other user) ──── */
    socket.on("typing", ({ conversationId, receiverId }) => {
      if (!receiverId) return
      io.to(String(receiverId)).emit("typing", { conversationId })
    })

    socket.on("stopTyping", ({ conversationId, receiverId }) => {
      if (!receiverId) return
      io.to(String(receiverId)).emit("stopTyping", { conversationId })
    })

    /* ── Mark read ────────────────────────────────────────────── */
    socket.on("markRead", async ({ conversationId, userId, senderId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        )
        if (senderId) io.to(String(senderId)).emit("messagesRead", { conversationId })
      } catch (e) {
        console.error("markRead err:", e)
      }
    })

    /* ── Session Chat (Legacy/Specific) ───────────────────────── */
    socket.on("joinSession", ({ sessionId }) => {
      if (!sessionId) return
      socket.join(`session-${sessionId}`)
      console.log(`📡 socket ${socket.id} joined session room: session-${sessionId}`)
    })

    socket.on("sendMessage", async ({ sessionId, userId, text }) => {
      try {
        if (!text?.trim() || !sessionId) return
        
        // Broadcast to session room
        const payload = {
          text: text.trim(),
          sender: userId,
          createdAt: new Date(),
          sessionId
        }
        
        io.to(`session-${sessionId}`).emit("newMessage", payload)
        console.log(`📩 session-${sessionId} message from ${userId}: ${text}`)
      } catch (e) {
        console.error("sendMessage err:", e)
      }
    })

    /* ── Disconnect ───────────────────────────────────────────── */
    socket.on("disconnect", () => {
      let offlineUid = null
      for (const [uid, sids] of online) {
        if (sids.has(socket.id)) {
          sids.delete(socket.id)
          if (sids.size === 0) { online.delete(uid); offlineUid = uid }
          break
        }
      }
      if (offlineUid) io.emit("userOffline", { userId: offlineUid })
      console.log("⭕ disconnected:", socket.id)
    })
  })
}
