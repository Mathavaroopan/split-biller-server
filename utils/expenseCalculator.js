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

  switch (splitType) {
    case 'equal':
      return calculateEqualSplit(amount, users);
    
    case 'percentage':
      return calculatePercentageSplit(amount, splitDetails);
    
    case 'exact':
      return validateExactSplit(amount, splitDetails);
    
    default:
      throw new Error(`Invalid split type: ${splitType}`);
  }
};

const calculateEqualSplit = (amount, users) => {
  const perUserAmount = parseFloat((amount / users.length).toFixed(2));
  
  // Handle rounding errors by assigning the remaining cents to the first user
  const splits = users.map((userId, index) => {
    let share = perUserAmount;
    
    // If it's the first user and there's a rounding difference, add it
    if (index === 0) {
      const roundingDiff = amount - (perUserAmount * users.length);
      if (roundingDiff !== 0) {
        share = parseFloat((share + roundingDiff).toFixed(2));
      }
    }
    
    return { user: userId, share };
  });
  
  return splits;
};

const calculatePercentageSplit = (amount, splitDetails) => {
  let totalPercentage = 0;
  const splits = [];

  for (const userId in splitDetails) {
    const percentage = splitDetails[userId];
    
    if (typeof percentage !== 'number' || percentage < 0) {
      throw new Error(`Invalid percentage for user ${userId}`);
    }
    
    totalPercentage += percentage;
    
    const share = parseFloat(((amount * percentage) / 100).toFixed(2));
    splits.push({ user: userId, share });
  }

  // Verify total percentage is 100%
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Total percentage (${totalPercentage}%) must equal 100%`);
  }

  return splits;
};

const validateExactSplit = (amount, splitDetails) => {
  let totalShares = 0;
  const splits = [];

  for (const userId in splitDetails) {
    const share = splitDetails[userId];
    
    if (typeof share !== 'number' || share < 0) {
      throw new Error(`Invalid share amount for user ${userId}`);
    }
    
    totalShares += share;
    splits.push({ user: userId, share });
  }

  // Verify total shares equals the expense amount
  if (Math.abs(totalShares - amount) > 0.01) {
    throw new Error(`Total shares (${totalShares}) must equal expense amount (${amount})`);
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

module.exports = { calculateSplits, calculateGroupBalances }; 