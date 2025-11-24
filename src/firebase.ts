// TODO: fill from your Firebase console
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB5GVEutIZdl6oj7lE5gxP6GRRYkfxxl60",
  authDomain: "letschat-72202.firebaseapp.com",
  projectId: "letschat-72202",
  storageBucket: "letschat-72202.firebasestorage.app",
  messagingSenderId: "28681622920",
  appId: "1:28681622920:web:9c9cad54e5101f725f963d",
  measurementId: "G-QH0J5QJR2C"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
