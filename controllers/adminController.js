import User from "../models/User.js"

export const getPendingProfessors = async (req, res) => {
  const professors = await User.find({
    role: "professor",
    isVerified: false,
  })
  res.json(professors)
}

export const verifyProfessor = async (req, res) => {
  const professor = await User.findById(req.params.id)
  professor.isVerified = true
  await professor.save()
  res.json({ message: "Professor verified" })
}
