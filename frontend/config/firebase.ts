import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA9cgbiCDWlyDCdTc-XlQ6O8tehZ8j44PU",
  authDomain: "concordia-waze.firebaseapp.com",
  projectId: "concordia-waze",
  storageBucket: "concordia-waze.firebasestorage.app",
  messagingSenderId: "443355803050",
  appId: "1:443355803050:web:6e730fd0c7957620c78fd3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export default app;