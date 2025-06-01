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
    
    // Initialize cumulative stats
    let totalYourShare = 0;
    let totalYouPaid = 0;
    let totalOthersPaidYou = 0;
    let totalYouNeedToPay = 0;
    let totalOthersYetToPay = 0;
    
    // Process all groups to calculate detailed balances
    for (const group of user.groups) {
      // Get all expenses for this group
      const groupExpenses = await Expense.find({ groupId: group._id })
        .populate('paidBy', 'name email')
        .populate('splits.user', 'name email');
      
      if (groupExpenses.length === 0) continue;
      
      // Calculate basic user balance in this group
      const { userOwes, userIsOwed } = calculateUserBalance(groupExpenses, userId);
      
      // Add to the your share total
      totalYourShare += userOwes;
      
      // Calculate how much you paid in this group
      const youPaid = groupExpenses.reduce((total, expense) => {
        if (expense.paidBy._id.toString() === userId.toString()) {
          return total + expense.amount;
        }
        return total;
      }, 0);
      totalYouPaid += youPaid;
      
      totalOthersPaidYou = groupExpenses.filter(expense => 
        expense.paidBy._id.toString() === userId.toString() &&
        expense.splits.some(split => 
          split.user._id.toString() !== userId.toString() && 
          split.settled
        )
      ).reduce((total, expense) => {
        const userSplit = expense.splits.find(split => 
          split.user._id.toString() !== userId.toString() && 
          split.settled
        );
        return total + (userSplit?.share || 0);
      }, 0);
      
      // Calculate how much others still owe you in this group
      const othersYetToPay = groupExpenses.filter(expense => 
        expense.paidBy._id.toString() === userId.toString()
      ).reduce((total, expense) => {
        // Sum up all unsettled splits by others
        const unsettledAmount = expense.splits.reduce((sum, split) => {
          if (split.user._id.toString() !== userId.toString() && !split.settled) {
            return sum + split.share;
          }
          return sum;
        }, 0);
        
        return total + unsettledAmount;
      }, 0);
      totalOthersYetToPay += othersYetToPay;
      
      // Calculate how much you need to pay in this group
      const youNeedToPay = groupExpenses.filter(expense => 
        expense.paidBy._id.toString() !== userId.toString()
      ).reduce((total, expense) => {
        // Find your unsettled share
        const userSplit = expense.splits.find(split => 
          split.user._id.toString() === userId.toString() && 
          !split.settled
        );
        
        return total + (userSplit?.share || 0);
      }, 0);
      totalYouNeedToPay += youNeedToPay;
    }
    
    // Calculate overall balance (positive means user is owed money, negative means user owes money)
    const overallBalance = totalOthersYetToPay - totalYouNeedToPay;
    
    // Format all values to 2 decimal places
    const formatValue = (value) => parseFloat(parseFloat(value).toFixed(2));
    
    res.json({
      totalGroups,
      totalExpenses,
      totalOwed: formatValue(totalOthersYetToPay),
      totalOwing: formatValue(totalYourShare),
      totalPaid: formatValue(totalYouPaid),
      othersPaidYou: formatValue(totalOthersPaidYou),
      youNeedToPay: formatValue(totalYouNeedToPay),
      othersYetToPay: formatValue(totalOthersYetToPay),
      overallBalance: formatValue(overallBalance)
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserStats
}; 