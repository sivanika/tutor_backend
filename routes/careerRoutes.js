import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import CareerApplication from "../models/CareerApplication.js";
import JobPosition from "../models/JobPosition.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { sendJobSelectionMail, sendJobRejectionMail } from "../utils/sendEmail.js";
import AdminLog from "../models/AdminLog.js";

const router = express.Router();

/* ============================================================
   JOB POSITIONS — PUBLIC
   GET /api/careers/positions   → list all open positions
============================================================ */
router.get("/positions", async (req, res) => {
  try {
    const positions = await JobPosition.find({ isOpen: true }).sort({ createdAt: -1 });
    res.json(positions);
  } catch (err) {
    console.error("POSITIONS FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch positions" });
  }
});

/* ============================================================
   JOB POSITIONS — ADMIN: get ALL (open + closed)
   GET /api/careers/positions/all
============================================================ */
router.get("/positions/all", protect, adminOnly, async (req, res) => {
  try {
    const positions = await JobPosition.find().sort({ createdAt: -1 });
    res.json(positions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch positions" });
  }
});

/* ============================================================
   JOB POSITIONS — ADMIN: create
   POST /api/careers/positions
============================================================ */
router.post("/positions", protect, adminOnly, async (req, res) => {
  try {
    const { title, type, mode, location, dept, description, responsibilities, eligibility, skills, salary, openings, deadline, isOpen, status } = req.body;
    if (!title || !type || !dept || !description) {
      return res.status(400).json({ message: "title, type, dept and description are required" });
    }

    const parseTextareaList = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        return val.split("\n").map((line) => line.trim()).filter(Boolean);
      }
      return [];
    };

    const skillArray = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    let finalIsOpen = true;
    if (isOpen !== undefined) {
      finalIsOpen = !!isOpen;
    } else if (status !== undefined) {
      finalIsOpen = status === "published";
    }

    const position = await JobPosition.create({
      title,
      type,
      mode: mode || "Remote",
      location: location || "Remote",
      dept,
      description,
      responsibilities: parseTextareaList(responsibilities),
      eligibility: parseTextareaList(eligibility),
      skills: skillArray,
      salary: salary || "",
      openings: openings !== undefined ? Number(openings) : 1,
      deadline: deadline || null,
      isOpen: finalIsOpen,
    });

    await AdminLog.create({
      admin: req.user.id,
      action: "Created Job Position",
      target: title,
      description: `New position "${title}" (${type}, ${location || "Remote"}) added`,
    });

    res.status(201).json({ success: true, position });
  } catch (err) {
    console.error("POSITION CREATE ERROR:", err);
    res.status(500).json({ message: "Failed to create position" });
  }
});

/* ============================================================
   JOB POSITIONS — ADMIN: update (edit or toggle open/closed)
   PUT /api/careers/positions/:id
 ============================================================ */
router.put("/positions/:id", protect, adminOnly, async (req, res) => {
  try {
    const { title, type, mode, location, dept, description, responsibilities, eligibility, skills, salary, openings, deadline, isOpen, status } = req.body;

    const position = await JobPosition.findById(req.params.id);
    if (!position) return res.status(404).json({ message: "Position not found" });

    const parseTextareaList = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        return val.split("\n").map((line) => line.trim()).filter(Boolean);
      }
      return [];
    };

    if (title !== undefined) position.title = title;
    if (type !== undefined) position.type = type;
    if (mode !== undefined) position.mode = mode;
    if (location !== undefined) position.location = location;
    if (dept !== undefined) position.dept = dept;
    if (description !== undefined) position.description = description;
    if (salary !== undefined) position.salary = salary;
    if (openings !== undefined) position.openings = Number(openings);
    if (deadline !== undefined) position.deadline = deadline || null;
    
    if (isOpen !== undefined) {
      position.isOpen = !!isOpen;
    } else if (status !== undefined) {
      position.isOpen = status === "published";
    }

    if (responsibilities !== undefined) {
      position.responsibilities = parseTextareaList(responsibilities);
    }
    if (eligibility !== undefined) {
      position.eligibility = parseTextareaList(eligibility);
    }
    if (skills !== undefined) {
      position.skills = Array.isArray(skills)
        ? skills
        : skills.split(",").map((s) => s.trim()).filter(Boolean);
    }

    await position.save();

    await AdminLog.create({
      admin: req.user.id,
      action: "Updated Job Position",
      target: position.title,
      description: `Position "${position.title}" updated`,
    });

    res.json({ success: true, position });
  } catch (err) {
    console.error("POSITION UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to update position" });
  }
});

