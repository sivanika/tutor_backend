import Course from "../models/Course.js"
import Module from "../models/Module.js"
import Lesson from "../models/Lesson.js"
import Enrollment from "../models/Enrollment.js"
import { uploadToCloudinary } from "../utils/cloudinaryHelper.js";


// ─────────────────────────────────────────────────────────────
//  COURSE CRUD (LMS-aware — uses status field)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/lms/courses
 * Admin → all courses with any status
 * Students/Public → only "published" courses
 */
export const getLMSCourses = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin"
    const query = isAdmin ? {} : { status: "published" }

    const courses = await Course.find(query)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })

    res.json({ success: true, courses })
  } catch (e) {
    console.error("GET LMS COURSES:", e)
    res.status(500).json({ message: "Failed to fetch courses" })
  }
}

/**
 * GET /api/lms/courses/:id
 * Returns course + all its modules + lessons (nested)
 */
export const getLMSCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate("createdBy", "name email")
    if (!course) return res.status(404).json({ message: "Course not found" })

    const isAdmin = req.user?.role === "admin"
    if (!isAdmin && course.status !== "published") {
      return res.status(403).json({ message: "Course not available" })
    }

    // Check enrollment for paid courses
    let isEnrolled = false
    if (req.user) {
      const enrollment = await Enrollment.findOne({
        studentId: req.user._id || req.user.id,
        courseId: course._id,
        status: { $in: ["approved", "completed"] },
      })
      if (enrollment) isEnrolled = true
    }

    // Non-admins can only view lessons content if course is free or they are enrolled
    const showContent = isAdmin || course.price === 0 || isEnrolled

    // Fetch modules ordered by `order`
    const modules = await Module.find({ courseId: course._id }).sort({ order: 1 })

    // Fetch lessons for all modules
    const moduleIds = modules.map((m) => m._id)
    const lessons = await Lesson.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 })

    // Nest lessons inside their module
    const modulesWithLessons = modules.map((mod) => ({
      ...mod.toObject(),
      lessons: lessons
        .filter((l) => l.moduleId.toString() === mod._id.toString())
        .map((l) => {
          const lObj = l.toObject()
          if (!showContent) {
            lObj.contentUrl = "" // Hide sensitive content url
          }
          return lObj
        }),
    }))

    res.json({ success: true, course, modules: modulesWithLessons, isEnrolled })
  } catch (e) {
    console.error("GET LMS COURSE BY ID:", e)
    res.status(500).json({ message: "Failed to fetch course" })
  }
}

/**
 * POST /api/lms/courses  [Admin only]
 * Create a new LMS course (starts as draft)
 */
export const createLMSCourse = async (req, res) => {
  try {
    const {
      title, description, subject, instructor,
      thumbnailUrl, videoUrl, duration, level,
      price, startDate, endDate, tags, category, status,
    } = req.body

    // Handle file uploads (thumbnail / promo video) to Cloudinary
    let finalThumbnailUrl = thumbnailUrl || ""
    if (req.files?.thumbnailFile?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.thumbnailFile[0].path,
        "lms/thumbnails"
      );
      finalThumbnailUrl = uploadResult.secure_url;
    }

    let finalVideoUrl = videoUrl || ""
    if (req.files?.videoFile?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.videoFile[0].path,
        "lms/videos"
      );
      finalVideoUrl = uploadResult.secure_url;
    }

    if (!title?.trim() || !description?.trim() || !subject?.trim()) {
      return res.status(400).json({ message: "Title, description and subject are required" })
    }

    const course = await Course.create({
      title:        title.trim(),
      description:  description.trim(),
      subject:      subject.trim(),
      instructor:   instructor?.trim() || "Admin",
      thumbnailUrl: finalThumbnailUrl,
      videoUrl:     finalVideoUrl,
      duration:     duration?.trim() || "Self-paced",
      level:        level || "All Levels",
      price:        price ? Number(price) : 0,
      startDate:    startDate || null,
      endDate:      endDate || null,
      tags:         tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim())) : [],
      category:     category?.trim() || "",
      status:       status || "draft",
      createdBy:    req.user._id,
      isActive:     true,
    })

    res.status(201).json({ success: true, course })
  } catch (e) {
    console.error("CREATE LMS COURSE:", e)
    res.status(500).json({ message: "Failed to create course" })
  }
}

