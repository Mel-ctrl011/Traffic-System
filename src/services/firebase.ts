import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
} from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
//Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCcj7eBah4tE30icEb3lXgLOCHK6LAvqg8",
  authDomain: "schoolprojcet.firebaseapp.com",
  projectId: "schoolprojcet",
  storageBucket: "schoolprojcet.firebasestorage.app",
  messagingSenderId: "161894342641",
  appId: "1:161894342641:web:5356bc6874dda4ecc36e50",
  measurementId: "G-RYSBWN8EGJ",
};



//Initialize Firebase
const app = initializeApp(firebaseConfig);
const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence: (
      storage: typeof AsyncStorage,
    ) => NonNullable<Parameters<typeof initializeAuth>[1]>["persistence"];
  }
).getReactNativePersistence;
export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
export const storage = getStorage(app);
// Firestore DB (THIS is what your authService uses)
export const db = getFirestore(app);

// Analytics (only works on web, optional)
