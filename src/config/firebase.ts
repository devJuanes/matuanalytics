/**
 * Configuración del Firebase Web SDK.
 * Usado para integraciones futuras (Auth, Analytics de Firebase, etc.).
 * El backend usa Firebase Admin SDK con serviceAccountKey.json.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCDuYETmGyrLNZVNcPMiuK1pXCsEQPHRE4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'matuanalytics-37f2f.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'matuanalytics-37f2f',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'matuanalytics-37f2f.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '316220274720',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:316220274720:web:2c481eeb1349dd86d2e445',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-S4ZTD3231Y',
}
