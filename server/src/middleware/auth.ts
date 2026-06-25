import { Request, Response, NextFunction } from 'express'
import { getFirebaseAuth } from '../firebase.js'

export interface AuthPayload {
  userId: string
  email: string
  name: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }

  try {
    const token = header.slice(7)
    const auth = await getFirebaseAuth()
    const decoded = await auth.verifyIdToken(token)

    req.user = {
      userId: decoded.uid,
      email: decoded.email || '',
      name: (decoded.name as string) || '',
    }
    next()
  } catch (error) {
    console.error('Auth token verification failed:', (error as Error).message)
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
