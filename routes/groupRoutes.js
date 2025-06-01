const express = require('express');
const router = express.Router();
const { 
  createGroup, 
  getUserGroups, 
  getGroupDetails, 
  inviteUserToGroup,
  joinGroup,
  getGroupInvitations,
  resendInvitation,
  verifyInviteToken,
  deleteGroup
} = require('../controllers/groupController');
const { getGroupExpenses } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

// Root routes
router.post('/', protect, createGroup);
router.get('/', protect, getUserGroups);

// Special routes must come before param routes
// Route for joining groups via invitation token
router.get('/join/:token', joinGroup);
// Route for verifying invitation token without joining
router.get('/verify-invite/:token', verifyInviteToken);

// Parameter-based routes 
router.get('/:id', protect, getGroupDetails);
router.post('/:id/invite', protect, inviteUserToGroup);
router.get('/:id/expenses', protect, getGroupExpenses);
router.delete('/:id', protect, deleteGroup);

// New invitation related routes
router.get('/:id/invitations', protect, getGroupInvitations);
router.post('/:id/invite/resend/:inviteId', protect, resendInvitation);

module.exports = router; 