export interface AuthUser {
  token: string
  username: string
  profile: 'admin' | 'user' | 'super'
  userId: number
  tenantId: number
  email: string
  status?: 'online' | 'offline'
  queues: Array<{ id: number; queue: string }>
  configs?: {
    filtrosAtendimento?: Record<string, unknown>
    isDark?: boolean
  }
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface MenuItem {
  title: string
  caption: string
  path: string
  icon: string
  profiles?: Array<AuthUser['profile']>
}
