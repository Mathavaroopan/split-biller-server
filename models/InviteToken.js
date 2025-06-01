const mongoose = require("mongoose");

const inviteTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'rejected'],
    default: 'pending'
  }
});

// Create index for faster lookups
inviteTokenSchema.index({ token: 1 });
inviteTokenSchema.index({ email: 1, groupId: 1 });
inviteTokenSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("InviteToken", inviteTokenSchema); 