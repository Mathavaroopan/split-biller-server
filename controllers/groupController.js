const Group = require('../models/Group');
const User = require('../models/User');
const InviteToken = require('../models/InviteToken');
const Notification = require('../models/Notification');
const { generateInviteToken } = require('../utils/generateToken');
const { sendInviteEmail } = require('../utils/emailService');
const { INVITE_TOKEN_EXPIRY } = require('../config/constants');
const mongoose = require('mongoose');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    
    const group = await Group.create({
      name,
      members: [req.user._id], // Add creator as first member
      createdBy: req.user._id
    });
    
    // Add group to user's groups
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { groups: group._id } },
      { new: true }
    );
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all user's groups
// @route   GET /api/groups
// @access  Private
const getUserGroups = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('groups');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.groups);
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get group details
// @route   GET /api/groups/:id
// @access  Private
const getGroupDetails = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email phone')
      .populate('createdBy', 'name email');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to access this group' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Invite user to group via email
// @route   POST /api/groups/:id/invite
// @access  Private
const inviteUserToGroup = async (req, res) => {
  try {
    const { email, message } = req.body;
    const groupId = req.params.id;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is a member of the group
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to invite to this group' });
    }
    
    // Check if user is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser && group.members.includes(existingUser._id)) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }
    
    // Check if there's already a pending invitation for this email
    const existingInvite = await InviteToken.findOne({ 
      email, 
      groupId,
      expiresAt: { $gt: new Date() }
    });
    
    if (existingInvite) {
      return res.status(400).json({ 
        message: 'An invitation has already been sent to this email',
        inviteId: existingInvite._id
      });
    }
    
    // Generate invite token
    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY);
    
    // Save token to database
    const invite = await InviteToken.create({
      email,
      groupId,
      token,
      expiresAt,
      invitedBy: req.user._id
    });
    
    // Generate invite link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${token}`;
    
    // Send email with the personalized message if provided
    await sendInviteEmail(
      email,
      req.user.name,
      group.name,
      inviteLink,
      message // Optional personalized message
    );
    
    res.status(200).json({ 
      message: 'Invitation sent successfully',
      invite: {
        id: invite._id,
        email: invite.email,
        expiresAt: invite.expiresAt
      }
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get pending invitations for a group
// @route   GET /api/groups/:id/invitations
// @access  Private
const getGroupInvitations = async (req, res) => {
  try {
    const groupId = req.params.id;
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is a member of the group
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view invitations for this group' });
    }
    
    // Get all valid invitations for the group
    const invitations = await InviteToken.find({
      groupId,
      expiresAt: { $gt: new Date() }
    }).populate('invitedBy', 'name email');
    
    res.json(invitations);
  } catch (error) {
    console.error('Get group invitations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Resend invitation
// @route   POST /api/groups/:id/invite/resend/:inviteId
// @access  Private
const resendInvitation = async (req, res) => {
  try {
    const { id: groupId, inviteId } = req.params;
    
    console.log(`Attempting to resend invitation. Group ID: ${groupId}, Invite ID: ${inviteId}`);
    console.log(`Invite ID length: ${inviteId.length}`);
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      console.log(`Invalid group ID format: ${groupId}`);
      return res.status(400).json({ message: 'Invalid group ID format' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(inviteId)) {
      console.log(`Invalid invitation ID format: ${inviteId}, length: ${inviteId.length}`);
      console.log('MongoDB ObjectIDs must be 24 characters long (12 bytes)');
      return res.status(400).json({ 
        message: 'Invalid invitation ID format', 
        details: 'MongoDB ObjectIDs must be 24 characters long'
      });
    }
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      console.log(`Group not found with ID: ${groupId}`);
      return res.status(404).json({ message: 'Group not found' });
    }
    
    console.log(`Group found: ${group.name}`);
    
    // Check if user is a member of the group
    const isUserMember = group.members.some(member => member.toString() === req.user._id.toString());
    console.log(`User is member of group: ${isUserMember}`);
    
    if (!isUserMember) {
      return res.status(403).json({ message: 'Not authorized to resend invitations for this group' });
    }
    
    // Find the invitation
    console.log(`Looking for invitation with ID: ${inviteId}`);
    const invite = await InviteToken.findById(inviteId);
    
    if (!invite) {
      console.log(`Invitation not found with ID: ${inviteId}`);
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    console.log(`Invitation found for email: ${invite.email}`);
    
    // Check if invitation belongs to the correct group
    if (invite.groupId.toString() !== groupId) {
      console.log(`Invitation does not belong to group. Invite group ID: ${invite.groupId}, Requested group ID: ${groupId}`);
      return res.status(403).json({ message: 'Invitation does not belong to this group' });
    }
    
    // Generate a new token and update expiry
    const newToken = generateInviteToken();
    const newExpiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY);
    
    console.log(`Updating invitation with new token and expiry date: ${newExpiresAt}`);
    
    // Update the invitation using findByIdAndUpdate to avoid validation issues
    const updatedInvite = await InviteToken.findByIdAndUpdate(
      inviteId,
      {
        $set: {
          token: newToken,
          expiresAt: newExpiresAt,
          status: 'pending'
        }
      },
      { new: true }
    );
    
    if (!updatedInvite) {
      console.log(`Failed to update invitation with ID: ${inviteId}`);
      return res.status(404).json({ message: 'Failed to update invitation' });
    }
    
    console.log(`Invitation updated successfully. New expiry: ${updatedInvite.expiresAt}`);
    
    // Generate invite link - don't include the base URL here, it's added in the email service
    const inviteLink = newToken;
    
    try {
      // Send new email
      console.log(`Sending email to ${updatedInvite.email}`);
      
      await sendInviteEmail(
        updatedInvite.email,
        req.user.name,
        group.name,
        inviteLink
      );
      
      console.log(`Invitation resent successfully to ${updatedInvite.email}`);
      
      res.status(200).json({
        message: 'Invitation resent successfully',
        invite: {
          id: updatedInvite._id,
          email: updatedInvite.email,
          expiresAt: updatedInvite.expiresAt
        }
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Even if email fails, return success since the token was updated
      res.status(200).json({
        message: 'Invitation token refreshed but email sending failed',
        invite: {
          id: updatedInvite._id,
          email: updatedInvite.email,
          expiresAt: updatedInvite.expiresAt
        }
      });
    }
  } catch (error) {
    console.error('Resend invitation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error: ' + error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
};

// @desc    Join group via invite token
// @route   GET /api/groups/join/:token
// @access  Public
const joinGroup = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find and validate token
    const invite = await InviteToken.findOne({ token });
    
    if (!invite) {
      return res.status(400).json({ message: 'Invalid or expired invitation' });
    }
    
    if (invite.expiresAt < Date.now()) {
      await InviteToken.findByIdAndDelete(invite._id);
      return res.status(400).json({ message: 'Invitation has expired' });
    }
    
    // Get group
    const group = await Group.findById(invite.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user exists or needs to be created
    let user = await User.findOne({ email: invite.email });
    
    if (!user) {
      // In a real app, you would redirect to registration
      return res.status(400).json({ 
        message: 'You need to register first',
        email: invite.email,
        inviteToken: token
      });
    }
    
    // Check if user is already in the group
    if (group.members.includes(user._id)) {
      await InviteToken.findByIdAndDelete(invite._id);
      return res.status(400).json({ message: 'You are already a member of this group' });
    }
    
    // Add user to group
    await Group.findByIdAndUpdate(
      group._id,
      { $push: { members: user._id } }
    );
    
    // Add group to user's groups
    await User.findByIdAndUpdate(
      user._id,
      { $push: { groups: group._id } }
    );
    
    // Create notification for group members
    const notification = {
      message: `${user.name} has joined the group "${group.name}"`,
    };
    
    for (const memberId of group.members) {
      if (memberId.toString() !== user._id.toString()) {
        await Notification.create({
          userId: memberId,
          ...notification
        });
      }
    }
    
    // Delete the invite token
    await InviteToken.findByIdAndDelete(invite._id);
    
    res.status(200).json({ 
      message: 'Successfully joined group',
      group: {
        _id: group._id,
        name: group.name
      }
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify invitation token
// @route   GET /api/groups/verify-invite/:token
// @access  Public
const verifyInviteToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find and validate token
    const invite = await InviteToken.findOne({ token });
    
    if (!invite) {
      return res.status(400).json({ message: 'Invalid or expired invitation' });
    }
    
    if (invite.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invitation has expired' });
    }
    
    // Get group info
    const group = await Group.findById(invite.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user already has an account
    const existingUser = await User.findOne({ email: invite.email });
    
    res.json({
      email: invite.email,
      groupId: group._id,
      groupName: group.name,
      hasAccount: !!existingUser
    });
  } catch (error) {
    console.error('Verify invitation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupDetails,
  inviteUserToGroup,
  joinGroup,
  getGroupInvitations,
  resendInvitation,
  verifyInviteToken
}; 