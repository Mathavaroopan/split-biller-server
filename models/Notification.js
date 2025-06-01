const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    relatedResource: {
      type: {
        resourceType: {
          type: String,
          enum: ['group', 'expense', 'invitation']
        },
        resourceId: {
          type: mongoose.Schema.Types.ObjectId
        }
      },
      required: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Notification", notificationSchema); 