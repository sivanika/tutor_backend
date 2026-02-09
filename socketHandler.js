export default function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("🔌 CONNECTED:", socket.id)

    socket.on("join-session", ({ sessionId }) => {
      socket.join(sessionId)
      console.log("✅ JOINED ROOM:", sessionId)
    })

    socket.on("send-message", ({ sessionId, text, sender }) => {
      console.log("📨 SERVER RECEIVED:", text)

      io.to(sessionId).emit("receive-message", {
        text,
        sender,
      })

      console.log("📤 BROADCASTED:", sessionId)
    })
  })
}
