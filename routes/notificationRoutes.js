import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  createTestNotification 
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(protect); // All routes require authentication

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.post("/test", createTestNotification); // Remove or protect with admin later

export default router;
