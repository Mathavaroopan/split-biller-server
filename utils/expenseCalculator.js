/**
 * Calculate expense splits based on the specified type
 * @param {number} amount - Total expense amount
 * @param {string} splitType - Type of split ('equal', 'percentage', 'exact')
 * @param {Array} users - Array of user IDs involved in the expense
 * @param {Object} splitDetails - Object containing split details for percentage or exact splits
 * @returns {Array} Array of split objects with user ID and share amount
 */
const calculateSplits = (amount, splitType, users, splitDetails = {}) => {
  if (!amount || amount <= 0) {
    throw new Error('Invalid expense amount');
  }

  if (!users || !Array.isArray(users) || users.length === 0) {
    throw new Error('No users provided for split calculation');
  }

  const splits = [];
  
  switch (splitType) {
    case 'equal':
      const share = amount / users.length;
      for (const userId of users) {
        splits.push({
          user: userId,
          share: parseFloat(share.toFixed(2))
        });
      }
      break;
    
    case 'percentage':
      // For percentage splits, validate total is 100%
      const totalPercentage = Object.values(splitDetails).reduce((sum, val) => sum + parseFloat(val), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Total percentage must equal 100%');
      }
      
      for (const userId in splitDetails) {
        const percentage = parseFloat(splitDetails[userId]);
        const share = (percentage / 100) * amount;
        splits.push({
          user: userId,
          share: parseFloat(share.toFixed(2))
        });
      }
      break;
    
    case 'exact':
      // For exact splits, validate total equals expense amount
      const totalExact = Object.values(splitDetails).reduce((sum, val) => sum + parseFloat(val), 0);
      if (Math.abs(totalExact - amount) > 0.01) {
        throw new Error('Total of exact shares must equal expense amount');
      }
      
      for (const userId in splitDetails) {
        splits.push({
          user: userId,
          share: parseFloat(parseFloat(splitDetails[userId]).toFixed(2))
        });
      }
      break;
    
    default:
      throw new Error('Invalid split type');
  }
  
  return splits;
};

/**
 * Calculate balances within a group - who owes whom and how much
 * @param {Array} expenses - Array of expense objects
 * @param {Array} groupMembers - Array of user IDs in the group
 * @returns {Object} Object containing balances and summary
 */
const calculateGroupBalances = (expenses, groupMembers) => {
  // Initialize balances for all group members
  const balances = {};
  groupMembers.forEach(member => {
    balances[member] = 0;
  });

  // Process each expense
  expenses.forEach(expense => {
    const { paidBy, splits } = expense;
    
    // Add the full amount to the payer's balance (positive = should receive money)
    balances[paidBy] += expense.amount;
    
    // Subtract each person's share from their balance (negative = owes money)
    splits.forEach(split => {
      balances[split.user] -= split.share;
    });
  });

  // Calculate who owes whom
  const transactions = simplifyDebts(balances);

  return {
    balances,
    transactions
  };
};

/**
 * Simplify debts to minimize the number of transactions needed
 * @param {Object} balances - Object with user IDs as keys and balance amounts as values
 * @returns {Array} Array of simplified transactions
 */
const simplifyDebts = (balances) => {
  const transactions = [];
  
  // Create arrays of creditors (positive balance) and debtors (negative balance)
  const creditors = [];
  const debtors = [];

  for (const userId in balances) {
    const balance = parseFloat(balances[userId].toFixed(2));
    
    if (balance > 0) {
      creditors.push({ id: userId, amount: balance });
    } else if (balance < 0) {
      debtors.push({ id: userId, amount: Math.abs(balance) });
    }
    // People with exactly 0 balance are excluded
  }

  // Sort both arrays in descending order (highest amounts first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Greedy algorithm to minimize transactions
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    if (amount > 0) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: parseFloat(amount.toFixed(2))
      });
    }
    
    // Update balances
    debtor.amount -= amount;
    creditor.amount -= amount;
    
    // Remove users with zero balance
    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }

  return transactions;
};

/**
 * Calculate a user's balance in a group
 * @param {Array} expenses - Array of expense objects for the group
 * @param {String} userId - ID of the user to calculate balance for
 * @returns {Object} - Object with userOwes and userIsOwed values
 */
const calculateUserBalance = (expenses, userId) => {
  let userOwes = 0;
  let userIsOwed = 0;
  
  for (const expense of expenses) {
    // If user paid for this expense
    if (expense.paidBy._id.toString() === userId.toString()) {
      userIsOwed += expense.amount;
    }
    
    // Find user's share in this expense
    const userSplit = expense.splits.find(split => 
      split.user._id.toString() === userId.toString()
    );
    
    if (userSplit) {
      userOwes += userSplit.share;
    }
  }
  
  return { userOwes, userIsOwed };
};

/**
 * Calculate simplified payment plan for a group
 * @param {Object} balances - Object with user IDs as keys and balance amounts as values
 * @returns {Array} - Array of payment objects { from, to, amount }
 */
const calculatePaymentPlan = (balances) => {
  const payments = [];
  
  // Separate positive (creditors) and negative (debtors) balances
  const creditors = [];
  const debtors = [];
  
  for (const userId in balances) {
    const balance = balances[userId];
    
    if (balance > 0) {
      creditors.push({ userId, amount: balance });
    } else if (balance < 0) {
      debtors.push({ userId, amount: Math.abs(balance) });
    }
  }
  
  // Sort by amount (descending)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  // Create payments by matching debtors with creditors
  let i = 0; // index for creditors
  let j = 0; // index for debtors
  
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    
    // Calculate payment amount (minimum of what debtor owes and what creditor is owed)
    const paymentAmount = Math.min(creditor.amount, debtor.amount);
    
    if (paymentAmount > 0) {
      payments.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: parseFloat(paymentAmount.toFixed(2))
      });
    }
    
    // Update remaining amounts
    creditor.amount -= paymentAmount;
    debtor.amount -= paymentAmount;
    
    // Move to next creditor/debtor if their balance is settled
    if (creditor.amount <= 0.01) {
      i++;
    }
    
    if (debtor.amount <= 0.01) {
      j++;
    }
  }
  
  return payments;
};

module.exports = {
  calculateSplits,
  calculateGroupBalances,
  calculateUserBalance,
  calculatePaymentPlan
}; 