const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient querying of messages by groupId
messageSchema.index({ groupId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 