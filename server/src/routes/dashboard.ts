import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getDatabase } from '../firebase.js'
import { activeUsersManager } from '../socket/index.js'
import {
  buildDashboardAnalytics,
  persistDailySnapshot,
  parseDateRange,
  type PageviewRecord,
  type VisitorRecord,
  type SessionRecord,
} from '../services/analytics.js'
import type { ProjectRecord } from './projects.js'

const router = Router()

router.use(authMiddleware)

async function loadProjectData(projectId: string, userId: string) {
  const db = await getDatabase()

  const projectSnap = await db.ref(`projects/${projectId}`).once('value')
  if (!projectSnap.exists()) return null

  const project = projectSnap.val() as unknown as ProjectRecord
  if (project.userId !== userId) return { forbidden: true as const }

  const [pageviewsSnap, visitorsSnap, sessionsSnap] = await Promise.all([
    db.ref(`pageviews/${projectId}`).once('value'),
    db.ref(`visitors/${projectId}`).once('value'),
    db.ref(`sessions/${projectId}`).once('value'),
  ])

  const pageviews = Object.values(
    ((pageviewsSnap.val() || {}) as unknown as Record<string, PageviewRecord>),
  )
  const visitors = Object.entries(
    ((visitorsSnap.val() || {}) as unknown as Record<string, VisitorRecord>),
  ).map(([visitorId, v]) => ({ ...v, visitorId }))
  const sessions = Object.values(
    ((sessionsSnap.val() || {}) as unknown as Record<string, SessionRecord>),
  )

  return { project, pageviews, visitors, sessions }
}

router.get('/:projectId/live', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const db = await getDatabase()
    const projectSnap = await db.ref(`projects/${projectId}`).once('value')
    if (!projectSnap.exists()) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    const project = projectSnap.val() as unknown as ProjectRecord
    if (project.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const visitors = activeUsersManager.getVisitors(projectId as string)
    res.json({
      projectId,
      activeUsers: activeUsersManager.getCount(projectId as string),
      lastEvent: 'heartbeat' as const,
      visitors,
    })
  } catch (error) {
    console.error('Live dashboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const data = await loadProjectData(projectId as string, req.user!.userId)

    if (!data) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    if ('forbidden' in data) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const range = parseDateRange(req.query.range)
    const activeVisitors = activeUsersManager.getVisitors(projectId as string)
    const analytics = buildDashboardAnalytics(
      projectId as string,
      { name: data.project.name, trackingId: data.project.trackingId },
      data.pageviews,
      data.visitors,
      data.sessions,
      activeVisitors,
      activeUsersManager.getCount(projectId as string),
      range,
    )

    const db = await getDatabase()
    await persistDailySnapshot(db, projectId as string, analytics)

    res.json(analytics)
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
