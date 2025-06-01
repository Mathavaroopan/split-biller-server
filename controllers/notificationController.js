const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to most recent 50 notifications
    
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark notifications as read
// @route   POST /api/notifications/mark-read
// @access  Private
const markNotificationsAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'Please provide notification IDs to mark as read' });
    }
    
    // Mark specified notifications as read
    await Notification.updateMany(
      { 
        _id: { $in: notificationIds },
        userId: req.user._id // Ensure user can only mark their own notifications
      },
      { isRead: true }
    );
    
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark all user notifications as read
// @route   POST /api/notifications/mark-all-read
// @access  Private
const markAllNotificationsAsRead = async (req, res) => {
  try {
    // Mark all user's notifications as read
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead
}; 