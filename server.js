import "./config/env.js" // ← MUST be first: loads .env before any other module
import express from "express"
import http from "http"
import { Server } from "socket.io"
import cors from "cors"
import { Resend } from "resend";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js"
import adminRoutes from "./routes/adminRoutes.js"
// routes
import authRoutes from "./routes/authRoutes.js"
import sessionRoutes from "./routes/sessionRoutes.js"
import chatRoutes from "./routes/chatRoutes.js"
import conversationRoutes from "./routes/conversationRoutes.js"
import feedbackRoutes from "./routes/feedbackRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import professorRoutes from "./routes/professorRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import studentSubjectRoutes from "./routes/studentSubjectRoutes.js";
import socketHandler from "./socketHandler.js";
import path from "path";
import { send } from "./utils/sendEmail.js";
// connect to database
connectDB()

const app = express()
app.set("trust proxy", 1) // Required for express-rate-limit to work correctly on Render/Proxies

import helmet from "helmet"
import rateLimit from "express-rate-limit"

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Disabling CSP for now to ensure all external scripts (Razorpay, Google) work smoothly
  })
)

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // limit each IP to 10 login/register requests
  message: { message: "Too many attempts. Try again later." },
})

app.use(generalLimiter)

const rawOrigins = [
  "http://localhost:5173",
  "https://tutor-frontend-steel.vercel.app",
  "https://tutor-frontend-ten.vercel.app",
  "https://tutorhours.com",
  "https://www.tutorhours.com",
  process.env.CLIENT_URL
].filter(Boolean);

// Clean origins: remove trailing slashes for robust matching
const allowedOrigins = rawOrigins.map(url => url.replace(/\/$/, ""));

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowed = allowedOrigins.includes(normalizedOrigin);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn("CORS blocked request from origin:", origin);
      // Return false instead of Error to avoid crashing the server/middleware stack
      callback(null, false);
    }
  },
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// routes
app.use("/api/auth/login", authLimiter)
app.use("/api/auth/register", authLimiter)
app.use("/api/auth", authRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/sessions", sessionRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/conversations", conversationRoutes)
app.use("/api/feedback", feedbackRoutes);
app.use("/api/users", userRoutes);
app.use("/api/professors", professorRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/student-subjects", studentSubjectRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
  setHeaders: (res, path, stat) => {
    if (!path.includes('.')) {
      res.set('Content-Type', 'image/jpeg');
    }
  }
}));
 
 app.post("/send-email", async (req, res) => {
   const { to, subject, message } = req.body;
   try {
     await send({ to, subject, html: message });
     res.json({ success: true, message: "Email sent successfully" });
   } catch (error) {
     console.error("Email send error:", error);
     res.status(500).json({ success: false, message: "Failed to send email" });
   }
 });

// ✅ CREATE HTTP SERVER FIRST
const server = http.createServer(app)

// ✅ THEN CREATE SOCKET.IO WITH SAME SERVER
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// make io available globally
global.io = io;

socketHandler(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ GLOBAL ERROR:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server running with Socket.IO on port ${PORT}`)
);