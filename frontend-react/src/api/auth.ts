import type { AuthUser, LoginCredentials } from '@/types/auth'
import { api } from './client'

export function login(credentials: LoginCredentials) {
  return api.post<AuthUser>('/auth/login/', credentials)
}

export function logout(userId?: number) {
  return api.post('/auth/logout/', { userId })
}

export function refreshToken() {
  return api.post<{ token: string }>('/auth/refresh_token')
}
