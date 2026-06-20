import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyC3OLuoiPvoPzDE-tPlNe5Nm7eIJn5PiU0',
  authDomain: 'rac-commute-coach-sync.firebaseapp.com',
  projectId: 'rac-commute-coach-sync',
  storageBucket: 'rac-commute-coach-sync.firebasestorage.app',
  messagingSenderId: '52598544386',
  appId: '1:52598544386:web:eb06a23513ed3c72312f1b',
}

const app = initializeApp(firebaseConfig)

export const firebaseAuth = getAuth(app)
export const firebaseDb = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
