import Course from "../models/Course.js"
import { uploadToCloudinary } from "../utils/cloudinaryHelper.js"

// GET /api/courses - Get courses (admin gets all, students/tutors get only active ones)
export const getCourses = async (req, res) => {
  try {
    const query = req.user && req.user.role === "admin" ? {} : { isActive: true }
    const courses = await Course.find(query).sort({ createdAt: -1 })
    res.json(courses)
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch courses" })
  }
}

// GET /api/courses/:id - Get a single course's details
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }
    // Access control: if not admin, course must be active
    if (req.user?.role !== "admin" && !course.isActive) {
      return res.status(403).json({ message: "Not authorized to view this course" })
    }
    res.json(course)
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch course details" })
  }
}

// POST /api/courses - Admin only, create a new course
export const createCourse = async (req, res) => {
  try {
    const { title, description, subject, instructor, thumbnailUrl, videoUrl, duration, level, isActive } = req.body

    let finalThumbnailUrl = thumbnailUrl || ""
    if (req.files?.thumbnailFile?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.thumbnailFile[0].path,
        "courses/thumbnails"
      );
      finalThumbnailUrl = uploadResult.secure_url;
    }

    let finalVideoUrl = videoUrl || ""
    if (req.files?.videoFile?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.videoFile[0].path,
        "courses/videos"
      );
      finalVideoUrl = uploadResult.secure_url;
    }

    if (!title?.trim() || !description?.trim() || !subject?.trim() || !finalVideoUrl?.trim()) {
      return res.status(400).json({ message: "Title, description, subject, and video URL/file are required" })
    }

    const course = await Course.create({
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      instructor: instructor?.trim() || "Admin",
      thumbnailUrl: finalThumbnailUrl.trim(),
      videoUrl: finalVideoUrl.trim(),
      duration: duration?.trim() || "Self-paced",
      level: level || "All Levels",
      isActive: isActive === "true" || isActive === true || isActive === undefined,
    })

    res.status(201).json(course)
  } catch (e) {
    console.error("CREATE COURSE ERROR:", e)
    res.status(500).json({ message: "Failed to create course" })
  }
}

// PUT /api/courses/:id - Admin only, update a course
export const updateCourse = async (req, res) => {
  try {
    const { title, description, subject, instructor, thumbnailUrl, videoUrl, duration, level, isActive } = req.body
    
    let finalThumbnailUrl = thumbnailUrl
    if (req.files?.thumbnailFile?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.thumbnailFile[0].path,
        "courses/thumbnails"
      );
      finalThumbnailUrl = uploadResult.secure_url;
    }

    let finalVideoUrl = videoUrl
    if (req.files?.videoFile?.[0]) {
      const uploadResult = await uploadToCloudinary(
        req.files.videoFile[0].path,
        "courses/videos"
      );
      finalVideoUrl = uploadResult.secure_url;
    }

    const cleanStr = (val) => {
      if (val === undefined || val === null || val === "undefined" || val === "null") return undefined
      return val.trim()
    }

    const cleanTitle = cleanStr(title)
    const cleanDescription = cleanStr(description)
    const cleanSubject = cleanStr(subject)
    const cleanInstructor = cleanStr(instructor)
    const cleanDuration = cleanStr(duration)

    if (cleanTitle !== undefined && !cleanTitle) return res.status(400).json({ message: "Title cannot be empty" })
    if (cleanDescription !== undefined && !cleanDescription) return res.status(400).json({ message: "Description cannot be empty" })
    if (cleanSubject !== undefined && !cleanSubject) return res.status(400).json({ message: "Subject cannot be empty" })
    if (finalVideoUrl !== undefined && !finalVideoUrl.trim()) return res.status(400).json({ message: "Video URL/file cannot be empty" })

    const updatedData = {
      ...(cleanTitle !== undefined && { title: cleanTitle }),
      ...(cleanDescription !== undefined && { description: cleanDescription }),
      ...(cleanSubject !== undefined && { subject: cleanSubject }),
      ...(cleanInstructor !== undefined && { instructor: cleanInstructor }),
      ...(finalThumbnailUrl !== undefined && finalThumbnailUrl !== "undefined" && finalThumbnailUrl !== "null" && { thumbnailUrl: finalThumbnailUrl.trim() }),
      ...(finalVideoUrl !== undefined && finalVideoUrl !== "undefined" && finalVideoUrl !== "null" && { videoUrl: finalVideoUrl.trim() }),
      ...(cleanDuration !== undefined && { duration: cleanDuration }),
      ...(level !== undefined && level !== "undefined" && { level }),
      ...(isActive !== undefined && { isActive: isActive === "true" || isActive === true }),
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    )

    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    res.json(course)
  } catch (e) {
    console.error("UPDATE COURSE ERROR:", e)
    res.status(500).json({ message: "Failed to update course" })
  }
}

// DELETE /api/courses/:id - Admin only, delete a course
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }
    res.json({ success: true, message: "Course deleted successfully" })
  } catch (e) {
    res.status(500).json({ message: "Failed to delete course" })
  }
}
