import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../serviceAccountKey.json'), 'utf-8'),
)

const urls = [
  `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
  `https://${serviceAccount.project_id}.firebaseio.com`,
  `https://${serviceAccount.project_id}-default-rtdb.europe-west1.firebasedatabase.app`,
  `https://${serviceAccount.project_id}-default-rtdb.us-central1.firebasedatabase.app`,
]

async function testUrl(databaseURL: string) {
  const app = admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    },
    databaseURL,
  )

  try {
    const db = admin.database(app)
    await db.ref('.info/connected').once('value')
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000),
    )
    await Promise.race([
      db.ref('_connection_test').set({ ts: Date.now() }),
      timeout,
    ])
    console.log('OK:', databaseURL)
    await db.ref('_connection_test').remove()
    return true
  } catch (err) {
    console.log('FAIL:', databaseURL, '-', (err as Error).message)
    return false
  } finally {
    await app.delete()
  }
}

for (const url of urls) {
  await testUrl(url)
}