/* ============================================================
   JOB POSITIONS — ADMIN: delete
   DELETE /api/careers/positions/:id
============================================================ */
router.delete("/positions/:id", protect, adminOnly, async (req, res) => {
  try {
    const position = await JobPosition.findById(req.params.id);
    if (!position) return res.status(404).json({ message: "Position not found" });

    await JobPosition.findByIdAndDelete(req.params.id);

    await AdminLog.create({
      admin: req.user.id,
      action: "Deleted Job Position",
      target: position.title,
      description: `Position "${position.title}" permanently deleted`,
    });

    res.json({ success: true, message: "Position deleted" });
  } catch (err) {
    console.error("POSITION DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete position" });
  }
});

/* ============================
   SUBMIT JOB APPLICATION (PUBLIC)
   POST /api/careers/apply
 ============================ */
const resumeUploadDir = "uploads/resumes";
if (!fs.existsSync(resumeUploadDir)) {
  fs.mkdirSync(resumeUploadDir, { recursive: true });
}

const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumeUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: resumeStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.post("/apply", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, location, experience, employer, notice, linkedin, coverLetter, positionId, positionTitle } = req.body;

    if (!name || !email || !phone || !location || !experience || !positionId || !positionTitle) {
      return res.status(400).json({ message: "Name, email, phone, location, experience, positionId and positionTitle are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Resume / CV file is required" });
    }

    const resumeUrl = `/uploads/resumes/${req.file.filename}`;

    const application = await CareerApplication.create({
      name,
      email,
      phone,
      location,
      experience: Number(experience),
      employer: employer || "",
      notice: notice || "",
      linkedin: linkedin || "",
      resumeUrl,
      coverLetter: coverLetter || "",
      positionId,
      positionTitle,
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      application,
    });
  } catch (err) {
    console.error("CAREER SUBMIT ERROR:", err);
    res.status(500).json({ message: "Failed to submit application" });
  }
});

/* ============================
   GET ALL APPLICATIONS (ADMIN ONLY)
   GET /api/careers/applications
============================ */
router.get("/applications", protect, adminOnly, async (req, res) => {
  try {
    const applications = await CareerApplication.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    console.error("CAREER FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

/* ============================
   UPDATE APPLICATION STATUS (ADMIN ONLY)
   PUT /api/careers/applications/:id
============================ */
router.put("/applications/:id", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Pending", "Selected", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const application = await CareerApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    const oldStatus = application.status;
    application.status = status;
    await application.save();

    await AdminLog.create({
      admin: req.user.id,
      action: "Updated Job Application Status",
      target: `${application.email} (${application.positionTitle})`,
      description: `Status updated from ${oldStatus} to ${status} for applicant ${application.name}`,
    });

    if (status !== oldStatus) {
      try {
        if (status === "Selected") {
          await sendJobSelectionMail(application.email, application.name, application.positionTitle);
        } else if (status === "Rejected") {
          await sendJobRejectionMail(application.email, application.name, application.positionTitle);
        }
      } catch (mailErr) {
        console.error("Job status email sending failed (non-fatal):", mailErr.message);
      }
    }

    res.json({ success: true, message: `Status successfully updated to ${status}`, application });
  } catch (err) {
    console.error("CAREER UPDATE ERROR:", err);
    res.status(500).json({ message: "Failed to update application" });
  }
});

/* ============================
   DELETE APPLICATION (ADMIN ONLY)
   DELETE /api/careers/applications/:id
============================ */
router.delete("/applications/:id", protect, adminOnly, async (req, res) => {
  try {
    const application = await CareerApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    await CareerApplication.findByIdAndDelete(req.params.id);

    await AdminLog.create({
      admin: req.user.id,
      action: "Deleted Job Application",
      target: `${application.email} (${application.positionTitle})`,
      description: `Deleted job application of ${application.name} for role ${application.positionTitle}`,
    });

    res.json({ success: true, message: "Application deleted successfully" });
  } catch (err) {
    console.error("CAREER DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete application" });
  }
});

export default router;
