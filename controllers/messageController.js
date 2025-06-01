const Message = require('../models/Message');
const Group = require('../models/Group');
const mongoose = require('mongoose');

// @desc    Get all messages for a group
// @route   GET /api/groups/:id/messages
// @access  Private
const getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.id;
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to access messages for this group' });
    }
    
    // Get messages, newest last (for easy scrolling to bottom)
    const messages = await Message.find({ groupId })
      .sort({ createdAt: 1 })
      .limit(100); // Limit to last 100 messages
    
    res.json(messages);
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new message
// @route   POST /api/groups/:id/messages
// @access  Private
const createMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const groupId = req.params.id;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to send messages to this group' });
    }
    
    // Create the message
    const message = await Message.create({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      text: text.trim()
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a message
// @route   DELETE /api/groups/:groupId/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is a member of the group
    if (!group.members.some(member => member.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to access this group' });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user is the author of the message or group admin
    if (message.userId.toString() !== req.user._id.toString() && 
        group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    // Delete the message
    await message.remove();
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getGroupMessages,
  createMessage,
  deleteMessage
}; 