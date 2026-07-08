import { api } from './client'
import type { Contact } from '@/types/entities'

export interface Campaign {
  id: number
  name: string
  status: string
  start?: string
  end?: string
  message1?: string
  message2?: string
  message3?: string
  mediaUrl?: string
  sessionId?: number
  delay?: number | string
  contactsCount?: number
}

export const listCampaigns = () => api.get<Campaign[]>('/campaigns/')
export const createCampaign = (data: FormData | Record<string, unknown>) =>
  api.post<Campaign>('/campaigns/', data, data instanceof FormData ? { timeout: 120000 } : undefined)
export const updateCampaign = (id: number, data: FormData | Record<string, unknown>) =>
  api.put(`/campaigns/${id}`, data, data instanceof FormData ? { timeout: 120000 } : undefined)
export const deleteCampaign = (id: number) => api.delete(`/campaigns/${id}`)
export const startCampaign = (id: number) => api.post(`/campaigns/start/${id}/`, { campaignId: id })
export const cancelCampaign = (id: number) => api.post(`/campaigns/cancel/${id}/`, { campaignId: id })
export const listCampaignContacts = (campaignId: number) =>
  api.get<Contact[]>(`/campaigns/contacts/${campaignId}/`, { params: { campaignId } })
export const addCampaignContacts = (campaignId: number, contacts: unknown[]) =>
  api.post(`/campaigns/contacts/${campaignId}/`, contacts)
export const removeCampaignContact = (campaignId: number, contactId: number) =>
  api.delete(`/campaigns/contacts/${campaignId}/${contactId}/`, { params: { campaignId, contactId } })
export const clearCampaignContacts = (campaignId: number) =>
  api.delete(`/campaigns/deleteall/contacts/${campaignId}/`, { params: { campaignId } })
