import type { Server, Socket } from 'socket.io'

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

class ActiveUsersManager {
  private projects = new Map<string, Map<string, ActiveVisitor>>()

  addVisitor(projectId: string, visitor: ActiveVisitor) {
    if (!this.projects.has(projectId)) {
      this.projects.set(projectId, new Map())
    }
    this.projects.get(projectId)!.set(visitor.socketId, visitor)
  }

  removeVisitor(projectId: string, socketId: string): ActiveVisitor | null {
    const project = this.projects.get(projectId)
    if (!project) return null
    const visitor = project.get(socketId) || null
    project.delete(socketId)
    if (project.size === 0) {
      this.projects.delete(projectId)
    }
    return visitor
  }

  updateHeartbeat(projectId: string, socketId: string, data: Partial<ActiveVisitor>) {
    const project = this.projects.get(projectId)
    if (!project) return null
    const visitor = project.get(socketId)
    if (!visitor) return null
    Object.assign(visitor, data, { lastHeartbeat: Date.now() })
    if (visitor.connectedAt) {
      visitor.durationSeconds = Math.floor((Date.now() - visitor.connectedAt) / 1000)
    }
    return visitor
  }

  getCount(projectId: string): number {
    return this.projects.get(projectId)?.size || 0
  }

  getVisitors(projectId: string): ActiveVisitor[] {
    return Array.from(this.projects.get(projectId)?.values() || [])
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
  io.on('connection', (socket: Socket) => {
    socket.on('join_dashboard', (projectId: string) => {
      socket.join(`dashboard:${projectId}`)
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
    }) => {
      const visitor: ActiveVisitor = {
        ...data,
        socketId: socket.id,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        durationSeconds: 0,
      }
      activeUsersManager.addVisitor(data.projectId, visitor)
      socket.data.projectId = data.projectId
      socket.data.role = 'visitor'
      socket.join(`project:${data.projectId}`)

      io.to(`project:${data.projectId}`).emit('visitor_connected', visitor)
      broadcastActiveUsers(io, data.projectId, 'visitor_connected')
    })

    socket.on('heartbeat', (data: {
      projectId: string
      pageUrl?: string
      pageTitle?: string
      durationSeconds?: number
    }) => {
      activeUsersManager.updateHeartbeat(data.projectId, socket.id, {
        pageUrl: data.pageUrl,
        pageTitle: data.pageTitle,
        durationSeconds: data.durationSeconds,
      })
      broadcastActiveUsers(io, data.projectId, 'heartbeat')
    })

    socket.on('page_view', (data: { projectId: string; pageUrl: string; pageTitle: string }) => {
      activeUsersManager.updateHeartbeat(data.projectId, socket.id, {
        pageUrl: data.pageUrl,
        pageTitle: data.pageTitle,
      })
      io.to(`dashboard:${data.projectId}`).emit('page_view', {
        ...data,
        timestamp: Date.now(),
        socketId: socket.id,
      })
      broadcastActiveUsers(io, data.projectId, 'page_view')
    })

    socket.on('disconnect', () => {
      const projectId = socket.data.projectId as string | undefined
      if (!projectId || socket.data.role !== 'visitor') return

      const visitor = activeUsersManager.removeVisitor(projectId, socket.id)
      if (visitor) {
        io.to(`project:${projectId}`).emit('visitor_disconnected', visitor)
        broadcastActiveUsers(io, projectId, 'visitor_disconnected')
      }
    })
  })
}
