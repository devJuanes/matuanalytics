import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { firebaseConfig } from '@/config/firebase'

export const firebaseApp = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)