/**
 * PUT /api/lms/courses/:id  [Admin only]
 */
export const updateLMSCourse = async (req, res) => {
  try {
    const {
      title, description, subject, instructor,
      thumbnailUrl, videoUrl, duration, level,
      price, startDate, endDate, tags, category, status, isActive,
    } = req.body

    let finalThumbnailUrl = thumbnailUrl
    if (req.files?.thumbnailFile?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.thumbnailFile[0].path,
        "lms/thumbnails"
      );
      finalThumbnailUrl = uploadResult.secure_url;
    }

    let finalVideoUrl = videoUrl
    if (req.files?.videoFile?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.videoFile[0].path,
        "lms/videos"
      );
      finalVideoUrl = uploadResult.secure_url;
    }

    const updates = {}
    if (title?.trim())                        updates.title        = title.trim()
    if (description?.trim())                  updates.description  = description.trim()
    if (subject?.trim())                      updates.subject      = subject.trim()
    if (instructor?.trim())                   updates.instructor   = instructor.trim()
    if (finalThumbnailUrl !== undefined)      updates.thumbnailUrl = finalThumbnailUrl
    if (finalVideoUrl !== undefined)          updates.videoUrl     = finalVideoUrl
    if (duration?.trim())                     updates.duration     = duration.trim()
    if (level)                                updates.level        = level
    if (price !== undefined)                  updates.price        = Number(price)
    if (startDate !== undefined)              updates.startDate    = startDate || null
    if (endDate !== undefined)                updates.endDate      = endDate || null
    if (tags !== undefined)                   updates.tags         = Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim())
    if (category !== undefined)               updates.category     = category?.trim() || ""
    if (status)                               updates.status       = status
    if (isActive !== undefined)               updates.isActive     = isActive === "true" || isActive === true

    const course = await Course.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
    if (!course) return res.status(404).json({ message: "Course not found" })

    res.json({ success: true, course })
  } catch (e) {
    console.error("UPDATE LMS COURSE:", e)
    res.status(500).json({ message: "Failed to update course" })
  }
}

/**
 * PATCH /api/lms/courses/:id/status  [Admin only]
 * Quick-toggle: draft → published → archived
 */
export const updateCourseStatus = async (req, res) => {
  try {
    const { status } = req.body
    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" })
    }
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
    if (!course) return res.status(404).json({ message: "Course not found" })
    res.json({ success: true, course })
  } catch (e) {
    res.status(500).json({ message: "Failed to update course status" })
  }
}

/**
 * DELETE /api/lms/courses/:id  [Admin only]
 * Cascades: deletes all modules and lessons belonging to the course
 */
export const deleteLMSCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id)
    if (!course) return res.status(404).json({ message: "Course not found" })

    // Cascade delete modules and lessons
    const modules = await Module.find({ courseId: req.params.id })
    const moduleIds = modules.map((m) => m._id)
    await Lesson.deleteMany({ moduleId: { $in: moduleIds } })
    await Module.deleteMany({ courseId: req.params.id })

    res.json({ success: true, message: "Course and all its content deleted" })
  } catch (e) {
    console.error("DELETE LMS COURSE:", e)
    res.status(500).json({ message: "Failed to delete course" })
  }
}

// ─────────────────────────────────────────────────────────────
//  MODULE CRUD
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/lms/courses/:courseId/modules  [Admin only]
 */
export const createModule = async (req, res) => {
  try {
    const { title, order } = req.body
    const { courseId } = req.params

    if (!title?.trim()) return res.status(400).json({ message: "Module title is required" })

    const course = await Course.findById(courseId)
    if (!course) return res.status(404).json({ message: "Course not found" })

    // Auto-assign order if not provided
    const lastModule = await Module.findOne({ courseId }).sort({ order: -1 })
    const nextOrder = order !== undefined ? Number(order) : (lastModule ? lastModule.order + 1 : 0)

    const module = await Module.create({ courseId, title: title.trim(), order: nextOrder })
    res.status(201).json({ success: true, module })
  } catch (e) {
    console.error("CREATE MODULE:", e)
    res.status(500).json({ message: "Failed to create module" })
  }
}

