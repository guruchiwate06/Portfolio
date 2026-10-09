import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { AchievementItem, ProjectConfig, PortfolioSettings } from '../types/portfolio';

// Firebase configuration loaded from environment variables or project fallback
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB12iS28xPnce4MHSEbMG8PoqGWFwLlTUk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rajguruchiwate-portfolio.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rajguruchiwate-portfolio',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'rajguruchiwate-portfolio.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '322883267805',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:322883267805:web:5fabe952d6a9970612bf34'
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId
);

const app = isFirebaseConfigured 
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const db = app ? getFirestore(app) : null;

const COLLECTION_NAME = 'portfolio';
const DATA_DOC_ID = 'content';

export interface FirestorePortfolioData {
  achievements?: AchievementItem[];
  projectsConfig?: ProjectConfig[];
  settings?: PortfolioSettings;
  about?: string;
  skills?: string[];
  updatedAt?: string;
}

/**
 * Fetch portfolio data directly from Firestore
 */
export async function getPortfolioFromFirestore(): Promise<FirestorePortfolioData | null> {
  if (!db || !isFirebaseConfigured) return null;
  try {
    const docRef = doc(db, COLLECTION_NAME, DATA_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirestorePortfolioData;
    }
    return null;
  } catch (err) {
    console.warn('[firebase] Error fetching portfolio from Firestore:', err);
    return null;
  }
}

/**
 * Save specific key or whole dataset to Firestore
 */
export async function saveToFirestore(
  key: keyof FirestorePortfolioData, 
  value: any
): Promise<boolean> {
  if (!db || !isFirebaseConfigured) return false;
  try {
    const docRef = doc(db, COLLECTION_NAME, DATA_DOC_ID);
    await setDoc(docRef, {
      [key]: value,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`[firebase] Successfully persisted ${key} to Firestore`);
    return true;
  } catch (err) {
    console.error(`[firebase] Error saving ${key} to Firestore:`, err);
    return false;
  }
}

/**
 * Listen to real-time updates from Firestore (for live portfolio syncing)
 */
export function subscribeToFirestore(
  onData: (data: FirestorePortfolioData) => void
): () => void {
  if (!db || !isFirebaseConfigured) return () => {};
  try {
    const docRef = doc(db, COLLECTION_NAME, DATA_DOC_ID);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        onData(snap.data() as FirestorePortfolioData);
      }
    }, (err) => {
      console.warn('[firebase] Snapshot listener note:', err);
    });
  } catch (err) {
    console.warn('[firebase] Error subscribing to Firestore:', err);
    return () => {};
  }
}
