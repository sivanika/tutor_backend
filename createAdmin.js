import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import User from "./models/User.js"

dotenv.config()

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)

    const email = "admin@gmail.com"

    const existing = await User.findOne({ email })
    if (existing) {
      console.log("❌ Admin already exists")
      process.exit()
    }

    const hashedPassword = await bcrypt.hash("admin@123", 10)

    await User.create({
      name: "Admin",
      email,
      password: hashedPassword,
      role: "admin",
      isVerified: true,
    })

    console.log("✅ Admin created successfully")
    process.exit()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

createAdmin()
