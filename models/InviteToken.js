const mongoose = require("mongoose");

const inviteTokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model("InviteToken", inviteTokenSchema); 