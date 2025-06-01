const express = require('express');
const router = express.Router();
const { 
  addExpense, 
  deleteExpense,
  convertCurrencyAmount,
  getAllUserExpenses,
  settleExpense,
  settleSplit
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

// Protected routes
router.get('/', protect, getAllUserExpenses);
router.post('/', protect, addExpense);
router.delete('/:id', protect, deleteExpense);
router.post('/:id/settle', protect, settleExpense);
router.post('/:id/settle-split', protect, settleSplit);

// Currency conversion route
router.get('/convert', protect, convertCurrencyAmount);

module.exports = router; 