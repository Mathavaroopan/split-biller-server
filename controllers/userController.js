const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const { calculateUserBalance } = require('../utils/expenseCalculator');

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user with populated groups
    const user = await User.findById(userId).populate('groups');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Count total groups
    const totalGroups = user.groups.length;
    
    // Get all expenses for the user (where they are either the payer or involved in splits)
    const expenses = await Expense.find({
      $or: [
        { paidBy: userId },
        { 'splits.user': userId }
      ]
    });
    
    // Count total expenses
    const totalExpenses = expenses.length;
    
    // Calculate total owed and total owing across all groups
    let totalOwed = 0;
    let totalOwing = 0;
    
    // Process all groups to calculate balances
    for (const group of user.groups) {
      // Get all expenses for this group
      const groupExpenses = await Expense.find({ groupId: group._id })
        .populate('paidBy', 'name email')
        .populate('splits.user', 'name email');
      
      // Calculate user's balance in this group
      const { userOwes, userIsOwed } = calculateUserBalance(groupExpenses, userId);
      
      // Add to totals (ensure numeric values with 2 decimal places)
      totalOwed += parseFloat(userIsOwed.toFixed(2));
      totalOwing += parseFloat(userOwes.toFixed(2));
    }
    
    // Calculate overall balance (positive means user is owed money, negative means user owes money)
    const overallBalance = parseFloat((totalOwed - totalOwing).toFixed(2));
    
    res.json({
      totalGroups,
      totalExpenses,
      totalOwed: parseFloat(totalOwed.toFixed(2)),
      totalOwing: parseFloat(totalOwing.toFixed(2)),
      overallBalance
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserStats
}; 