const express = require('express');
const router = express.Router();
const { 
  addExpense, 
  deleteExpense,
  convertCurrencyAmount
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

// Protected routes
router.post('/', protect, addExpense);
router.delete('/:id', protect, deleteExpense);

// Currency conversion route
router.get('/convert', protect, convertCurrencyAmount);

module.exports = router; 