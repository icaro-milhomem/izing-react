import { api } from './client'
import type { Tag } from '@/types/entities'

export const listTags = (isActive: boolean | null = null) =>
  api.get<Tag[]>(`/tags/?isActive=${isActive}`)
export const createTag = (data: Partial<Tag>) => api.post<Tag>('/tags/', data)
export const updateTag = (data: Tag) => api.put<Tag>(`/tags/${data.id}`, data)
export const deleteTag = (id: number) => api.delete(`/tags/${id}`)
