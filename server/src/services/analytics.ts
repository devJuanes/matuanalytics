import type { ActiveVisitor } from '../socket/index.js'
import type { FirebaseLikeDb } from '../firebase.js'

export interface PageviewRecord {
  visitorId: string
  sessionId: string
  url: string
  title: string
  browser: string
  os: string
  device: string
  screenResolution?: string
  language?: string
  referer?: string
  timestamp: number
  country?: string
  countryCode?: string
  city?: string
  region?: string
  lat?: number
  lng?: number
}

export interface VisitorRecord {
  browser: string
  os: string
  device: string
  firstSeen: number
  lastSeen: number
  country?: string
  countryCode?: string
  city?: string
  region?: string
  lat?: number
  lng?: number
  totalDurationSeconds?: number
  visitorId?: string
}

export interface SessionRecord {
  visitorId: string
  startedAt: number
  lastHeartbeat: number
  pageUrl: string
  pageTitle: string
  browser: string
  os: string
  device: string
  country?: string
  countryCode?: string
  city?: string
  region?: string
  lat?: number
  lng?: number
  durationSeconds?: number
}

export interface DashboardAnalytics {
  project: { id: string; name: string; trackingId: string }
  stats: {
    activeUsers: number
    visitsToday: number
    visitsYesterday: number
    visitsThisWeek: number
    visitsThisMonth: number
    totalPageviews: number
    uniqueVisitors: number
    avgSessionDuration: number
    bounceRate: number
    newVisitors: number
    returningVisitors: number
    trends: {
      visitsToday: number
      visitors: number
      duration: number
    }
  }
  recentVisitors: {
    browser: string
    os: string
    device: string
    country: string
    city: string
    lastSeen: number
    durationSeconds: number
  }[]
  topPages: { url: string; title: string; count: number; avgDuration: number }[]
  browsers: { name: string; count: number }[]
  operatingSystems: { name: string; count: number }[]
  countries: { name: string; code: string; count: number; lat: number; lng: number }[]
  cities: { name: string; country: string; count: number; lat: number; lng: number }[]
  visitsByHour: { hour: number; count: number }[]
  visitsByDay: { date: string; count: number; visitors: number }[]
  durationBuckets: { label: string; count: number }[]
  referrers: { name: string; count: number }[]
  activeVisitors: ActiveVisitor[]
  liveMapPoints: { lat: number; lng: number; city: string; country: string; pageTitle: string; browser: string }[]
  range: DateRange
}

function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfMonth(date = new Date()) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export type DateRange = 'today' | '7d' | '30d'

function parseDateRange(value: unknown): DateRange {
  if (value === 'today' || value === '7d' || value === '30d') return value
  return '7d'
}

function getRangeBounds(range: DateRange) {
  const now = Date.now()
  const todayStart = startOfDay()
  const dayMs = 86400000

  if (range === 'today') {
    return {
      start: todayStart,
      end: now,
      prevStart: todayStart - dayMs,
      prevEnd: todayStart,
      days: 1,
    }
  }

  if (range === '7d') {
    const start = todayStart - 6 * dayMs
    return {
      start,
      end: now,
      prevStart: start - 7 * dayMs,
      prevEnd: start,
      days: 7,
    }
  }

  const start = todayStart - 29 * dayMs
  return {
    start,
    end: now,
    prevStart: start - 30 * dayMs,
    prevEnd: start,
    days: 30,
  }
}

export { parseDateRange }

