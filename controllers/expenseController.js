const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { calculateSplits } = require('../utils/expenseCalculator');
const { convertCurrency } = require('../utils/currencyConverter');
const { sendNotificationEmail } = require('../utils/emailService');

// @desc    Add expense to group
// @route   POST /api/expenses
// @access  Private
const addExpense = async (req, res) => {
  try {
    const { title, amount, groupId, splitType, splits, category, notes, currency = 'USD' } = req.body;
    
    // Validate required fields
    if (!title || !amount || !groupId || !splitType) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is in the group
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to add expenses to this group' });
    }
    
    let processedSplits;
    
    // Handle different split types
    switch (splitType) {
      case 'equal':
        // For equal splits, we need all members
        processedSplits = calculateSplits(amount, splitType, group.members);
        break;
        
      case 'percentage':
      case 'exact':
        // For percentage or exact splits, validate the provided splits
        if (!splits || Object.keys(splits).length === 0) {
          return res.status(400).json({ message: `Please provide split details for ${splitType} split` });
        }
        
        // Ensure all split users are group members
        for (const userId in splits) {
          if (!group.members.includes(userId)) {
            return res.status(400).json({ message: `User ${userId} is not a member of this group` });
          }
        }
        
        // Calculate splits based on the provided details
        processedSplits = calculateSplits(amount, splitType, group.members, splits);
        break;
        
      default:
        return res.status(400).json({ message: 'Invalid split type' });
    }
    
    // Create new expense
    const expense = await Expense.create({
      title,
      amount,
      paidBy: req.user._id,
      groupId,
      splitType,
      splits: processedSplits,
      category: category || 'general',
      notes,
      currency
    });
    
    // Add expense to group
    await Group.findByIdAndUpdate(
      groupId,
      { $push: { expenses: expense._id } }
    );
    
    // Create notifications for group members
    const notification = {
      message: `${req.user.name} added a new expense "${title}" (${currency} ${amount}) to group "${group.name}"`,
    };
    
    const notificationPromises = group.members
      .filter(memberId => memberId.toString() !== req.user._id.toString())
      .map(memberId => 
        Notification.create({
          userId: memberId,
          ...notification
        })
      );
    
    await Promise.all(notificationPromises);
    
    // Send email notifications (simulated)
    const memberEmails = await User.find(
      { _id: { $in: group.members, $ne: req.user._id } },
      'email'
    );
    
    memberEmails.forEach(({ email }) => {
      sendNotificationEmail(
        email,
        `New Expense in ${group.name}`,
        notification.message
      );
    });
    
    res.status(201).json(expense);
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all expenses for a group
// @route   GET /api/groups/:id/expenses
// @access  Private
const getGroupExpenses = async (req, res) => {
  try {
    const groupId = req.params.id;
    
    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is in the group
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view expenses for this group' });
    }
    
    // Get all expenses for the group
    const expenses = await Expense.find({ groupId })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(expenses);
  } catch (error) {
    console.error('Get group expenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    
    // Find the expense
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Check if user created the expense
    if (expense.paidBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this expense' });
    }
    
    // Remove expense from group
    await Group.findByIdAndUpdate(
      expense.groupId,
      { $pull: { expenses: expenseId } }
    );
    
    // Delete the expense
    await Expense.findByIdAndDelete(expenseId);
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Convert currency
// @route   GET /api/convert
// @access  Private
const convertCurrencyAmount = async (req, res) => {
  try {
    const { from, to, amount } = req.query;
    
    if (!from || !to || !amount) {
      return res.status(400).json({ message: 'Please provide from, to and amount parameters' });
    }
    
    const convertedAmount = await convertCurrency(
      parseFloat(amount),
      from.toUpperCase(),
      to.toUpperCase()
    );
    
    res.json({
      from,
      to,
      amount: parseFloat(amount),
      convertedAmount
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ message: 'Currency conversion failed', error: error.message });
  }
};

module.exports = {
  addExpense,
  getGroupExpenses,
  deleteExpense,
  convertCurrencyAmount
}; 