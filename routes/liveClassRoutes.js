import express from "express";
import LiveClass from "../models/LiveClass.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import AdminLog from "../models/AdminLog.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadToCloudinary } from "../utils/cloudinaryHelper.js";

const router = express.Router();

// multer setup for live class uploads
const liveUploadDir = "uploads/live";
if (!fs.existsSync(liveUploadDir)) fs.mkdirSync(liveUploadDir, { recursive: true });

const liveStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, liveUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const liveUpload = multer({
  storage: liveStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/i;
    if (allowed.test(path.extname(file.originalname))) return cb(null, true);
    cb(new Error("Only image files are allowed for trainer photo"));
  },
});

/* ============================================================
   PUBLIC — GET /api/live-classes
   Returns all published live classes
============================================================ */
router.get("/", async (req, res) => {
  try {
    const classes = await LiveClass.find({ isPublished: true }).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    console.error("LIVE CLASSES FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch live classes" });
  }
});

/* ============================================================
   ADMIN — GET /api/live-classes/all
   Returns ALL (published + unpublished) for admin panel
============================================================ */
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const classes = await LiveClass.find().sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch live classes" });
  }
});

/* ============================================================
   ADMIN — POST /api/live-classes
   Create a new live class
============================================================ */
router.post("/", protect, adminOnly, liveUpload.fields([
  { name: "trainerPhoto", maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      title, category, level, instructor, instructorRole,
      startDate, schedule, durationWeeks, seatsTotal, seatsLeft,
      price, mrp, rating, ratingCount, gradient,
      shortDesc, longDesc, prerequisites, syllabus, isPublished,
      cohort, days, time, seatsFilled, statusOverride,
      platform, meetingLink, autoRecord, trainerBio, whatsIncluded
    } = req.body;

    if (!title || !category || !level || !instructor || !startDate || !schedule || !durationWeeks || !price || !mrp || !shortDesc) {
      return res.status(400).json({ message: "Required fields are missing." });
    }

    let finalTrainerPhoto = "";
    if (req.files?.trainerPhoto?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.trainerPhoto[0].path,
        "live/trainers"
      );
      finalTrainerPhoto = uploadResult.secure_url;
    }

    const prereqArray = Array.isArray(prerequisites)
      ? prerequisites
      : typeof prerequisites === "string"
      ? (prerequisites.startsWith("[") ? JSON.parse(prerequisites) : prerequisites.split("\n").map(s => s.trim()).filter(Boolean))
      : [];

    const syllabusArray = Array.isArray(syllabus)
      ? syllabus
      : typeof syllabus === "string"
      ? JSON.parse(syllabus)
      : [];

    const whatsIncludedArray = Array.isArray(whatsIncluded)
      ? whatsIncluded
      : typeof whatsIncluded === "string"
      ? JSON.parse(whatsIncluded)
      : [];

    const finalSeatsTotal = Number(seatsTotal) || 30;
    const finalSeatsFilled = Number(seatsFilled) || 0;
    const finalSeatsLeft = seatsLeft !== undefined ? Number(seatsLeft) : Math.max(0, finalSeatsTotal - finalSeatsFilled);

    const liveClass = await LiveClass.create({
      title, category, level, instructor,
      instructorRole: instructorRole || "",
      startDate, schedule,
      durationWeeks: Number(durationWeeks),
      seatsTotal: finalSeatsTotal,
      seatsLeft: finalSeatsLeft,
      price: Number(price),
      mrp: Number(mrp),
      rating: Number(rating) || 0,
      ratingCount: Number(ratingCount) || 0,
      gradient: gradient || "linear-gradient(135deg,#1E9E8C,#12283B)",
      shortDesc, longDesc: longDesc || "",
      prerequisites: prereqArray,
      syllabus: syllabusArray,
      isPublished: isPublished !== undefined ? (isPublished === "true" || isPublished === true) : true,
      cohort: cohort || "",
      days: days || "",
      time: time || "",
      seatsFilled: finalSeatsFilled,
      statusOverride: statusOverride || "auto",
      platform: platform || "Zoom",
      meetingLink: meetingLink || "",
      autoRecord: autoRecord === "true" || autoRecord === true || autoRecord === undefined,
      trainerPhoto: finalTrainerPhoto,
      trainerBio: trainerBio || "",
      whatsIncluded: whatsIncludedArray,
    });

    await AdminLog.create({
      admin: req.user.id || req.user._id,
      action: "Created Live Class",
      target: title,
      description: `New live cohort "${title}" (${category}, ${level}) created`,
    });

    res.status(201).json({ success: true, liveClass });
  } catch (err) {
    console.error("LIVE CLASS CREATE ERROR:", err);
    res.status(500).json({ message: "Failed to create live class" });
  }
});

/* ============================================================
   ADMIN — PUT /api/live-classes/:id
   Update a live class (including toggling publish/unpublish)
============================================================ */
router.put("/:id", protect, adminOnly, liveUpload.fields([
  { name: "trainerPhoto", maxCount: 1 }
]), async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ message: "Live class not found" });

    // Handle trainer photo upload
    if (req.files?.trainerPhoto?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.trainerPhoto[0].path,
        "live/trainers"
      );
      liveClass.trainerPhoto = uploadResult.secure_url;
    } else if (req.body.trainerPhoto !== undefined) {
      // If client explicitly sets to empty string
      liveClass.trainerPhoto = req.body.trainerPhoto;
    }

    const fields = [
      "title","category","level","instructor","instructorRole",
      "startDate","schedule","durationWeeks","seatsTotal","seatsLeft",
      "price","mrp","rating","ratingCount","gradient",
      "shortDesc","longDesc","prerequisites","syllabus","isPublished",
      "cohort", "days", "time", "seatsFilled", "statusOverride",
      "platform", "meetingLink", "autoRecord", "trainerBio", "whatsIncluded"
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        let val = req.body[field];
        if (field === "durationWeeks" || field === "seatsTotal" || field === "seatsLeft" || field === "seatsFilled" || field === "price" || field === "mrp" || field === "rating" || field === "ratingCount") {
          val = Number(val);
        } else if (field === "isPublished" || field === "autoRecord") {
          val = val === "true" || val === true;
        } else if (field === "prerequisites" || field === "whatsIncluded" || field === "syllabus") {
          val = typeof val === "string" ? JSON.parse(val) : val;
        }
        liveClass[field] = val;
      }
    });

    if (req.body.seatsTotal !== undefined || req.body.seatsFilled !== undefined) {
      const t = liveClass.seatsTotal || 30;
      const f = liveClass.seatsFilled || 0;
      liveClass.seatsLeft = Math.max(0, t - f);
    }

    await liveClass.save();

    await AdminLog.create({
      admin: req.user.id || req.user._id,
      action: "Updated Live Class",
      target: liveClass.title,
      description: `Live class "${liveClass.title}" updated`,
    });

    res.json({ success: true, liveClass });
  } catch (err) {
    console.error("LIVE CLASS UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to update live class" });
  }
});

/* ============================================================
   ADMIN — DELETE /api/live-classes/:id
   Delete a live class
============================================================ */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ message: "Live class not found" });

    const title = liveClass.title;
    await LiveClass.findByIdAndDelete(req.params.id);

    await AdminLog.create({
      admin: req.user.id,
      action: "Deleted Live Class",
      target: title,
      description: `Live class "${title}" permanently deleted`,
    });

    res.json({ success: true, message: "Live class deleted" });
  } catch (err) {
    console.error("LIVE CLASS DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete live class" });
  }
});

export default router;
