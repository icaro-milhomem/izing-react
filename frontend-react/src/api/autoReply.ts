import { api } from './client'

export interface AutoReplyAction {
  id: number
  stepReplyId?: number
  words?: string
  action?: number
  nextStepId?: number | null
  queueId?: number | null
  userIdDestination?: number | null
}

export interface AutoReplyStep {
  id: number
  reply?: string
  initialStep?: boolean
  stepsReplyAction?: AutoReplyAction[]
}

export interface AutoReply {
  id: number
  name: string
  isActive?: boolean
  action?: number
  celularTeste?: string | null
  userId?: number
  stepsReply?: AutoReplyStep[]
}

export const listAutoReplies = async (params?: Record<string, unknown>) => {
  const { data } = await api.get<{ autoReply?: AutoReply[] } | AutoReply[]>('/auto-reply', { params })
  const items = Array.isArray(data) ? data : data.autoReply
  return { data: items ?? [] }
}

export const createAutoReply = (data: Record<string, unknown>) => api.post<AutoReply>('/auto-reply', data)

export const updateAutoReply = (data: AutoReply) => api.put<AutoReply>(`/auto-reply/${data.id}`, data)

export const deleteAutoReply = (id: number) => api.delete(`/auto-reply/${id}`)

export const createAutoReplyStep = (autoReplyId: number, data: Record<string, unknown>) =>
  api.post(`/auto-reply/${autoReplyId}/steps`, data)

export const updateAutoReplyStep = (autoReplyId: number, stepId: number, data: Record<string, unknown>) =>
  api.put(`/auto-reply/${autoReplyId}/steps/${stepId}`, data)

export const deleteAutoReplyStep = (autoReplyId: number, stepId: number) =>
  api.delete(`/auto-reply/${autoReplyId}/steps/${stepId}`)

export const createAutoReplyAction = (data: Record<string, unknown>) =>
  api.post('/auto-reply-action', data)

export const updateAutoReplyAction = (actionId: number, data: Record<string, unknown>) =>
  api.put(`/auto-reply-action/${actionId}`, data)

export const deleteAutoReplyAction = (actionId: number) =>
  api.delete(`/auto-reply-action/${actionId}`)
