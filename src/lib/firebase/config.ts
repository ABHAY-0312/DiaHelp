
"use client";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const getFirebaseConfig = () => {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Firebase configuration is missing or invalid. Please ensure all NEXT_PUBLIC_FIREBASE_* variables are set in your .env.local file.");
  }
  
  return firebaseConfig;
};


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
    const config = getFirebaseConfig();
    if (!getApps().length) {
        app = initializeApp(config);
    } else {
        app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error: any) {
    console.error(error.message);
}


export { app, auth, db };
