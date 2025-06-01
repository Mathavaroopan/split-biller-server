const express = require('express');
const router = express.Router();
const { 
  getUserInvitations,
  acceptInvitation,
  rejectInvitation
} = require('../controllers/invitationController');
const { protect } = require('../middleware/auth');

// All invitation routes are protected
router.get('/', protect, getUserInvitations);
router.post('/:id/accept', protect, acceptInvitation);
router.post('/:id/reject', protect, rejectInvitation);

module.exports = router; 