import { api } from './client'
import { isHubChannel, sendHubMessage } from './hub'
import type { Message, Ticket, TicketFilters, TicketsResponse } from '@/types/entities'

export const listTickets = (params: Partial<TicketFilters> & { status?: string | string[] }) =>
  api.get<TicketsResponse>('/tickets', { params })

export const getTicket = (id: number) => api.get<Ticket>(`/tickets/${id}`)

export const createTicket = (data: Record<string, unknown>) => api.post<Ticket>('/tickets', data)

const ticketUpdateTimeout = 120000

export const updateTicket = (id: number, data: Record<string, unknown>) =>
  api.put<Ticket>(`/tickets/${id}`, data, { timeout: ticketUpdateTimeout })

export const updateTicketStatus = (id: number, status: string, userId?: number) =>
  api.put<Ticket>(`/tickets/${id}`, { status, userId }, { timeout: ticketUpdateTimeout })

export const listMessages = (ticketId: number, params?: { pageNumber?: number }) =>
  api.get<{ messages: Message[]; hasMore: boolean }>(`/messages/${ticketId}`, { params })

export const sendMessage = (ticketId: number, data: Record<string, unknown> | FormData) =>
  api.post(`/messages/${ticketId}`, data, {
    timeout: data instanceof FormData ? 120000 : 60000
  })

export const sendTicketMessage = (
  ticketId: number,
  data: Record<string, unknown> | FormData,
  channel?: string | null
) => (isHubChannel(channel) ? sendHubMessage(ticketId, data) : sendMessage(ticketId, data))

export const deleteMessage = (messageId: string, data: Record<string, unknown>) =>
  api.delete(`/messages/${messageId}`, { data })

export const editMessage = (messageId: string, data: Record<string, unknown>) =>
  api.post(`/messages/edit/${messageId}`, data)

export const forwardMessages = (messages: unknown[], contact: unknown) =>
  api.post('/forward-messages/', { messages, contact })

export const getTicketLogs = (ticketId: number, params?: Record<string, unknown>) =>
  api.get(`/tickets/${ticketId}/logs`, { params })
