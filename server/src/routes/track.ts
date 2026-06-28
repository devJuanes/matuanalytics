import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../firebase.js'
import { resolveGeo } from '../services/geoip.js'
import { getClientIp } from '../utils/ip.js'
import { activeUsersManager, notifyActiveUsersChange } from '../socket/index.js'
import type { ProjectRecord } from './projects.js'

const router = Router()
const PAGEVIEW_DEDUPE_MS = 30_000

router.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

router.options('/track', (_req, res) => res.sendStatus(204))
router.options('/heartbeat', (_req, res) => res.sendStatus(204))

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
      skipPageview,
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
      lastIp: ip,
      ...geoFields,
      ...(isNewVisitor ? { firstSeen: now, totalDurationSeconds: 0 } : {}),
    }

    if (isNewVisitor) {
      await db.ref(`visitors/${projectId}/${visitorId}`).set(visitorData)
    } else {
      await db.ref(`visitors/${projectId}/${visitorId}`).update(visitorData)
    }

    const sessionSnap = await db.ref(`sessions/${projectId}/${sessionId}`).once('value')
    const sessionData = sessionSnap.val() as {
      startedAt?: number
      lastPageviewUrl?: string
      lastPageviewAt?: number
    } | null
    const startedAt = sessionData?.startedAt || now

    let shouldSkipPageview = !!skipPageview
    if (!shouldSkipPageview && url && sessionData?.lastPageviewUrl === url && sessionData?.lastPageviewAt) {
      if (now - sessionData.lastPageviewAt < PAGEVIEW_DEDUPE_MS) {
        shouldSkipPageview = true
      }
    }

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

    activeUsersManager.upsertFromRest(projectId, {
      visitorId,
      sessionId,
      pageUrl: url || '',
      pageTitle: title || '',
      browser: browser || 'Unknown',
      os: os || 'Unknown',
      device: device || 'Unknown',
      country: geoFields.country,
      countryCode: geoFields.countryCode,
      city: geoFields.city,
      lat: geoFields.lat,
      lng: geoFields.lng,
      sessionStartedAt: startedAt,
    })
    notifyActiveUsersChange(projectId, 'visitor_connected')

    let pageviewId: string | null = null
    if (!shouldSkipPageview) {
      pageviewId = uuidv4()
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
      await db.ref(`sessions/${projectId}/${sessionId}`).update({
        lastPageviewUrl: url || '',
        lastPageviewAt: now,
      })
    }

    res.json({
      success: true,
      projectId,
      pageviewId,
      sessionStartedAt: startedAt,
      skippedPageview: shouldSkipPageview,
      geo: geoFields,
    })
  } catch (error) {
    console.error('Track error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const { siteId, sessionId, visitorId, url, title, duration, browser, os, device } = req.body

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
    const ip = getClientIp(req)
    const geo = await resolveGeo(ip)

    const sessionSnap = await db.ref(`sessions/${projectId}/${sessionId}`).once('value')
    const session = sessionSnap.val() as {
      startedAt?: number
      browser?: string
      os?: string
      device?: string
    } | null
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
        country: geo.country,
        countryCode: geo.countryCode,
        city: geo.city,
        region: geo.region,
        lat: geo.lat,
        lng: geo.lng,
        lastIp: ip,
      })
    }

    activeUsersManager.upsertFromRest(projectId, {
      visitorId: visitorId || 'unknown',
      sessionId,
      pageUrl: url || '',
      pageTitle: title || '',
      browser: browser || session?.browser || 'Unknown',
      os: os || session?.os || 'Unknown',
      device: device || session?.device || 'Unknown',
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      lat: geo.lat,
      lng: geo.lng,
      durationSeconds,
      sessionStartedAt: startedAt,
    })
    notifyActiveUsersChange(projectId, 'heartbeat')

    res.json({
      success: true,
      durationSeconds,
      activeUsers: activeUsersManager.getCount(projectId),
      geo: {
        country: geo.country,
        countryCode: geo.countryCode,
        city: geo.city,
        lat: geo.lat,
        lng: geo.lng,
      },
    })
  } catch (error) {
    console.error('Heartbeat error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
