import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCpxgnhQI_M8u3Z4DChsycoUE-vmXsAnWI",
  authDomain: "petzy-74795.firebaseapp.com",
  projectId: "petzy-74795",
  storageBucket: "petzy-74795.appspot.com",
  messagingSenderId: "569252192954",
  appId: "1:569252192954:web:d26d03e79ea09d6d275883",
  measurementId: "G-MEBS5HJDPR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };