const express = require('express');
const router = express.Router();
const { 
  createGroup, 
  getUserGroups, 
  getGroupDetails, 
  inviteUserToGroup,
  joinGroup
} = require('../controllers/groupController');
const { getGroupExpenses } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

// Root routes
router.post('/', protect, createGroup);
router.get('/', protect, getUserGroups);

// Special routes must come before param routes
// Route for joining groups via invitation token
router.get('/join/:token', joinGroup);

// Parameter-based routes 
router.get('/:id', protect, getGroupDetails);
router.post('/:id/invite', protect, inviteUserToGroup);
router.get('/:id/expenses', protect, getGroupExpenses);

module.exports = router; 