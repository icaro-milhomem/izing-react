import { api } from './client'
import type { WhatsappSession } from '@/types/entities'

export interface AdminChannel extends WhatsappSession {
  tenant?: { id: number; name: string }
}

export const adminListChannels = () => api.get<AdminChannel[]>('/admin/channels/')

export const adminCreateChannel = (data: Record<string, unknown>) =>
  api.post('/admin/channels', data)

export const adminUpdateChannel = (id: number, data: Partial<WhatsappSession>) =>
  api.put(`/whatsapp/${id}`, data)
