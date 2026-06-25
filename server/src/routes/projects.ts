import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authMiddleware } from '../middleware/auth.js'
import { getDatabase } from '../firebase.js'
import { config } from '../config.js'

const router = Router()

router.use(authMiddleware)

router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase()
    const snap = await db.ref('projects').once('value')
    const projects = snap.val() as Record<string, ProjectRecord> | null

    const list = Object.entries(projects || {})
      .filter(([, p]) => p.userId === req.user!.userId)
      .map(([id, p]) => ({
        id,
        name: p.name,
        url: p.url,
        trackingId: p.trackingId,
        createdAt: p.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)

    res.json(list)
  } catch (error) {
    console.error('List projects error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, url } = req.body
    if (!name?.trim()) {
      res.status(400).json({ error: 'Project name is required' })
      return
    }

    const projectId = uuidv4()
    const trackingId = `MA-${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`
    const now = Date.now()

    const project: ProjectRecord = {
      name: name.trim(),
      url: url?.trim() || '',
      trackingId,
      userId: req.user!.userId,
      createdAt: now,
    }

    const db = await getDatabase()
    await db.ref(`projects/${projectId}`).set(project as unknown as Record<string, string | number>)
    await db.ref(`realtime/${projectId}`).set({ activeUsers: 0 })

    res.status(201).json({
      id: projectId,
      ...project,
      trackingCode: generateTrackingCode(trackingId),
    })
  } catch (error) {
    console.error('Create project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase()
    const snap = await db.ref(`projects/${req.params.id}`).once('value')

    if (!snap.exists()) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const project = snap.val() as unknown as ProjectRecord
    if (project.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    res.json({
      id: req.params.id,
      ...project,
      trackingCode: generateTrackingCode(project.trackingId),
    })
  } catch (error) {
    console.error('Get project error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export function generateTrackingCode(trackingId: string): string {
  const apiUrl = config.apiUrl
  return `<script src="${apiUrl}/tracker.js" data-site-id="${trackingId}"></script>`
}

export interface ProjectRecord {
  name: string
  url: string
  trackingId: string
  userId: string
  createdAt: number
}

export default router
