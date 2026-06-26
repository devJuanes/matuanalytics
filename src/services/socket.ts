import { io, Socket } from 'socket.io-client'
import type { ActiveUsersUpdate } from '@/types'
import { API_BASE_URL } from '@/config/app'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL || undefined, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export function joinDashboard(projectId: string, onUpdate: (data: ActiveUsersUpdate) => void) {
  const s = getSocket()

  const subscribe = () => {
    s.emit('join_dashboard', projectId)
  }

  if (s.connected) {
    subscribe()
  } else {
    s.once('connect', subscribe)
  }

  s.on('active_users_update', onUpdate)

  // Re-unirse tras reconexión
  const onReconnect = () => subscribe()
  s.io.on('reconnect', onReconnect)

  return () => {
    s.off('active_users_update', onUpdate)
    s.io.off('reconnect', onReconnect)
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
