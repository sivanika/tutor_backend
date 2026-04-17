import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* =========================
   PROTECT ROUTES
========================= */
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* =========================
   OPTIONAL PROTECT
========================= */
export const optionalProtect = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (error) {
    next(); // Ignore errors, keep user as undefined
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
