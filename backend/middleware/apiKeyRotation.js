// middleware/apiKeyRotation.js
// ------------------------------------------------------------
// API Key Rotation Middleware
// ------------------------------------------------------------
// This middleware validates API keys supplied in the request headers.
// It supports key rotation without downtime by allowing multiple active keys.
// Valid keys are stored in an environment variable `API_KEYS` as a
// comma‑separated list (e.g., "key1,key2,oldKey"). The middleware checks
// the `x-api-key` header (case‑insensitive) against this list. If the key
// is missing or invalid, the request is rejected with HTTP 401 and an
// attempt is logged.
// ------------------------------------------------------------

const express = require('express'); // keep for type consistency

/**
 * Helper to retrieve the array of valid API keys from the environment.
 * Returns an empty array if the variable is not defined.
 */
function getValidApiKeys() {
  const raw = process.env.API_KEYS || '';
  // Split on commas, trim whitespace, and filter out empty strings
  return raw.split(',').map(k => k.trim()).filter(Boolean);
}

/**
 * Middleware factory. Allows optional configuration such as custom header name.
 * @param {Object} [options]
 * @param {string} [options.headerName='x-api-key'] Header to read the API key from.
 * @returns {Function} Express middleware function.
 */
function apiKeyRotation(options = {}) {
  const headerName = (options.headerName || 'x-api-key').toLowerCase();

  return function (req, res, next) {
    // Header names are case‑insensitive; Express normalises them to lower case.
    const suppliedKey = req.headers[headerName];
    const validKeys = getValidApiKeys();

    if (validKeys.includes(suppliedKey)) {
      // Valid key – allow request to continue.
      return next();
    }

    // Log the invalid attempt. Using console.warn is sufficient; in the
    // production codebase a structured logger (e.g., morgan) may be used.
    console.warn('[API Key Rotation] Invalid or missing API key', {
      path: req.path,
      method: req.method,
      suppliedKey,
      validKeysCount: validKeys.length
    });

    // Respond with 401 Unauthorized.
    return res.status(401).json({
      success: false,
      error: 'Unauthorized – invalid API key.'
    });
  };
}

module.exports = apiKeyRotation;