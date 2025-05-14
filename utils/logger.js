// utils/logger.js
const logError = (message, errorDetails = {}) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, {
      ...errorDetails,
      stack: errorDetails.stack || new Error().stack
    });
  };
  
  const logInfo = (message, details = {}) => {
    console.log(`[${new Date().toISOString()}] INFO: ${message}`, details);
  };
  
  module.exports = { logError, logInfo };