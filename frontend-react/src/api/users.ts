import { api } from './client'
import type { User } from '@/types/entities'

export interface UsersListResponse {
  users: User[]
  count: number
  hasMore: boolean
}

export const listUsers = (params?: Record<string, unknown>) => api.get<UsersListResponse>('/users/', { params })
export const getUser = (id: number) => api.get<User>(`/users/${id}`)
export const createUser = (data: Partial<User> & { password?: string }) => api.post<User>('/users', data)
export const updateUser = (id: number, data: Partial<User>) => api.put<User>(`/users/${id}`, data)
export const deleteUser = (id: number) => api.delete(`/users/${id}`)
export const updateUserConfigs = (id: number, data: Record<string, unknown>) =>
  api.put(`/users/${id}/configs`, data)
export const updateUserStatus = (status: 'online' | 'offline') =>
  api.patch('/users/status', { status })
export interface AdminUser extends User {
  tenant?: { id: number; name: string }
}

export interface AdminUsersResponse {
  users: AdminUser[]
  hasMore: boolean
  count: number
}

export const adminListUsers = (params?: Record<string, unknown>) =>
  api.get<AdminUsersResponse>('/admin/users/', { params })
export const adminUpdateUser = (id: number, data: Partial<User>) =>
  api.put(`/admin/users/${id}`, data)
export const createUserTenant = (data: Record<string, unknown>) =>
  api.post('/admin/userTenants', data)
