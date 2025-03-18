// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQKMPJCxv2tWJPksOzr0nFMxThBTJ_yyk",
  authDomain: "eato-1f7d8.firebaseapp.com",
  projectId: "eato-1f7d8",
  storageBucket: "eato-1f7d8.firebasestorage.app",
  messagingSenderId: "642778782961",
  appId: "1:642778782961:web:b631ae4e000a12bf1add50",
  measurementId: "G-RN9S7KTCN5"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);