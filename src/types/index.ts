export interface User {
  id: string
  email: string
  name: string
}

export interface Project {
  id: string
  name: string
  url: string
  trackingId: string
  createdAt: number
  trackingCode?: string
}

export interface ActiveVisitor {
  visitorId: string
  sessionId: string
  socketId: string
  pageUrl: string
  pageTitle: string
  browser: string
  os: string
  device: string
  country?: string
  countryCode?: string
  city?: string
  lat?: number
  lng?: number
  durationSeconds?: number
  connectedAt: number
  lastHeartbeat: number
}

export interface DashboardData {
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
  liveMapPoints: {
    lat: number
    lng: number
    city: string
    country: string
    pageTitle: string
    browser: string
  }[]
  range?: 'today' | '7d' | '30d'
}

export interface ActiveUsersUpdate {
  projectId: string
  activeUsers: number
  lastEvent: string
  visitors?: ActiveVisitor[]
}
