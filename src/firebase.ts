import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

// Firebase config comes from environment variables only. Copy .env.example
// to .env.local and fill in your own Firebase project values. There is no
// config file in this repo on purpose, so nothing secret can leak into git.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined;

// Check for unauthorized domain in development
if (typeof window !== 'undefined' && config.authDomain) {
  const currentDomain = window.location.hostname;
  const isAuthorized =
    currentDomain === 'localhost' ||
    currentDomain === '127.0.0.1' ||
    currentDomain.endsWith('.firebaseapp.com') ||
    currentDomain.endsWith('.web.app');

  if (!isAuthorized) {
    console.warn(
      `[Firebase Auth] Current domain "${currentDomain}" may not be authorized in your Firebase project. ` +
      `If you see "auth/unauthorized-domain", add this domain to the "Authorized Domains" list in the Firebase Console.`
    );
  }
}

export const isFirebaseConfigured = !!config.apiKey && !!config.projectId;

// When Firebase is not configured the app runs in local demo mode. The
// exports below are safe stand-ins so importing this module never crashes.
// Nothing here talks to the network until a real config is provided.
let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(config);
    try {
      dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      }, databaseId);
    } catch (error) {
      console.warn('Failed to initialize Firestore with databaseId, falling back to (default):', error);
      dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    }
    authInstance = getAuth(app);
    storageInstance = getStorage(app);
  } catch (error) {
    console.error('Firebase Initialization Error:', error);
    app = null;
    dbInstance = null;
    authInstance = null;
    storageInstance = null;
  }
}

export const db = dbInstance as Firestore;
export const auth = (authInstance || { currentUser: null }) as Auth;
export const storage = storageInstance as FirebaseStorage;

export const messaging = async (): Promise<Messaging | null> => {
  if (!app) return null;
  if (typeof window !== 'undefined' && await isSupported()) {
    return getMessaging(app);
  }
  return null;
};

// Test connection to Firestore
async function testConnection() {
  if (!isFirebaseConfigured || !db) {
    console.warn('Firebase Connection: No configuration found. Local Demo Mode active.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-connection-error', {
        detail: { message: 'No Firebase configuration' }
      }));
    }
    return;
  }

  try {
    // We use a dummy path to test the connection.
    // We use getDocFromServer to force a network check.
    // Even if it fails with permission-denied, it means we ARE connected.
    await getDocFromServer(doc(db, 'system', 'public'));
    console.log('Firebase Connection: Success');
  } catch (error: any) {
    const errorMessage = error.message?.toLowerCase() || '';
    const isOffline = errorMessage.includes('offline') ||
                      errorMessage.includes('network') ||
                      error.code === 'unavailable' ||
                      error.code === 'deadline-exceeded';

    if (isOffline) {
      console.error('Firebase Connection Error: The client is offline or the network is blocked.');
      window.dispatchEvent(new CustomEvent('firestore-connection-error', {
        detail: { message: 'Network blocked or offline' }
      }));
    } else {
      // Other errors (like permission denied) mean we ARE connected but just can't read this specific path
      console.log('Firebase Connection: Connected (Backend reachable)');
    }
  }
}
testConnection();

export default app;
