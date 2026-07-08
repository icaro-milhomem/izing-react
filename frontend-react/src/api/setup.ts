import { api } from './client'
import type { AuthUser } from '@/types/auth'

export const SETUP_STATUS_QUERY_KEY = ['setup-status'] as const

export interface SetupStatus {
  initialized: boolean
}

export interface SetupUserPayload {
  name: string
  email: string
  password: string
}

export interface SetupPayload {
  companyName: string
  superUser: SetupUserPayload
  adminUser: SetupUserPayload
}

export function getSetupStatus() {
  return api.get<SetupStatus>('/auth/setup-status/')
}

export function setupInitial(payload: SetupPayload) {
  return api.post<AuthUser>('/auth/setup/', payload)
}
