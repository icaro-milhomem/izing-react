import { api } from './client'
import { resolveApiUrl } from './resolveApiUrl'

export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post<{ url: string; name?: string; type?: string }>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })
  const base = resolveApiUrl().replace(/\/$/, '')
  const path = data.url.startsWith('/') ? data.url : `/${data.url}`
  return { ...data, fullUrl: `${base}${path}` }
}
