import { api } from './client'
import type { Contact } from '@/types/entities'

export interface ContactListParams {
  searchParam?: string
  pageNumber?: number
}

export const listContacts = (params?: ContactListParams) =>
  api.get<{ contacts: Contact[]; count: number; hasMore: boolean }>('/contacts/', { params })
export const getContact = (id: number) => api.get<Contact>(`/contacts/${id}`)
export const createContact = (data: Partial<Contact>) => api.post<Contact>('/contacts', data)
export const updateContact = (id: number, data: Partial<Contact>) => api.put<Contact>(`/contacts/${id}`, data)
export const deleteContact = (id: number) => api.delete(`/contacts/${id}`)
export const syncContacts = () => api.post('/contacts/sync')
export const importContactsCsv = (data: FormData) =>
  api.post('/contacts/upload', data, { timeout: 120000 })
export const exportContacts = () => api.post<{ downloadLink: string }>('/contacts/export', {}, { timeout: 120000 })
export const updateContactTags = (id: number, tags: number[]) =>
  api.put(`/contact-tags/${id}`, { tags })
export const updateContactWallet = (id: number, wallets: number[]) =>
  api.put(`/contact-wallet/${id}`, { wallets })
