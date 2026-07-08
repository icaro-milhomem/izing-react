import axios from 'axios'
import { resolveBackendError } from './backendErrors'
import { refreshToken } from './auth'
import { resolveApiUrl } from './resolveApiUrl'

export function getApiUrl(): string {
  return resolveApiUrl()
}

export const api = axios.create({
  timeout: 20000
})

api.interceptors.request.use(config => {
  config.baseURL = getApiUrl()
  const tokenRaw = localStorage.getItem('token')
  if (tokenRaw) {
    const token = JSON.parse(tokenRaw) as string
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config

    if (error?.response?.status === 403 && original && !original._retry) {
      original._retry = true
      try {
        const { data } = await refreshToken()
        if (data?.token) {
          localStorage.setItem('token', JSON.stringify(data.token))
          original.headers.Authorization = `Bearer ${data.token}`
          return api(original)
        }
      } catch {
        /* fall through */
      }
    }

    if (error?.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('profile')
      localStorage.removeItem('userId')
      localStorage.removeItem('usuario')
      const url = String(original?.url || '')
      if (!url.includes('logout') && !url.includes('login')) {
        window.location.hash = '#/login'
      }
    }

    error.userMessage = resolveBackendError(error)
    return Promise.reject(error)
  }
)

/** @deprecated use getApiUrl() — URL é resolvida por requisição em dev (IP WSL). */
export const API_URL = getApiUrl()
