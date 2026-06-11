import mongoose from "mongoose"
import dotenv from "dotenv"
import Course from "./models/Course.js"
import Module from "./models/Module.js"
import Lesson from "./models/Lesson.js"
import User from "./models/User.js"

dotenv.config()

const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tutorhours"

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log("Connected to MongoDB for seeding LMS data...")

    // Clear old courses/modules/lessons
    await Course.deleteMany({ subject: "LMS Demo" })
    console.log("Cleared old LMS Demo courses.")

    // Get an admin user to set as creator
    let admin = await User.findOne({ role: "admin" })
    if (!admin) {
      // Create a dummy admin if none exists
      admin = await User.create({
        name: "Admin User",
        email: "admin@tutorhours.com",
        password: "hashedpassword", // dummy
        role: "admin",
        isVerified: true,
        profileCompleted: true
      })
      console.log("Created dummy admin user: admin@tutorhours.com")
    }

    // ── 1. Create Course 1 ──
    const course1 = await Course.create({
      title: "Introduction to Calculus",
      description: "Master the basics of limits, derivatives, integrals, and their real-world applications in this self-paced masterclass.",
      subject: "LMS Demo",
      instructor: "Prof. Alan Turing",
      duration: "4 hours",
      level: "Beginner",
      price: 0,
      category: "Mathematics",
      tags: ["calculus", "math", "limits"],
      status: "published",
      createdBy: admin._id,
      isActive: true,
    })

    // Course 1 Modules
    const m1_1 = await Module.create({
      courseId: course1._id,
      title: "Limits & Continuity",
      order: 1,
    })

    await Lesson.create({
      moduleId: m1_1._id,
      courseId: course1._id,
      title: "Understanding Limits Conceptually",
      type: "video",
      contentUrl: "https://www.youtube.com/watch?v=YNstP0ESndU", // math limits video
      duration: "10:15",
      order: 1,
      isFree: true,
      description: "An intuitive introduction to what a limit is and why it forms the foundation of calculus."
    })

    await Lesson.create({
      moduleId: m1_1._id,
      courseId: course1._id,
      title: "Limits & Infinity Practice Guide",
      type: "pdf",
      contentUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      order: 2,
      description: "Read through this cheatsheet to review standard limit calculations."
    })

    const m1_2 = await Module.create({
      courseId: course1._id,
      title: "The Power of Derivatives",
      order: 2,
    })

    await Lesson.create({
      moduleId: m1_2._id,
      courseId: course1._id,
      title: "Calculating Derivatives Using Power Rule",
      type: "video",
      contentUrl: "https://www.youtube.com/watch?v=5yfh5cf4-0w",
      duration: "12:00",
      order: 1,
      description: "Learn how to find the instantaneous rate of change using simple exponent rules."
    })


    // ── 2. Create Course 2 (Draft) ──
    await Course.create({
      title: "Advanced Quantum Physics (Draft Demo)",
      description: "Dive deep into wave functions, quantum entanglement, and state vectors. Designed for advanced students.",
      subject: "LMS Demo",
      instructor: "Dr. Richard Feynman",
      duration: "12 hours",
      level: "Advanced",
      price: 499,
      category: "Physics",
      status: "draft",
      createdBy: admin._id,
      isActive: true,
    })

    console.log("Seeding complete! 🚀 Created 1 Published Course (with 2 Modules, 3 Lessons) and 1 Draft Course.")
  } catch (e) {
    console.error("Seeding error:", e)
  } finally {
    await mongoose.disconnect()
  }
}

seed()
