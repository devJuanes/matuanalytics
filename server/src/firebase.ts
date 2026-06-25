import fs from 'fs'
import path from 'path'
import { config } from './config.js'

type DbValue = string | number | boolean | null | DbRecord | DbValue[]
interface DbRecord {
  [key: string]: DbValue
}

class LocalDatabase {
  private filePath: string
  private data: DbRecord = {}

  constructor() {
    const dir = path.resolve(config.dataDir)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    this.filePath = path.join(dir, 'database.json')
    if (fs.existsSync(this.filePath)) {
      this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
    }
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
  }

  private getRef(parts: string[]): DbRecord {
    let current = this.data
    for (const part of parts) {
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null || Array.isArray(current[part])) {
        current[part] = {}
      }
      current = current[part] as DbRecord
    }
    return current
  }

  ref(pathStr: string) {
    const parts = pathStr.split('/').filter(Boolean)
    return {
      set: async (value: DbValue) => {
        if (parts.length === 0) {
          this.data = value as DbRecord
        } else {
          let current = this.data
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (!(part in current) || typeof current[part] !== 'object' || current[part] === null || Array.isArray(current[part])) {
              current[part] = {}
            }
            current = current[part] as DbRecord
          }
          current[parts[parts.length - 1]] = value
        }
        this.save()
      },
      update: async (value: DbRecord) => {
        const target = this.getRef(parts)
        Object.assign(target, value)
        this.save()
      },
      push: async (value: DbRecord) => {
        const target = this.getRef(parts)
        const key = `_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        target[key] = value
        this.save()
        return { key }
      },
      once: async (event: string) => {
        if (event !== 'value') return { val: () => null, exists: () => false }
        let current: DbValue = this.data
        for (const part of parts) {
          if (typeof current !== 'object' || current === null || Array.isArray(current)) {
            return { val: () => null, exists: () => false }
          }
          current = (current as DbRecord)[part]
          if (current === undefined) {
            return { val: () => null, exists: () => false }
          }
        }
        return {
          val: () => current,
          exists: () => current !== undefined && current !== null,
        }
      },
      orderByChild: (_child: string) => ({
        equalTo: (_value: string) => ({
          once: async (event: string) => {
            if (event !== 'value') return { val: () => null, exists: () => false }
            const parent = this.getRef(parts)
            for (const [, val] of Object.entries(parent)) {
              if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                const record = val as DbRecord
                if (record[_child] === _value) {
                  return { val: () => val, exists: () => true }
                }
              }
            }
            return { val: () => null, exists: () => false }
          },
        }),
      }),
      child: (child: string) => this.ref([...parts, child].join('/')),
    }
  }
}

let db: LocalDatabase | FirebaseLikeDb | null = null
let adminReady = false

export interface FirebaseLikeDb {
  ref(path: string): ReturnType<LocalDatabase['ref']>
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}

function loadServiceAccount() {
  const { firebase } = config
  if (firebase.serviceAccountJson) {
    return JSON.parse(firebase.serviceAccountJson)
  }
  if (!firebase.serviceAccountPath) return null
  const resolvedPath = path.isAbsolute(firebase.serviceAccountPath)
    ? firebase.serviceAccountPath
    : path.resolve(process.cwd(), firebase.serviceAccountPath)
  if (!fs.existsSync(resolvedPath)) return null
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'))
}

export async function initFirebaseAdmin(): Promise<boolean> {
  if (adminReady) return true

  const serviceAccount = loadServiceAccount()
  if (!serviceAccount) {
    console.warn('Firebase Admin: serviceAccountKey.json no encontrado')
    return false
  }

  const admin = await import('firebase-admin')
  if (!admin.default.apps.length) {
    const appConfig: { credential: ReturnType<typeof admin.default.credential.cert>; databaseURL?: string } = {
      credential: admin.default.credential.cert(serviceAccount),
    }
    if (config.firebase.databaseURL) {
      appConfig.databaseURL = config.firebase.databaseURL
    }
    admin.default.initializeApp(appConfig)
  }

  adminReady = true
  console.log('Firebase Admin initialized (Auth + RTDB)')
  return true
}

export async function getFirebaseAuth() {
  const ready = await initFirebaseAdmin()
  if (!ready) throw new Error('Firebase Admin no configurado')
  const admin = await import('firebase-admin')
  return admin.default.auth()
}

async function connectFirebaseRtdb(): Promise<FirebaseLikeDb | null> {
  const ready = await initFirebaseAdmin()
  if (!ready || !config.firebase.databaseURL) return null

  const admin = await import('firebase-admin')
  const rtdb = admin.default.database()
  await withTimeout(
    rtdb.ref('_matuanalytics_ping').set({ ts: Date.now() }),
    8000,
    'Firebase RTDB connection timeout',
  )
  await rtdb.ref('_matuanalytics_ping').remove()

  console.log(`Connected to Firebase Realtime Database: ${config.firebase.databaseURL}`)
  return rtdb as unknown as FirebaseLikeDb
}

export async function getDatabase(): Promise<FirebaseLikeDb> {
  if (db) return db

  try {
    const firebaseDb = await connectFirebaseRtdb()
    if (firebaseDb) {
      db = firebaseDb
      return db
    }
  } catch (error) {
    console.error('Firebase RTDB connection failed:', (error as Error).message)
    console.warn('Using local JSON database for analytics data.')
  }

  db = new LocalDatabase()
  console.log('Using local JSON database at', path.resolve(config.dataDir, 'database.json'))
  return db
}
