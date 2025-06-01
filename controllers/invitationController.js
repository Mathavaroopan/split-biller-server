const Invitation = require('../models/Invitation');
const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get all invitations for the current user
// @route   GET /api/invitations
// @access  Private
const getUserInvitations = async (req, res) => {
  try {
    // Find pending invitations for this user by email
    const invitations = await Invitation.find({ 
      email: req.user.email,
      status: 'pending'
    }).populate({
      path: 'groupId',
      select: 'name'
    }).populate({
      path: 'invitedBy',
      select: 'name'
    });
    
    res.json(invitations);
  } catch (error) {
    console.error('Get user invitations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept an invitation
// @route   POST /api/invitations/:id/accept
// @access  Private
const acceptInvitation = async (req, res) => {
  try {
    const invitationId = req.params.id;
    
    // Find the invitation
    const invitation = await Invitation.findById(invitationId);
    
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    // Verify this invitation belongs to the current user
    if (invitation.email !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized to accept this invitation' });
    }
    
    // Check if invitation is pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation is already ${invitation.status}` });
    }
    
    // Check if invitation is expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(400).json({ message: 'Invitation has expired' });
    }
    
    // Add user to group
    await Group.findByIdAndUpdate(
      invitation.groupId,
      { $addToSet: { members: req.user._id } }
    );
    
    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();
    
    // Create notification for group creator
    const group = await Group.findById(invitation.groupId).populate('createdBy', 'name');
    
    await Notification.create({
      userId: invitation.invitedBy,
      message: `${req.user.name} has accepted your invitation to join ${group.name}`
    });
    
    res.json({ message: 'Invitation accepted successfully', groupId: invitation.groupId });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject an invitation
// @route   POST /api/invitations/:id/reject
// @access  Private
const rejectInvitation = async (req, res) => {
  try {
    const invitationId = req.params.id;
    
    // Find the invitation
    const invitation = await Invitation.findById(invitationId);
    
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    // Verify this invitation belongs to the current user
    if (invitation.email !== req.user.email) {
      return res.status(403).json({ message: 'Not authorized to reject this invitation' });
    }
    
    // Check if invitation is pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation is already ${invitation.status}` });
    }
    
    // Update invitation status
    invitation.status = 'rejected';
    invitation.rejectedAt = new Date();
    await invitation.save();
    
    // Create notification for inviter
    const group = await Group.findById(invitation.groupId).populate('createdBy', 'name');
    
    await Notification.create({
      userId: invitation.invitedBy,
      message: `${req.user.name} has declined your invitation to join ${group.name}`
    });
    
    res.json({ message: 'Invitation rejected successfully' });
  } catch (error) {
    console.error('Reject invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserInvitations,
  acceptInvitation,
  rejectInvitation
}; 