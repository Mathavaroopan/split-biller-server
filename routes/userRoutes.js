const express = require('express');
const router = express.Router();
const { getUserStats } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Protected routes
router.get('/stats', protect, getUserStats);

module.exports = router; 