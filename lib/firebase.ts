import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDiPTXG8f53YnLmSs4UfBYfW87zIX_pv-M',
  authDomain: 'scarlet-digital-store.firebaseapp.com',
  projectId: 'scarlet-digital-store',
  storageBucket: 'scarlet-digital-store.firebasestorage.app',
  messagingSenderId: '463432406278',
  appId: '1:463432406278:web:4eb09683dc020e7d4e3a87',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
