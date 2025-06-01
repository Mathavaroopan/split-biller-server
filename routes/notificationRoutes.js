const express = require('express');
const router = express.Router();
const { 
  getUserNotifications, 
  markNotificationsAsRead,
  markAllNotificationsAsRead
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All notification routes are protected
router.get('/', protect, getUserNotifications);
router.post('/mark-read', protect, markNotificationsAsRead);
router.post('/mark-all-read', protect, markAllNotificationsAsRead);

module.exports = router; 