const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { calculateSplits } = require('../utils/expenseCalculator');
const { convertCurrency } = require('../utils/currencyConverter');

// @desc    Add expense to group
// @route   POST /api/expenses
// @access  Private
const addExpense = async (req, res) => {
  try {
    const { 
      title, 
      amount, 
      groupId, 
      splitType, 
      splits, 
      category, 
      notes, 
      currency = 'USD',
      selectedMembers = [] // New parameter for selected members only
    } = req.body;
    
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
        // For equal splits, we can either use all members or selected members
        if (selectedMembers && selectedMembers.length > 0) {
          // Verify all selected members belong to the group
          for (const memberId of selectedMembers) {
            if (!group.members.includes(memberId)) {
              return res.status(400).json({ message: `User ${memberId} is not a member of this group` });
            }
          }
          
          // Calculate equal splits among selected members only
          const members = selectedMembers;
          processedSplits = members.map(memberId => ({
            user: memberId,
            share: parseFloat((amount / members.length).toFixed(2))
          }));
          
          // Adjust for rounding errors - add remainder to the first member
          const totalAllocated = processedSplits.reduce((sum, split) => sum + split.share, 0);
          if (Math.abs(totalAllocated - amount) > 0.01) {
            const remainder = amount - totalAllocated;
            processedSplits[0].share = parseFloat((processedSplits[0].share + remainder).toFixed(2));
          }
        } else {
          // Original behavior - split among all members
          processedSplits = calculateSplits(amount, splitType, group.members);
        }
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
        processedSplits = Object.entries(splits).map(([userId, share]) => ({
          user: userId,
          share: splitType === 'percentage' 
            ? parseFloat((amount * share / 100).toFixed(2)) 
            : parseFloat(share)
        }));
        
        // Adjust for rounding errors in percentage splits
        if (splitType === 'percentage') {
          const totalAllocated = processedSplits.reduce((sum, split) => sum + split.share, 0);
          if (Math.abs(totalAllocated - amount) > 0.01) {
            const remainder = amount - totalAllocated;
            processedSplits[0].share = parseFloat((processedSplits[0].share + remainder).toFixed(2));
          }
        }
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
    
    // Create notifications for group members involved in the expense
    const notification = {
      message: `${req.user.username} added a new expense "${title}" (${currency} ${amount}) to group "${group.name}"`,
    };
    
    const involvedMemberIds = processedSplits.map(split => split.user.toString());
    
    const notificationPromises = involvedMemberIds
      .filter(memberId => memberId !== req.user._id.toString())
      .map(memberId => 
        Notification.create({
          userId: memberId,
          ...notification
        })
      );
    
    await Promise.all(notificationPromises);
    
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

// @desc    Get all expenses for current user across all groups
// @route   GET /api/expenses
// @access  Private
const getAllUserExpenses = async (req, res) => {
  try {
    // Get all groups the user is a member of
    const userGroups = await Group.find({ members: req.user._id }).select('_id name');
    
    if (userGroups.length === 0) {
      return res.json([]);
    }
    
    // Get all group IDs
    const groupIds = userGroups.map(group => group._id);
    
    // Find all expenses from these groups
    const expenses = await Expense.find({ groupId: { $in: groupIds } })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .populate('groupId', 'name') // Include group name
      .sort({ createdAt: -1 });
      
    res.json(expenses);
  } catch (error) {
    console.error('Get all user expenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark a user's share of an expense as settled
// @route   POST /api/expenses/:id/settle
// @access  Private
const settleExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const { userId } = req.body; // User who is settling up (if admin is marking on behalf of someone)
    
    // Find the expense
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Determine which user is settling (either current user or specified userId)
    const settlingUserId = userId || req.user._id.toString();
    
    // Check if the settling user is part of the expense
    const splitIndex = expense.splits.findIndex(
      split => split.user.toString() === settlingUserId
    );
    
    if (splitIndex === -1) {
      return res.status(400).json({ message: 'User is not part of this expense' });
    }
    
    // Mark as settled
    expense.splits[splitIndex].settled = true;
    expense.splits[splitIndex].settledAt = new Date();
    
    await expense.save();
    
    // Create notification for the user who paid
    if (expense.paidBy.toString() !== settlingUserId) {
      const settlingUser = await User.findById(settlingUserId);
      
      await Notification.create({
        userId: expense.paidBy,
        message: `${settlingUser.name} has settled their share of expense "${expense.title}" (${expense.splits[splitIndex].share})`
      });
    }
    
    res.json({ 
      message: 'Expense marked as settled',
      expense
    });
  } catch (error) {
    console.error('Settle expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark a specific split as settled
// @route   POST /api/expenses/:id/settle-split
// @access  Private
const settleSplit = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const { userId } = req.body; // The user whose split is being settled
    
    if (!userId) {
      return res.status(400).json({ message: 'Please provide userId for the split to settle' });
    }
    
    // Find the expense
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Verify that the current user is the one who paid for the expense
    if (expense.paidBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the expense creator can mark splits as settled' });
    }
    
    // Find the specific split to settle
    const splitIndex = expense.splits.findIndex(
      split => split.user.toString() === userId
    );
    
    if (splitIndex === -1) {
      return res.status(404).json({ message: 'User split not found in this expense' });
    }
    
    // Check if already settled
    if (expense.splits[splitIndex].settled) {
      return res.status(400).json({ message: 'This split is already settled' });
    }
    
    // Mark as settled
    expense.splits[splitIndex].settled = true;
    expense.splits[splitIndex].settledAt = new Date();
    
    await expense.save();
    
    // Create notification for the user whose split was settled
    await Notification.create({
      userId: userId,
      message: `${req.user.name} has marked your payment for expense "${expense.title}" (${expense.currency} ${expense.splits[splitIndex].share.toFixed(2)}) as settled`
    });
    
    res.json({ 
      message: 'Split marked as settled',
      expense
    });
  } catch (error) {
    console.error('Settle split error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addExpense,
  getGroupExpenses,
  deleteExpense,
  convertCurrencyAmount,
  getAllUserExpenses,
  settleExpense,
  settleSplit
}; 