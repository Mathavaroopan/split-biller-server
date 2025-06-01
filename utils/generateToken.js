const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET, JWT_EXPIRATION } = require('../config/constants');

// Generate JWT token for authenticated users
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
};

// Generate random token for email invites
const generateInviteToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

module.exports = { generateToken, generateInviteToken }; 