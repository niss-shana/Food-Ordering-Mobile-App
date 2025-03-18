// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQKMPJCxv2tWJPksOzr0nFMxThBTJ_yyk",
  authDomain: "eato-1f7d8.firebaseapp.com",
  projectId: "eato-1f7d8",
  storageBucket: "eato-1f7d8.appspot.com",
  messagingSenderId: "642778782961",
  appId: "1:642778782961:web:b631ae4e000a12bf1add50",
  measurementId: "G-RN9S7KTCN5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
const db = getFirestore(app);
const storage = getStorage(app);

// Exporting at the top level
export { app, auth, db, storage };
