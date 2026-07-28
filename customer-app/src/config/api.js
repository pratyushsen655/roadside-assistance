const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://roadside-assistance-production-ddaf.up.railway.app';
console.log(`[Customer App Runtime Config] API_URL: "${API_URL}" | EXPO_PUBLIC_API_URL: "${process.env.EXPO_PUBLIC_API_URL || 'undefined'}" | Timestamp: ${new Date().toISOString()}`);
export default API_URL;
