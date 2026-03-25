import Notification from "../models/Notification.js";
import { emitNotification } from "../socketHandler.js";

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // limit to recent 50
    res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error fetching notifications" });
  }
};

// @desc    Mark individual notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(notification);
  } catch (error) {
    console.error("Mark notification error:", error);
    res.status(500).json({ message: "Server error marking notification" });
  }
};

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications error:", error);
    res.status(500).json({ message: "Server error marking all notifications" });
  }
};

// Utility function to test notifications (useful for immediate feedback in this task)
// @desc    Create a test notification
// @route   POST /api/notifications/test
// @access  Private
export const createTestNotification = async (req, res) => {
  try {
    const notif = await Notification.create({
      user: req.user._id,
      title: "Test Notification",
      message: "This is a real-time test notification!",
      type: "success",
    });
    
    // Emit it via Socket
    emitNotification(req.user._id, notif);

    res.status(201).json(notif);
  } catch (error) {
    console.error("Create test notification error:", error);
    res.status(500).json({ message: "Server error creating test notification" });
  }
};
