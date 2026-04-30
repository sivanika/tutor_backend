import express from "express";
import { loginUser, registerUser, forgotPassword, resetPassword, logoutUser, getMe, googleLogin } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/logout", logoutUser);
router.get("/me", protect, getMe);
router.post("/google", googleLogin);

export default router;
