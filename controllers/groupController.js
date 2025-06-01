const Group = require('../models/Group');
const User = require('../models/User');
const InviteToken = require('../models/InviteToken');
const Notification = require('../models/Notification');
const { generateInviteToken } = require('../utils/generateToken');
const { sendInviteEmail } = require('../utils/emailService');
const { INVITE_TOKEN_EXPIRY } = require('../config/constants');

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
    const { email } = req.body;
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
    
    // Generate invite token
    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY);
    
    // Save token to database
    await InviteToken.create({
      email,
      groupId,
      token,
      expiresAt
    });
    
    // Generate invite link (in a real app, this would be a frontend URL)
    const inviteLink = `/api/groups/join/${token}`;
    
    // Send email
    await sendInviteEmail(
      email,
      req.user.name,
      group.name,
      inviteLink
    );
    
    res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ message: 'Server error' });
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

module.exports = {
  createGroup,
  getUserGroups,
  getGroupDetails,
  inviteUserToGroup,
  joinGroup
}; 