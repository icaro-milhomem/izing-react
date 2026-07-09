import io from 'socket.io-client'
import type { AuthUser } from '@/types/auth'
import { getApiUrl } from '@/api/client'

type SocketClient = ReturnType<typeof io>

let socket: SocketClient | null = null

function getUserPresenceStatus(user?: AuthUser | null): 'online' | 'offline' {
  if (user?.status) return user.status
  try {
    const stored = JSON.parse(localStorage.getItem('usuario') || '{}') as { status?: string }
    return stored.status === 'offline' ? 'offline' : 'online'
  } catch {
    return 'online'
  }
}

export function emitUserPresence(
  activeSocket: SocketClient | null = socket,
  user?: AuthUser | null
): void {
  if (!activeSocket?.connected) return

  let tenantId = user?.tenantId
  if (!tenantId) {
    try {
      tenantId = JSON.parse(localStorage.getItem('usuario') || 'null')?.tenantId as number | undefined
    } catch {
      tenantId = undefined
    }
  }
  if (!tenantId) return

  const status = getUserPresenceStatus(user)
  if (status === 'offline') {
    activeSocket.emit(`${tenantId}:setUserIdle`)
  } else {
    activeSocket.emit(`${tenantId}:setUserActive`)
  }
}

export function getSocket(): SocketClient | null {
  return socket
}

export function connectSocket(user: AuthUser): SocketClient {
  if (socket?.connected) {
    emitUserPresence(socket, user)
    return socket
  }

  disconnectSocket()

  socket = io(getApiUrl(), {
    reconnection: true,
    autoConnect: true,
    transports: ['websocket', 'polling'],
    auth: (cb: (data: { token: string | null }) => void) => {
      const tokenItem = localStorage.getItem('token')
      const token = tokenItem ? (JSON.parse(tokenItem) as string) : null
      cb({ token })
    }
  })

  socket.on('connect', () => {
    emitUserPresence(socket, user)
  })

  socket.io.on('error', (error: Error) => {
    console.error('socket error', error)
  })

  socket.on(`tokenInvalid:${socket.id}`, () => {
    disconnectSocket()
    localStorage.clear()
    window.location.hash = '#/login'
  })

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
