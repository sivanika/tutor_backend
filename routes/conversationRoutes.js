import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  markAsRead,
  sendMessage,
} from "../controllers/conversationController.js"

const router = express.Router()

router.get("/", protect, getConversations)
router.post("/", protect, getOrCreateConversation)
router.get("/:conversationId/messages", protect, getMessages)
router.post("/:conversationId/messages", protect, sendMessage)
router.put("/:conversationId/read", protect, markAsRead)

export default router
