import { io, Socket } from 'socket.io-client'
import type { ActiveUsersUpdate } from '@/types'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function joinDashboard(projectId: string, onUpdate: (data: ActiveUsersUpdate) => void) {
  const s = getSocket()
  s.emit('join_dashboard', projectId)
  s.on('active_users_update', onUpdate)
  return () => {
    s.off('active_users_update', onUpdate)
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
