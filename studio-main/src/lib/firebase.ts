import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "REDACTED",
  authDomain: "studio-tutorial-352ac.firebaseapp.com",
  projectId: "studio-tutorial-352ac",
  storageBucket: "studio-tutorial-352ac.appspot.com",
  messagingSenderId: "262305312338",
  appId: "1:262305312338:web:1e35d215911475f3a099a5"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
