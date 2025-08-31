import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBRtIjYJ9-pP4HSsBOse6IAlvUOwwXxhrk",
    authDomain: "ruchi-4311d.firebaseapp.com",
    projectId: "ruchi-4311d",
    storageBucket: "ruchi-4311d.firebasestorage.app",
    messagingSenderId: "222093203480",
    appId: "1:222093203480:web:146438565619e4a9774b6d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == "failed-precondition") {
      console.error("Persistence failed: Multiple tabs open.");
    } else if (err.code == "unimplemented") {
      console.error("Persistence not supported in this browser.");
    }
  });

// Export Firestore and required functions
export { db, collection, query, where, getDocs, doc, updateDoc, addDoc };