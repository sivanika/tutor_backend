import express from "express"
import http from "http"
import { Server } from "socket.io"
import dotenv from "dotenv"
import cors from "cors"
import connectDB from "./config/db.js"
import adminRoutes from "./routes/adminRoutes.js"
// routes
import authRoutes from "./routes/authRoutes.js"
import sessionRoutes from "./routes/sessionRoutes.js"
import chatRoutes from "./routes/chatRoutes.js"
import feedbackRoutes from "./routes/feedbackRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import professorRoutes from "./routes/professorRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import path from "path";
dotenv.config()
console.log("EMAIL:", process.env.EMAIL)
console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "Loaded" : "Missing")
// connect to database
connectDB()

const app = express()

app.use(cors())
app.use(express.json())

// routes
app.use("/api/auth", authRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/sessions", sessionRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/feedback", feedbackRoutes);
app.use("/api/users", userRoutes);
app.use("/api/professors", professorRoutes);
app.use("/api/student", studentRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
// ✅ CREATE HTTP SERVER FIRST
const server = http.createServer(app)

// ✅ THEN CREATE SOCKET.IO WITH SAME SERVER
const io = new Server(server, {
  cors: {
    origin: "https://tutor-frontend-etmw.vercel.app/",
    methods: ["GET", "POST"],
  },
})

// make io available globally
global.io = io;

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server running with Socket.IO on port ${PORT}`)
);
