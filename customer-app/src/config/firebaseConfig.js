// src/config/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import Constants from 'expo-constants';

// Environment variables (Expo prefixes with EXPO_PUBLIC_)
const firebaseConfig = {
  apiKey: Constants.manifest?.extra?.FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: Constants.manifest?.extra?.FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: Constants.manifest?.extra?.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: Constants.manifest?.extra?.FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.manifest?.extra?.FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.manifest?.extra?.FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
  measurementId: Constants.manifest?.extra?.FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// Emulator configuration for local development
if (process.env.FIREBASE_EMULATOR_HOST) {
  // Firestore emulator (default port 8080)
  try { db.useEmulator('localhost', 8080); } catch (e) {}
  // Auth emulator (default port 9099)
  try { auth.useEmulator('http://localhost:9099'); } catch (e) {}
  // Messaging emulator (if needed)
  // try { messaging.useEmulator('localhost', 9090); } catch (e) {}
}

export default app;
