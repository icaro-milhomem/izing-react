import { api } from './client'
import type { Queue } from '@/types/entities'

export const listQueues = () => api.get<Queue[]>('/queue/')
export const createQueue = (data: Partial<Queue>) => api.post<Queue>('/queue/', data)
export const updateQueue = (data: Queue) => api.put<Queue>(`/queue/${data.id}`, data)
export const deleteQueue = (id: number) => api.delete(`/queue/${id}`)
