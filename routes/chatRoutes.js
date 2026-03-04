import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { getMessagesBySession, sendMessage } from "../controllers/chatController.js"

const router = express.Router()

router.get("/:sessionId", protect, getMessagesBySession)
router.post("/", protect, sendMessage)

export default router
