const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  splitType: {
    type: String,
    enum: ['equal', 'percentage', 'exact'],
    required: true
  },
  splits: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      share: { type: Number }, // amount or percentage based on splitType
      settled: { type: Boolean, default: false }, // track if this user has settled their share
      settledAt: { type: Date } // when the user settled their share
    }
  ],
  category: { type: String, default: 'general' }, // food, travel, shopping, etc.
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Expense", expenseSchema);
