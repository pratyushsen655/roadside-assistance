import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

const originalFetch = global.fetch;

let alertShown = false;
const showOfflineAlert = () => {
  if (alertShown) return;
  alertShown = true;
  Alert.alert(
    'No Internet Connection',
    'No Internet Connection. Please check your network.',
    [{ text: 'OK', onPress: () => { alertShown = false; } }]
  );
};

const getHTTPErrorMessage = (status) => {
  switch (status) {
    case 401:
      return 'Session expired. Please log in again.';
    case 403:
      return 'Access denied. You do not have permission to perform this action.';
    case 404:
      return 'Resource not found. Please try again.';
    case 500:
      return 'Internal server error. Our team has been notified.';
    default:
      if (status >= 500) {
        return 'Server error. Please try again later.';
      }
      return `Request failed with status ${status}.`;
  }
};

const isTemporaryFailure = (error, status) => {
  if (error) {
    const msg = error.message || '';
    if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('Network request failed') || msg.includes('aborted')) {
      return true;
    }
  }
  if (status && status >= 500) {
    return true;
  }
  return false;
};

global.fetch = async function (input, init = {}) {
  const url = typeof input === 'string' ? input : input.url;

  // 1. Connectivity Check
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    showOfflineAlert();
    throw new Error('No Internet Connection. Please check your network.');
  }

  const retries = 3;
  let delay = 1000;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const fetchOptions = {
      ...init,
      signal: controller.signal
    };

    if (__DEV__) {
      let sanitizedHeaders = init.headers ? { ...init.headers } : {};
      if (sanitizedHeaders.Authorization) sanitizedHeaders.Authorization = 'Bearer [REDACTED]';
      if (sanitizedHeaders.authorization) sanitizedHeaders.authorization = 'Bearer [REDACTED]';

      let sanitizedBody = init.body;
      if (typeof init.body === 'string') {
        try {
          const parsed = JSON.parse(init.body);
          if (parsed.password) parsed.password = '[REDACTED]';
          if (parsed.otp) parsed.otp = '[REDACTED]';
          if (parsed.accountNumber) parsed.accountNumber = '[REDACTED]';
          sanitizedBody = JSON.stringify(parsed);
        } catch (_) {}
      }

      console.log(`[Network Request] ${init.method || 'GET'} [Attempt ${attempt}/${retries}] - ${url}`, {
        headers: sanitizedHeaders,
        body: sanitizedBody
      });
    }

    try {
      const response = await originalFetch(input, fetchOptions);
      clearTimeout(timeoutId);

      if (__DEV__) {
        console.log(`[Network Response] ${url} - Status: ${response.status}`);
      }

      if (!response.ok) {
        if (__DEV__) {
          let responseBody = '';
          try {
            responseBody = await response.clone().text();
          } catch (_) {}
          console.warn(`[Network HTTP Info] ${url} - Status: ${response.status} - Body: ${responseBody}`);
        }
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);

      let specializedError = err;
      if (err.name === 'AbortError') {
        specializedError = new Error('Connection timed out. Please check your internet connection.');
        specializedError.isTimeout = true;
      } else if (err.message && err.message.includes('Network request failed')) {
        const currentNetState = await NetInfo.fetch();
        if (!currentNetState.isConnected) {
          showOfflineAlert();
          specializedError = new Error('No Internet Connection. Please check your network.');
        } else {
          specializedError = new Error('Could not connect to server. Please check your network or try again.');
        }
        specializedError.isNetworkError = true;
      }

      if (__DEV__) {
        console.error(`[Network Exception] ${url}`, {
          message: specializedError.message,
          stack: specializedError.stack,
          original: err
        });
      }

      if (attempt < retries && isTemporaryFailure(specializedError, null)) {
        if (__DEV__) console.log(`[Network Retry] Retrying in ${delay}ms due to temporary error: ${specializedError.message}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      throw specializedError;
    }
  }
};
