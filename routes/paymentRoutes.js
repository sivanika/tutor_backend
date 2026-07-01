import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    createOrder,
    verifyPayment,
    activateFreePlan,
    activateProfessorListing,
    getSubscription,
    razorpayWebhook,
} from "../controllers/paymentController.js";

import {
    createCourseOrder,
    verifyCoursePayment,
    cancelCoursePayment,
    activateFreeCourse,
} from "../controllers/coursePaymentController.js";

const router = express.Router();

// Create a Razorpay order (for paid plans)
router.post("/create-order", protect, createOrder);

// Verify payment signature after successful checkout
router.post("/verify", protect, verifyPayment);

// Activate a free plan (free_trial or pay_per_session for students)
router.post("/activate-free", protect, activateFreePlan);

// Professor: activate listing with 18% commission model
router.post("/activate-professor", protect, activateProfessorListing);

// Get current user subscription info
router.get("/subscription", protect, getSubscription);

// Course Payments
router.post("/course/create-order", protect, createCourseOrder);
router.post("/course/verify", protect, verifyCoursePayment);
router.post("/course/cancel", protect, cancelCoursePayment);
router.post("/course/activate-free", protect, activateFreeCourse);

// Razorpay Webhook (No protect middleware!)
router.post("/webhook", razorpayWebhook);

export default router;