function aggregateCount(items: { name: string; count: number }[], value: string) {
  const name = value || 'Desconocido'
  const existing = items.find((i) => i.name === name)
  if (existing) existing.count++
  else items.push({ name, count: 1 })
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export function buildDashboardAnalytics(
  projectId: string,
  project: { name: string; trackingId: string },
  pageviews: PageviewRecord[],
  visitors: VisitorRecord[],
  sessions: SessionRecord[],
  activeVisitors: ActiveVisitor[],
  activeUserCount: number,
  range: DateRange = '7d',
): DashboardAnalytics {
  const now = Date.now()
  const todayStart = startOfDay()
  const yesterdayStart = startOfDay(new Date(now - 86400000))
  const weekStart = startOfWeek()
  const monthStart = startOfMonth()
  const bounds = getRangeBounds(range)

  const inRange = (ts: number) => ts >= bounds.start && ts <= bounds.end
  const inPrevRange = (ts: number) => ts >= bounds.prevStart && ts < bounds.prevEnd

  const rangePageviews = pageviews.filter((p) => inRange(p.timestamp))
  const prevPageviews = pageviews.filter((p) => inPrevRange(p.timestamp))
  const rangeSessions = sessions.filter((s) => inRange(s.startedAt))
  const prevSessions = sessions.filter((s) => inPrevRange(s.startedAt))

  const visitsToday = pageviews.filter((p) => p.timestamp >= todayStart).length
  const visitsYesterday = pageviews.filter(
    (p) => p.timestamp >= yesterdayStart && p.timestamp < todayStart,
  ).length
  const visitsThisWeek = pageviews.filter((p) => p.timestamp >= weekStart).length
  const visitsThisMonth = pageviews.filter((p) => p.timestamp >= monthStart).length

  const periodPageviews = rangePageviews.length
  const prevPeriodPageviews = prevPageviews.length

  const visitorsInPeriod = new Set(rangePageviews.map((p) => p.visitorId))
  const visitorsInPrevPeriod = new Set(prevPageviews.map((p) => p.visitorId))

  const visitorFirstSeen = new Map<string, number>()
  for (const pv of pageviews) {
    const prev = visitorFirstSeen.get(pv.visitorId)
    if (prev === undefined || pv.timestamp < prev) visitorFirstSeen.set(pv.visitorId, pv.timestamp)
  }

  let newVisitors = 0
  let returningVisitors = 0
  for (const vid of visitorsInPeriod) {
    const first = visitorFirstSeen.get(vid) ?? bounds.start
    if (first >= bounds.start) newVisitors++
    else returningVisitors++
  }

  const pagesMap = new Map<string, { url: string; title: string; count: number; durations: number[] }>()
  const browsers: { name: string; count: number }[] = []
  const operatingSystems: { name: string; count: number }[] = []
  const countriesMap = new Map<string, { name: string; code: string; count: number; lat: number; lng: number }>()
  const citiesMap = new Map<string, { name: string; country: string; count: number; lat: number; lng: number }>()
  const referrers: { name: string; count: number }[] = []
  const visitsByHour = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
  const visitsByDay: { date: string; count: number; visitors: number }[] = []
  const durationBuckets = [
    { label: '0-30s', count: 0 },
    { label: '30s-2m', count: 0 },
    { label: '2-5m', count: 0 },
    { label: '5-10m', count: 0 },
    { label: '10m+', count: 0 },
  ]

  const dayDates = Array.from({ length: bounds.days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (bounds.days - 1 - i))
    d.setHours(0, 0, 0, 0)
    return d.toISOString().slice(0, 10)
  })

  for (const date of dayDates) {
    visitsByDay.push({ date, count: 0, visitors: 0 })
  }

  const dayVisitors = new Map<string, Set<string>>()

  for (const pv of rangePageviews) {
    const pageKey = pv.url || '/'
    const page = pagesMap.get(pageKey) || { url: pv.url, title: pv.title, count: 0, durations: [] }
    page.count++
    pagesMap.set(pageKey, page)

    aggregateCount(browsers, pv.browser)
    aggregateCount(operatingSystems, pv.os)

    if (pv.country) {
      const cKey = pv.countryCode || pv.country
      const c = countriesMap.get(cKey) || {
        name: pv.country,
        code: pv.countryCode || 'XX',
        count: 0,
        lat: pv.lat || 0,
        lng: pv.lng || 0,
      }
      c.count++
      countriesMap.set(cKey, c)
    }

    if (pv.city) {
      const cityKey = `${pv.city}-${pv.country}`
      const c = citiesMap.get(cityKey) || {
        name: pv.city,
        country: pv.country || '',
        count: 0,
        lat: pv.lat || 0,
        lng: pv.lng || 0,
      }
      c.count++
      citiesMap.set(cityKey, c)
    }

    if (pv.referer) {
      try {
        const host = new URL(pv.referer).hostname || 'Directo'
        aggregateCount(referrers, host)
      } catch {
        aggregateCount(referrers, 'Directo')
      }
    } else {
      aggregateCount(referrers, 'Directo')
    }

    visitsByHour[new Date(pv.timestamp).getHours()].count++

    const dateStr = new Date(pv.timestamp).toISOString().slice(0, 10)
    const dayEntry = visitsByDay.find((d) => d.date === dateStr)
    if (dayEntry) {
      dayEntry.count++
      if (!dayVisitors.has(dateStr)) dayVisitors.set(dateStr, new Set())
      dayVisitors.get(dateStr)!.add(pv.visitorId)
    }
  }

  for (const day of visitsByDay) {
    day.visitors = dayVisitors.get(day.date)?.size || 0
  }

  const sessionDurations = rangeSessions
    .map((s) => s.durationSeconds ?? Math.floor((s.lastHeartbeat - s.startedAt) / 1000))
    .filter((d) => d > 0)

  for (const d of sessionDurations) {
    if (d <= 30) durationBuckets[0].count++
    else if (d <= 120) durationBuckets[1].count++
    else if (d <= 300) durationBuckets[2].count++
    else if (d <= 600) durationBuckets[3].count++
    else durationBuckets[4].count++
  }

  const avgSessionDuration = sessionDurations.length
    ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
    : 0

  const prevSessionDurations = prevSessions
    .map((s) => s.durationSeconds ?? Math.floor((s.lastHeartbeat - s.startedAt) / 1000))
    .filter((d) => d > 0)
  const avgDurPrevPeriod = prevSessionDurations.length
    ? prevSessionDurations.reduce((a, b) => a + b, 0) / prevSessionDurations.length
    : 0

  const singlePageSessions = new Set<string>()
  const sessionPageCounts = new Map<string, number>()
  for (const pv of rangePageviews) {
    sessionPageCounts.set(pv.sessionId, (sessionPageCounts.get(pv.sessionId) || 0) + 1)
  }
  for (const [sid, count] of sessionPageCounts) {
    if (count === 1) singlePageSessions.add(sid)
  }
  const bounceRate = rangeSessions.length
    ? Math.round((singlePageSessions.size / rangeSessions.length) * 100)
    : 0

  const recentVisitors = [...visitors]
    .filter((v) => v.lastSeen >= bounds.start)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 15)
    .map((v) => ({
      browser: v.browser,
      os: v.os,
      device: v.device,
      country: v.country || 'Desconocido',
      city: v.city || '',
      lastSeen: v.lastSeen,
      durationSeconds: v.totalDurationSeconds || 0,
    }))

  const topPages = Array.from(pagesMap.values())
    .map((p) => ({
      url: p.url,
      title: p.title,
      count: p.count,
      avgDuration: 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const liveMapPoints = activeVisitors
    .filter((v) => v.lat && v.lng)
    .map((v) => ({
      lat: v.lat!,
      lng: v.lng!,
      city: v.city || '',
      country: v.country || '',
      pageTitle: v.pageTitle,
      browser: v.browser,
    }))

  return {
    project: { id: projectId, name: project.name, trackingId: project.trackingId },
    stats: {
      activeUsers: activeUserCount,
      visitsToday,
      visitsYesterday,
      visitsThisWeek,
      visitsThisMonth,
      totalPageviews: periodPageviews,
      uniqueVisitors: visitorsInPeriod.size,
      avgSessionDuration,
      bounceRate,
      newVisitors,
      returningVisitors,
      trends: {
        visitsToday: pctChange(periodPageviews, prevPeriodPageviews),
        visitors: pctChange(visitorsInPeriod.size, visitorsInPrevPeriod.size),
        duration: pctChange(avgSessionDuration, Math.round(avgDurPrevPeriod)),
      },
    },
    recentVisitors,
    topPages,
    browsers: browsers.sort((a, b) => b.count - a.count).slice(0, 10),
    operatingSystems: operatingSystems.sort((a, b) => b.count - a.count).slice(0, 10),
    countries: Array.from(countriesMap.values()).sort((a, b) => b.count - a.count).slice(0, 15),
    cities: Array.from(citiesMap.values()).sort((a, b) => b.count - a.count).slice(0, 15),
    visitsByHour,
    visitsByDay,
    durationBuckets,
    referrers: referrers.sort((a, b) => b.count - a.count).slice(0, 10),
    activeVisitors,
    liveMapPoints,
    range,
  }
}

export async function persistDailySnapshot(
  db: FirebaseLikeDb,
  projectId: string,
  analytics: DashboardAnalytics,
) {
  const date = new Date().toISOString().slice(0, 10)
  await db.ref(`analytics/${projectId}/daily/${date}`).update({
    pageviews: analytics.stats.visitsToday,
    visitors: analytics.stats.uniqueVisitors,
    avgDuration: analytics.stats.avgSessionDuration,
    bounceRate: analytics.stats.bounceRate,
    updatedAt: Date.now(),
  } as Record<string, string | number | boolean | null>)
}
