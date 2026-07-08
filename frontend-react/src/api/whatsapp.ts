import { api } from './client'
import type { WhatsappSession } from '@/types/entities'

export function buildWhatsappPayload(
  form: Partial<WhatsappSession>,
  existing?: Partial<WhatsappSession>
): Partial<WhatsappSession> {
  const payload: Partial<WhatsappSession> = {
    name: form.name?.trim(),
    logo: form.logo || '',
    farewellMessage: form.farewellMessage ?? '',
    wavoip: form.wavoip ?? '',
    queueId: form.queueId ?? null,
    chatFlowId: form.chatFlowId ?? null,
    isDefault: form.isDefault ?? false
  }

  if (existing?.id) {
    if (existing.status) payload.status = existing.status
    if (form.tokenTelegram !== undefined) payload.tokenTelegram = form.tokenTelegram
    if (form.instagramUser !== undefined) payload.instagramUser = form.instagramUser
    if (form.wabaBSP !== undefined) payload.wabaBSP = form.wabaBSP
    if (form.tokenAPI !== undefined) payload.tokenAPI = form.tokenAPI
    if (form.instagramKey) payload.instagramKey = form.instagramKey
  } else {
    payload.type = form.type || 'whatsapp'
    if (form.type === 'telegram') payload.tokenTelegram = form.tokenTelegram ?? ''
    if (form.type === 'instagram') {
      payload.instagramUser = form.instagramUser ?? ''
      payload.instagramKey = form.instagramKey ?? ''
    }
    if (form.type === 'waba') {
      payload.wabaBSP = form.wabaBSP ?? '360'
      payload.tokenAPI = form.tokenAPI ?? ''
    }
  }

  return payload
}

export const listWhatsapps = () => api.get<WhatsappSession[]>('/whatsapp/')
export const getWhatsapp = (id: number) => api.get<WhatsappSession>(`/whatsapp/${id}`)
export const createWhatsapp = (data: Partial<WhatsappSession>) => api.post<WhatsappSession>('/whatsapp', data)
export const updateWhatsapp = (id: number, data: Partial<WhatsappSession>) =>
  api.put<WhatsappSession>(`/whatsapp/${id}`, data)
export const deleteWhatsapp = (id: number) => api.delete(`/whatsapp/${id}`)
export const startWhatsappSession = (id: number) => api.post(`/whatsappsession/${id}`)
export const deleteWhatsappSession = (id: number) => api.delete(`/whatsappsession/${id}`)
export const requestNewQrCode = (id: number, data?: Record<string, unknown>) =>
  api.put(`/whatsappsession/${id}`, data)
