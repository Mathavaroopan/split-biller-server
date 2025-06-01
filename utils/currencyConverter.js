const axios = require('axios');
const { EXCHANGE_RATE_API_URL } = require('../config/constants');

// Cache exchange rates to minimize API calls
let exchangeRatesCache = {};
let lastFetchTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

const fetchExchangeRates = async (baseCurrency) => {
  const currentTime = Date.now();
  
  // If we have cached rates for this currency and they're still fresh
  if (
    exchangeRatesCache[baseCurrency] && 
    currentTime - lastFetchTime < CACHE_TTL
  ) {
    return exchangeRatesCache[baseCurrency];
  }
  
  try {
    const response = await axios.get(`${EXCHANGE_RATE_API_URL}${baseCurrency}`);
    
    if (response.data && response.data.rates) {
      // Update cache
      exchangeRatesCache[baseCurrency] = response.data.rates;
      lastFetchTime = currentTime;
      return response.data.rates;
    }
    
    throw new Error('Invalid response from exchange rate API');
  } catch (error) {
    console.error('Error fetching exchange rates:', error.message);
    throw new Error('Failed to fetch exchange rates');
  }
};

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    const rates = await fetchExchangeRates(fromCurrency);
    
    if (!rates[toCurrency]) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }
    
    const convertedAmount = amount * rates[toCurrency];
    return parseFloat(convertedAmount.toFixed(2)); // Round to 2 decimal places
  } catch (error) {
    console.error('Currency conversion error:', error.message);
    throw error;
  }
};

module.exports = { convertCurrency }; 