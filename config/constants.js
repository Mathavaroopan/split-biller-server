module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-default-jwt-secret',
  JWT_EXPIRATION: '24h',
  INVITE_TOKEN_EXPIRY: 48 * 60 * 60 * 1000, // 48 hours in milliseconds
  EXCHANGE_RATE_API_URL: 'https://api.exchangerate-api.com/v4/latest/'
}; 