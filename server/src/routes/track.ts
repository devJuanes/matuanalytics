import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../firebase.js'
import { resolveGeo } from '../services/geoip.js'
import { getClientIp } from '../utils/ip.js'
import type { ProjectRecord } from './projects.js'

const router = Router()

async function findProjectByTrackingId(trackingId: string): Promise<{ id: string; project: ProjectRecord } | null> {
  const db = await getDatabase()
  const snap = await db.ref('projects').once('value')
  const projects = snap.val() as Record<string, ProjectRecord> | null
  if (!projects) return null

  const entry = Object.entries(projects).find(([, p]) => p.trackingId === trackingId)
  if (!entry) return null
  return { id: entry[0], project: entry[1] }
}

router.post('/track', async (req: Request, res: Response) => {
  try {
    const {
      siteId,
      visitorId,
      sessionId,
      url,
      title,
      browser,
      os,
      device,
      screenResolution,
      language,
      referer,
    } = req.body

    if (!siteId || !visitorId || !sessionId) {
      res.status(400).json({ error: 'siteId, visitorId and sessionId are required' })
      return
    }

    const found = await findProjectByTrackingId(siteId)
    if (!found) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const { id: projectId } = found
    const now = Date.now()
    const db = await getDatabase()
    const ip = getClientIp(req)
    const geo = await resolveGeo(ip)

    const geoFields = {
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      region: geo.region,
      lat: geo.lat,
      lng: geo.lng,
    }

    const visitorSnap = await db.ref(`visitors/${projectId}/${visitorId}`).once('value')
    const isNewVisitor = !visitorSnap.exists()

    const visitorData = {
      browser: browser || 'Unknown',
      os: os || 'Unknown',
      device: device || 'Unknown',
      language: language || '',
      lastSeen: now,
      ...geoFields,
      ...(isNewVisitor ? { firstSeen: now, totalDurationSeconds: 0 } : {}),
    }

    if (isNewVisitor) {
      await db.ref(`visitors/${projectId}/${visitorId}`).set(visitorData)
    } else {
      await db.ref(`visitors/${projectId}/${visitorId}`).update(visitorData)
    }

    const sessionSnap = await db.ref(`sessions/${projectId}/${sessionId}`).once('value')
    const sessionData = sessionSnap.val() as { startedAt?: number } | null
    const startedAt = sessionData?.startedAt || now

    await db.ref(`sessions/${projectId}/${sessionId}`).update({
      visitorId,
      startedAt,
      lastHeartbeat: now,
      durationSeconds: Math.floor((now - startedAt) / 1000),
      pageUrl: url || '',
      pageTitle: title || '',
      browser: browser || 'Unknown',
      os: os || 'Unknown',
      device: device || 'Unknown',
      ...geoFields,
    })

    const pageviewId = uuidv4()
    await db.ref(`pageviews/${projectId}/${pageviewId}`).set({
      visitorId,
      sessionId,
      url: url || '',
      title: title || '',
      browser: browser || 'Unknown',
      os: os || 'Unknown',
      device: device || 'Unknown',
      screenResolution: screenResolution || '',
      language: language || '',
      referer: referer || '',
      timestamp: now,
      ...geoFields,
    })

    res.json({
      success: true,
      projectId,
      pageviewId,
      geo: geoFields,
    })
  } catch (error) {
    console.error('Track error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const { siteId, sessionId, visitorId, url, title, duration } = req.body

    if (!siteId || !sessionId) {
      res.status(400).json({ error: 'siteId and sessionId are required' })
      return
    }

    const found = await findProjectByTrackingId(siteId)
    if (!found) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const { id: projectId } = found
    const now = Date.now()
    const db = await getDatabase()

    const sessionSnap = await db.ref(`sessions/${projectId}/${sessionId}`).once('value')
    const session = sessionSnap.val() as { startedAt?: number } | null
    const startedAt = session?.startedAt || now
    const durationSeconds = duration ?? Math.floor((now - startedAt) / 1000)

    await db.ref(`sessions/${projectId}/${sessionId}`).update({
      lastHeartbeat: now,
      durationSeconds,
      ...(url ? { pageUrl: url } : {}),
      ...(title ? { pageTitle: title } : {}),
    })

    if (visitorId) {
      await db.ref(`visitors/${projectId}/${visitorId}`).update({
        lastSeen: now,
        totalDurationSeconds: durationSeconds,
      })
    }

    res.json({ success: true, durationSeconds })
  } catch (error) {
    console.error('Heartbeat error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
