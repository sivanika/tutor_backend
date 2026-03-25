import express from "express"
import { protect, adminOnly as admin } from "../middleware/authMiddleware.js"
import {
  getActivePlans,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  updateUserPlan
} from "../controllers/subscriptionController.js"

const router = express.Router()

// Public / Student
router.get("/plans", getActivePlans)

// Admin
router.get("/admin/plans", protect, admin, getAllPlans)
router.post("/admin/plans", protect, admin, createPlan)
router.put("/admin/plans/:id", protect, admin, updatePlan)
router.delete("/admin/plans/:id", protect, admin, deletePlan)
router.put("/admin/users/:userId/plan", protect, admin, updateUserPlan)

export default router
