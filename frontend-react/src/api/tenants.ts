import { api } from './client'
import type { Tenant } from '@/types/entities'

export const listTenants = () => api.get<Tenant[]>('/admin/tenants/')
export const createTenant = (data: Partial<Tenant>) => api.post<Tenant>('/admin/tenants/', data)
export const updateTenant = (data: Tenant) => api.put(`/admin/tenantsUpdate/${data.id}`, data)
export const deleteTenant = (id: number) => api.delete(`/admin/tenants/${id}`)
export const getBusinessHours = () => api.get('/tenants/business-hours/')
export const updateBusinessHours = (data: unknown) => api.put('/tenants/business-hours/', data)
export const updateBusinessHoursMessage = (data: unknown) =>
  api.put('/tenants/message-business-hours/', data)
