import Announcement from "../models/Announcement.js"

// GET /api/announcements — public, active ones only (for homepage)
export const getActiveAnnouncements = async (req, res) => {
  try {
    const items = await Announcement.find({ active: true }).sort({ priority: -1, createdAt: -1 })
    res.json(items)
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch announcements" })
  }
}

// GET /api/announcements/all — admin only, all announcements
export const getAllAnnouncements = async (req, res) => {
  try {
    const items = await Announcement.find().sort({ createdAt: -1 }).populate("createdBy", "name")
    res.json(items)
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch announcements" })
  }
}

// POST /api/announcements — admin only, create
export const createAnnouncement = async (req, res) => {
  try {
    const { title, text, icon, priority, active } = req.body
    if (!title?.trim() || !text?.trim())
      return res.status(400).json({ message: "Title and text are required" })

    const item = await Announcement.create({
      title: title.trim(),
      text: text.trim(),
      icon: icon?.trim() || "📢",
      priority: !!priority,
      active: active !== false,
      createdBy: req.user._id,
    })
    res.status(201).json(item)
  } catch (e) {
    res.status(500).json({ message: "Failed to create announcement" })
  }
}

// PUT /api/announcements/:id — admin only, update
export const updateAnnouncement = async (req, res) => {
  try {
    const { title, text, icon, priority, active } = req.body
    const item = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, text, icon, priority, active },
      { new: true, runValidators: true }
    )
    if (!item) return res.status(404).json({ message: "Not found" })
    res.json(item)
  } catch (e) {
    res.status(500).json({ message: "Failed to update announcement" })
  }
}

// DELETE /api/announcements/:id — admin only
export const deleteAnnouncement = async (req, res) => {
  try {
    const item = await Announcement.findByIdAndDelete(req.params.id)
    if (!item) return res.status(404).json({ message: "Not found" })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ message: "Failed to delete announcement" })
  }
}
