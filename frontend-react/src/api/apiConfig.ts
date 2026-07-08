import { api } from './client'

export interface ApiConfig {
  id: string
  name: string
  sessionId: number
  token?: string
  authToken?: string | null
  urlServiceStatus?: string | null
  urlMessageStatus?: string | null
  isActive?: boolean
}

export async function listApiConfigs(): Promise<ApiConfig[]> {
  const { data } = await api.get<{ apis: ApiConfig[] }>('/api-config/')
  return data.apis ?? []
}

export const createApiConfig = (payload: Partial<ApiConfig>) => api.post<ApiConfig>('/api-config/', payload)

export const updateApiConfig = (payload: ApiConfig) => api.put<ApiConfig>(`/api-config/${payload.id}/`, payload)

export const renewApiToken = (config: Pick<ApiConfig, 'id' | 'sessionId'>) =>
  api.put<ApiConfig>(`/api-config/renew-token/${config.id}/`, { sessionId: config.sessionId })

export const deleteApiConfig = (id: string) => api.delete(`/api-config/${id}/`)
