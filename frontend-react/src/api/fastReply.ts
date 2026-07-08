import { api } from './client'
import type { FastReply } from '@/types/entities'

export const listFastReplies = () => api.get<FastReply[]>('/fastreply/')
export const createFastReply = (data: Partial<FastReply>) => api.post<FastReply>('/fastreply/', data)
export const updateFastReply = (data: FastReply) => api.put<FastReply>(`/fastreply/${data.id}`, data)
export const deleteFastReply = (id: number) => api.delete(`/fastreply/${id}`)
