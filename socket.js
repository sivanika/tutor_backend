import Message from "./models/Message.js"

export default function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id)

    socket.on("joinSession", ({ sessionId }) => {
      socket.join(sessionId)
    })

    socket.on("sendMessage", async ({ sessionId, userId, text }) => {
      const msg = await Message.create({
        session: sessionId,
        sender: userId,
        text,
        seenBy: [userId],
      })

      const populated = await msg.populate("sender", "name role")
      io.to(sessionId).emit("newMessage", populated)
    })
  })
}
