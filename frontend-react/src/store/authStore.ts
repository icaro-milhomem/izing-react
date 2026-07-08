import { create } from 'zustand'
import type { AuthUser, LoginCredentials } from '@/types/auth'
import { login as loginRequest } from '@/api/auth'
import { connectSocket, disconnectSocket } from '@/hooks/useSocket'

const defaultTicketFilters = {
  searchParam: '',
  pageNumber: 1,
  status: ['open', 'pending', 'closed'],
  showAll: false,
  count: null,
  queuesIds: [],
  withUnreadMessages: false,
  isNotAssignedUser: false,
  includeNotQueueDefined: true
}

function normalizeProfile(profile: string): AuthUser['profile'] {
  const value = profile.trim().toLowerCase()
  if (value === 'admin' || value === 'super' || value === 'user') {
    return value
  }
  return 'user'
}

function persistSession(data: AuthUser) {
  const profile = normalizeProfile(data.profile)
  const user = { ...data, profile }

  localStorage.setItem('token', JSON.stringify(user.token))
  localStorage.setItem('username', user.username)
  localStorage.setItem('profile', profile)
  localStorage.setItem('userId', String(user.userId))
  localStorage.setItem('usuario', JSON.stringify(user))
  localStorage.setItem('queues', JSON.stringify(user.queues))
  localStorage.setItem(
    'filtrosAtendimento',
    JSON.stringify(user.configs?.filtrosAtendimento || defaultTicketFilters)
  )
}

function loadUserFromStorage(): AuthUser | null {
  const raw = localStorage.getItem('usuario')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  applySession: (data: AuthUser) => AuthUser
  logout: () => void
  hydrate: () => void
  updateUsuario: (patch: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  hydrate: () => {
    const user = loadUserFromStorage()
    const token = localStorage.getItem('token')
    set({ user, isAuthenticated: Boolean(user && token) })
    if (user && token) {
      connectSocket(user)
    }
  },

  login: async credentials => {
    const email = credentials.email.trim()
    const { data } = await loginRequest({ ...credentials, email })
    const profile = normalizeProfile(data.profile)
    const user = { ...data, profile }
    persistSession(user)
    set({ user, isAuthenticated: true })
    connectSocket(user)
    return user
  },

  applySession: data => {
    const profile = normalizeProfile(data.profile)
    const user = { ...data, profile }
    persistSession(user)
    set({ user, isAuthenticated: true })
    connectSocket(user)
    return user
  },

  logout: () => {
    disconnectSocket()
    localStorage.clear()
    set({ user: null, isAuthenticated: false })
  },

  updateUsuario: patch => {
    set(state => {
      if (!state.user) return state
      const user = {
        ...state.user,
        ...patch,
        configs: patch.configs
          ? { ...state.user.configs, ...patch.configs }
          : state.user.configs
      }
      localStorage.setItem('usuario', JSON.stringify(user))
      return { user }
    })
  }
}))

export function getPostLoginPath(profile?: string | null): string {
  const value = (profile || '').trim().toLowerCase()
  if (value === 'admin') return '/home'
  if (value === 'super') return '/empresassuper'
  return '/atendimento'
}

export function isAdmin(profile?: string | null): boolean {
  return profile === 'admin' || profile === 'super'
}