/**
 * PUT /api/lms/modules/:id  [Admin only]
 */
export const updateModule = async (req, res) => {
  try {
    const { title, order } = req.body
    const updates = {}
    if (title?.trim()) updates.title = title.trim()
    if (order !== undefined) updates.order = Number(order)

    const module = await Module.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!module) return res.status(404).json({ message: "Module not found" })
    res.json({ success: true, module })
  } catch (e) {
    res.status(500).json({ message: "Failed to update module" })
  }
}

/**
 * DELETE /api/lms/modules/:id  [Admin only]
 * Cascades: deletes all lessons in this module
 */
export const deleteModule = async (req, res) => {
  try {
    const module = await Module.findByIdAndDelete(req.params.id)
    if (!module) return res.status(404).json({ message: "Module not found" })

    await Lesson.deleteMany({ moduleId: req.params.id })
    res.json({ success: true, message: "Module and its lessons deleted" })
  } catch (e) {
    res.status(500).json({ message: "Failed to delete module" })
  }
}

// ─────────────────────────────────────────────────────────────
//  LESSON CRUD
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/lms/modules/:moduleId/lessons  [Admin only]
 * Supports file upload (multer) OR external URL
 */
export const createLesson = async (req, res) => {
  try {
    const { title, type, contentUrl, order, duration, isFree, description } = req.body
    const { moduleId } = req.params

    if (!title?.trim()) return res.status(400).json({ message: "Lesson title is required" })

    const module = await Module.findById(moduleId)
    if (!module) return res.status(404).json({ message: "Module not found" })

    // File upload takes priority over URL
    let finalContentUrl = contentUrl || ""
    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.path,
        "lms/lessons"
      );
      finalContentUrl = uploadResult.secure_url;
    }

    // Auto-assign order
    const lastLesson = await Lesson.findOne({ moduleId }).sort({ order: -1 })
    const nextOrder = order !== undefined ? Number(order) : (lastLesson ? lastLesson.order + 1 : 0)

    const lesson = await Lesson.create({
      moduleId,
      courseId: module.courseId,
      title:      title.trim(),
      type:       type || "video",
      contentUrl: finalContentUrl,
      order:      nextOrder,
      duration:   duration?.trim() || "",
      isFree:     isFree === "true" || isFree === true,
      description: description?.trim() || "",
    })

    res.status(201).json({ success: true, lesson })
  } catch (e) {
    console.error("CREATE LESSON:", e)
    res.status(500).json({ message: "Failed to create lesson" })
  }
}

/**
 * PUT /api/lms/lessons/:id  [Admin only]
 */
export const updateLesson = async (req, res) => {
  try {
    const { title, type, contentUrl, order, duration, isFree, description } = req.body
    const updates = {}

    if (title?.trim())          updates.title       = title.trim()
    if (type)                   updates.type        = type
    if (order !== undefined)    updates.order       = Number(order)
    if (duration !== undefined) updates.duration    = duration?.trim() || ""
    if (isFree !== undefined)   updates.isFree      = isFree === "true" || isFree === true
    if (description !== undefined) updates.description = description?.trim() || ""

    // File upload takes priority
    if (req.file) {
      const uploadResult = await uploadToCloudinary(
        req.file.path,
        "lms/lessons"
      );
      updates.contentUrl = uploadResult.secure_url;
    } else if (contentUrl !== undefined) {
      updates.contentUrl = contentUrl
    }

    const lesson = await Lesson.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!lesson) return res.status(404).json({ message: "Lesson not found" })
    res.json({ success: true, lesson })
  } catch (e) {
    res.status(500).json({ message: "Failed to update lesson" })
  }
}

/**
 * DELETE /api/lms/lessons/:id  [Admin only]
 */
export const deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id)
    if (!lesson) return res.status(404).json({ message: "Lesson not found" })
    res.json({ success: true, message: "Lesson deleted" })
  } catch (e) {
    res.status(500).json({ message: "Failed to delete lesson" })
  }
}
