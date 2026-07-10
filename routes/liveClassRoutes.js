import express from "express";
import LiveClass from "../models/LiveClass.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import AdminLog from "../models/AdminLog.js";

const router = express.Router();

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
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      title, category, level, instructor, instructorRole,
      startDate, schedule, durationWeeks, seatsTotal, seatsLeft,
      price, mrp, rating, ratingCount, gradient,
      shortDesc, longDesc, prerequisites, syllabus, isPublished
    } = req.body;

    if (!title || !category || !level || !instructor || !startDate || !schedule || !durationWeeks || !seatsLeft || !price || !mrp || !shortDesc) {
      return res.status(400).json({ message: "Required fields are missing." });
    }

    const prereqArray = Array.isArray(prerequisites)
      ? prerequisites
      : typeof prerequisites === "string"
      ? prerequisites.split("\n").map(s => s.trim()).filter(Boolean)
      : [];

    const liveClass = await LiveClass.create({
      title, category, level, instructor,
      instructorRole: instructorRole || "",
      startDate, schedule,
      durationWeeks: Number(durationWeeks),
      seatsTotal: Number(seatsTotal) || 30,
      seatsLeft: Number(seatsLeft),
      price: Number(price),
      mrp: Number(mrp),
      rating: Number(rating) || 0,
      ratingCount: Number(ratingCount) || 0,
      gradient: gradient || "from-[#1E9E8C] to-[#12283B]",
      shortDesc, longDesc: longDesc || "",
      prerequisites: prereqArray,
      syllabus: syllabus || [],
      isPublished: isPublished !== undefined ? isPublished : true,
    });

    await AdminLog.create({
      admin: req.user.id,
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
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) return res.status(404).json({ message: "Live class not found" });

    const fields = [
      "title","category","level","instructor","instructorRole",
      "startDate","schedule","durationWeeks","seatsTotal","seatsLeft",
      "price","mrp","rating","ratingCount","gradient",
      "shortDesc","longDesc","prerequisites","syllabus","isPublished"
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        liveClass[field] = req.body[field];
      }
    });

    await liveClass.save();

    await AdminLog.create({
      admin: req.user.id,
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
