import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/User.js"

// ================= REGISTER =================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    // basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields required" })
    }

    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isVerified: role === "student", // professor needs admin approval
    })

    res.status(201).json({
      message: "Registered successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Registration failed" })
  }
}

// ================= LOGIN =================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // ❗ ONLY block unverified PROFESSOR
    if (user.role === "professor" && !user.isVerified) {
      return res
        .status(403)
        .json({ message: "Professor not verified" })
    }

    // ✅ ADMIN MUST PASS
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    res.status(500).json({ message: "Login failed" })
  }
}
