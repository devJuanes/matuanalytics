import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const defaultServiceAccount = path.join(repoRoot, 'serviceAccountKey.json')

function resolveServiceAccountPath(): string {
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (envPath) return path.resolve(envPath)
  if (fs.existsSync(defaultServiceAccount)) return defaultServiceAccount
  return ''
}

function resolveDatabaseURL(serviceAccountPath: string): string {
  if (process.env.FIREBASE_DATABASE_URL) return process.env.FIREBASE_DATABASE_URL

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const account = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8')) as { project_id?: string }
    if (account.project_id) {
      return `https://${account.project_id}-default-rtdb.firebaseio.com`
    }
  }

  return ''
}

const serviceAccountPath = resolveServiceAccountPath()
const databaseURL = resolveDatabaseURL(serviceAccountPath)

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5173'
  return raw.split(',').map((o) => o.trim()).filter(Boolean)
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'matuanalytics-dev-secret-change-in-production',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  /** URL pública del tracker (HTTPS). Sitios de clientes cargan tracker.js desde aquí. */
  trackerUrl: process.env.TRACKER_URL || process.env.API_URL || 'http://localhost:3001',
  corsOrigins: parseCorsOrigins(),
  trustProxy: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production',
  firebase: {
    databaseURL,
    serviceAccountPath,
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
    web: {
      apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyCDuYETmGyrLNZVNcPMiuK1pXCsEQPHRE4',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'matuanalytics-37f2f.firebaseapp.com',
      projectId: process.env.FIREBASE_PROJECT_ID || 'matuanalytics-37f2f',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'matuanalytics-37f2f.firebasestorage.app',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '316220274720',
      appId: process.env.FIREBASE_APP_ID || '1:316220274720:web:2c481eeb1349dd86d2e445',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-S4ZTD3231Y',
    },
  },
  dataDir: process.env.DATA_DIR || './data',
}
