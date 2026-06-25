import { Router, Request, Response } from 'express'
import { getFirebaseAuth, getDatabase } from '../firebase.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

async function resolveUserFromToken(token: string) {
  const auth = await getFirebaseAuth()
  const decoded = await auth.verifyIdToken(token)
  const firebaseUser = await auth.getUser(decoded.uid)

  const db = await getDatabase()
  const profileSnap = await db.ref(`users/${decoded.uid}`).once('value')
  const profile = profileSnap.exists()
    ? (profileSnap.val() as { name?: string })
    : null

  const name =
    profile?.name ||
    firebaseUser.displayName ||
    (decoded.name as string) ||
    firebaseUser.email?.split('@')[0] ||
    'Usuario'

  return {
    id: decoded.uid,
    email: firebaseUser.email || decoded.email || '',
    name,
  }
}

router.get('/me', async (req: Request, res: Response) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }

  try {
    const user = await resolveUserFromToken(header.slice(7))
    res.json(user)
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
})

router.post('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.body
    const userId = req.user!.userId

    if (name?.trim()) {
      const auth = await getFirebaseAuth()
      await auth.updateUser(userId, { displayName: name.trim() })

      const db = await getDatabase()
      const createdSnap = await db.ref(`users/${userId}/createdAt`).once('value')
      await db.ref(`users/${userId}`).update({
        email: req.user!.email,
        name: name.trim(),
        updatedAt: Date.now(),
        ...(createdSnap.exists() ? {} : { createdAt: Date.now() }),
      })
    }

    const user = await resolveUserFromToken(req.headers.authorization!.slice(7))
    res.json(user)
  } catch (error) {
    console.error('Profile sync error:', error)
    res.status(500).json({ error: 'Error al guardar perfil' })
  }
})

export default router
