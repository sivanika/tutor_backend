import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* =========================
   PROTECT ROUTES
========================= */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* =========================
   ADMIN ONLY
========================= */
export const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  res.status(403).json({ message: "Admin access only" });
};

/* =========================
   VERIFIED PROFESSOR ONLY
========================= */
export const verifiedProfessorOnly = (req, res, next) => {
  if (req.user?.role !== "professor") {
    return res.status(403).json({ message: "Professor only" });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({ message: "Professor not verified" });
  }

  next();
};
