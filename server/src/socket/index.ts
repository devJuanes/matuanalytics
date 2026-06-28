import type { Server, Socket } from 'socket.io'

let ioServer: Server | null = null

export function attachSocketServer(io: Server) {
  ioServer = io
}

export function notifyActiveUsersChange(
  projectId: string,
  lastEvent: ActiveUsersPayload['lastEvent'],
) {
  if (ioServer) {
    broadcastActiveUsers(ioServer, projectId, lastEvent)
  }
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

export interface ActiveUsersPayload {
  projectId: string
  activeUsers: number
  lastEvent: 'visitor_connected' | 'visitor_disconnected' | 'heartbeat' | 'page_view'
  visitors?: ActiveVisitor[]
}

const STALE_MS = 45_000

class ActiveUsersManager {
  /** projectId → sessionId → visitor */
  private projects = new Map<string, Map<string, ActiveVisitor>>()

  private purgeStale(projectId: string) {
    const project = this.projects.get(projectId)
    if (!project) return
    const now = Date.now()
    for (const [sessionId, visitor] of project) {
      if (now - visitor.lastHeartbeat > STALE_MS) {
        project.delete(sessionId)
      }
    }
    if (project.size === 0) this.projects.delete(projectId)
  }

  addVisitor(projectId: string, visitor: ActiveVisitor) {
    this.purgeStale(projectId)
    if (!this.projects.has(projectId)) {
      this.projects.set(projectId, new Map())
    }
    const project = this.projects.get(projectId)!
    project.set(visitor.sessionId, visitor)
  }

  removeVisitor(projectId: string, sessionId: string): ActiveVisitor | null {
    const project = this.projects.get(projectId)
    if (!project) return null
    const visitor = project.get(sessionId) || null
    project.delete(sessionId)
    if (project.size === 0) {
      this.projects.delete(projectId)
    }
    return visitor
  }

  updateHeartbeat(projectId: string, sessionId: string, data: Partial<ActiveVisitor>) {
    this.purgeStale(projectId)
    const project = this.projects.get(projectId)
    if (!project) return null
    const visitor = project.get(sessionId)
    if (!visitor) return null
    Object.assign(visitor, data, { lastHeartbeat: Date.now() })
    if (visitor.connectedAt) {
      visitor.durationSeconds = Math.floor((Date.now() - visitor.connectedAt) / 1000)
    }
    return visitor
  }

  getCount(projectId: string): number {
    this.purgeStale(projectId)
    return this.projects.get(projectId)?.size || 0
  }

  getVisitors(projectId: string): ActiveVisitor[] {
    this.purgeStale(projectId)
    return Array.from(this.projects.get(projectId)?.values() || [])
  }

  getVisitor(projectId: string, sessionId: string): ActiveVisitor | undefined {
    this.purgeStale(projectId)
    return this.projects.get(projectId)?.get(sessionId)
  }

  upsertFromRest(
    projectId: string,
    data: Omit<ActiveVisitor, 'socketId' | 'connectedAt' | 'lastHeartbeat'> & {
      sessionStartedAt?: number
    },
  ) {
    this.purgeStale(projectId)
    const existing = this.getVisitor(projectId, data.sessionId)
    const sessionStart = data.sessionStartedAt ?? existing?.connectedAt ?? Date.now()
    const visitor: ActiveVisitor = {
      visitorId: data.visitorId,
      sessionId: data.sessionId,
      socketId: existing && !existing.socketId.startsWith('rest:') ? existing.socketId : `rest:${data.sessionId}`,
      pageUrl: data.pageUrl,
      pageTitle: data.pageTitle,
      browser: data.browser,
      os: data.os,
      device: data.device,
      country: data.country,
      countryCode: data.countryCode,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      durationSeconds: Math.floor((Date.now() - sessionStart) / 1000),
      connectedAt: sessionStart,
      lastHeartbeat: Date.now(),
    }
    this.addVisitor(projectId, visitor)
    return visitor
  }

  getPayload(
    projectId: string,
    lastEvent: ActiveUsersPayload['lastEvent'],
    includeVisitors = false,
  ): ActiveUsersPayload {
    return {
      projectId,
      activeUsers: this.getCount(projectId),
      lastEvent,
      ...(includeVisitors ? { visitors: this.getVisitors(projectId) } : {}),
    }
  }

  purgeAllStale(): string[] {
    const changed: string[] = []
    for (const projectId of [...this.projects.keys()]) {
      const before = this.getCount(projectId)
      this.purgeStale(projectId)
      const after = this.getCount(projectId)
      if (before !== after) changed.push(projectId)
    }
    return changed
  }
}

export const activeUsersManager = new ActiveUsersManager()

export function broadcastActiveUsers(
  io: Server,
  projectId: string,
  lastEvent: ActiveUsersPayload['lastEvent'],
  includeVisitorsForDashboard = true,
) {
  const payload = activeUsersManager.getPayload(projectId, lastEvent, false)
  const dashboardPayload = activeUsersManager.getPayload(projectId, lastEvent, includeVisitorsForDashboard)

  io.to(`dashboard:${projectId}`).emit('active_users_update', dashboardPayload)
  io.to(`esp32:${projectId}`).emit('active_users_update', payload)
}

export function registerSocketHandlers(io: Server) {
  setInterval(() => {
    for (const projectId of activeUsersManager.purgeAllStale()) {
      broadcastActiveUsers(io, projectId, 'heartbeat')
    }
  }, 15_000)

  io.on('connection', (socket: Socket) => {
    socket.on('join_dashboard', (projectId: string) => {
      socket.join(`dashboard:${projectId}`)
      socket.data.role = 'dashboard'
      socket.data.dashboardProjectId = projectId
      const payload = activeUsersManager.getPayload(projectId, 'heartbeat', true)
      socket.emit('active_users_update', payload)
    })

    socket.on('join_esp32', (projectId: string) => {
      socket.join(`esp32:${projectId}`)
      const payload = activeUsersManager.getPayload(projectId, 'heartbeat')
      socket.emit('active_users_update', payload)
    })

    socket.on('visitor_register', (data: {
      projectId: string
      visitorId: string
      sessionId: string
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
      sessionStartedAt?: number
    }) => {
      const sessionStart = data.sessionStartedAt || Date.now()
      const visitor: ActiveVisitor = {
        ...data,
        socketId: socket.id,
        connectedAt: sessionStart,
        lastHeartbeat: Date.now(),
        durationSeconds: Math.floor((Date.now() - sessionStart) / 1000),
      }
      activeUsersManager.addVisitor(data.projectId, visitor)
      socket.data.projectId = data.projectId
      socket.data.sessionId = data.sessionId
      socket.data.role = 'visitor'

      socket.join(`project:${data.projectId}`)
      io.to(`project:${data.projectId}`).emit('visitor_connected', visitor)
      broadcastActiveUsers(io, data.projectId, 'visitor_connected')
    })

    socket.on('heartbeat', (data: {
      projectId: string
      sessionId?: string
      pageUrl?: string
      pageTitle?: string
      durationSeconds?: number
    }) => {
      const sessionId = data.sessionId || (socket.data.sessionId as string)
      if (!sessionId) return

      activeUsersManager.updateHeartbeat(data.projectId, sessionId, {
        pageUrl: data.pageUrl,
        pageTitle: data.pageTitle,
        durationSeconds: data.durationSeconds,
        socketId: socket.id,
      })
      broadcastActiveUsers(io, data.projectId, 'heartbeat')
    })

    socket.on('page_view', (data: {
      projectId: string
      sessionId?: string
      pageUrl: string
      pageTitle: string
    }) => {
      const sessionId = data.sessionId || (socket.data.sessionId as string)
      if (!sessionId) return

      activeUsersManager.updateHeartbeat(data.projectId, sessionId, {
        pageUrl: data.pageUrl,
        pageTitle: data.pageTitle,
      })
      io.to(`dashboard:${data.projectId}`).emit('page_view', {
        ...data,
        sessionId,
        timestamp: Date.now(),
        socketId: socket.id,
      })
      broadcastActiveUsers(io, data.projectId, 'page_view')
    })

    socket.on('disconnect', () => {
      const projectId = socket.data.projectId as string | undefined
      const sessionId = socket.data.sessionId as string | undefined
      if (!projectId || !sessionId || socket.data.role !== 'visitor') return

      const current = activeUsersManager.getVisitor(projectId, sessionId)
      if (!current || current.socketId !== socket.id) return

      const visitor = activeUsersManager.removeVisitor(projectId, sessionId)
      if (visitor) {
        io.to(`project:${projectId}`).emit('visitor_disconnected', visitor)
        broadcastActiveUsers(io, projectId, 'visitor_disconnected')
      }
    })
  })
}
