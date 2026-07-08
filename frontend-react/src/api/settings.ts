import { api } from './client'
import type { Setting } from '@/types/entities'

export const listSettings = (params?: Record<string, unknown>) =>
  api.get<Setting[]>('/settings/', { params })
export const updateSetting = (key: string, data: Record<string, unknown>) =>
  api.put(`/settings/${key}/`, data)
