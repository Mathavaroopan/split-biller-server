const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/notifications', notificationRoutes);

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Server error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't crash the server, just log the error
}); 