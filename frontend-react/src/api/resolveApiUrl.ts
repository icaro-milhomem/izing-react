const BACKEND_PORT = import.meta.env.VITE_API_PORT || '3000'

/** Em dev, usa o mesmo host da página (funciona com IP WSL ex. 172.17.x.x:5174). */
export function resolveApiUrl(): string {
  if (import.meta.env.DEV && import.meta.env.VITE_HTTPS === 'true' && typeof window !== 'undefined') {
    return window.location.origin
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:${BACKEND_PORT}`
  }
  return import.meta.env.VITE_API_URL || `http://localhost:${BACKEND_PORT}`
}
