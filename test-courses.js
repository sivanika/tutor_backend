import "./config/env.js"
import connectDB from "./config/db.js"
import Course from "./models/Course.js"
import mongoose from "mongoose"

async function run() {
  console.log("Connecting to DB...")
  await connectDB()
  console.log("Connected. Testing Course creation...")

  try {
    const course = await Course.create({
      title: "Test Course",
      description: "Test description",
      subject: "Test Subject",
      videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      instructor: "Admin",
      duration: "5m",
      level: "Beginner",
      isActive: true
    })
    console.log("SUCCESS! Created course:", course)
  } catch (err) {
    console.error("FAILED TO CREATE COURSE:", err)
  } finally {
    await mongoose.disconnect()
    console.log("Disconnected from DB.")
  }
}

run()
