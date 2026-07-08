import { resolveApiUrl } from '@/api/resolveApiUrl'

const AUDIO_MEDIA_TYPES = new Set(['audio', 'ptt', 'voice'])

export function isAudioMediaType(mediaType?: string | null): boolean {
  const type = (mediaType || '').toLowerCase()
  if (!type) return false
  return AUDIO_MEDIA_TYPES.has(type) || type.startsWith('audio/')
}

export function audioMimeFromUrl(url: string): string {
  const lower = url.toLowerCase().split('?')[0]
  if (lower.endsWith('.ogg')) return 'audio/ogg'
  if (lower.endsWith('.webm')) return 'audio/webm'
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return 'audio/mp4'
  return 'audio/mpeg'
}

/** Reescreve localhost para o host atual e monta URL de /public quando vier só o filename. */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined

  const apiUrl = resolveApiUrl().replace(/\/$/, '')

  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      try {
        const parsed = new URL(url)
        const api = new URL(apiUrl)
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
          parsed.hostname = api.hostname
          parsed.port = api.port
          return parsed.toString()
        }
      } catch {
        return url
      }
    }
    return url
  }

  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const clean = url.replace(/^\/+/, '')
    return `${apiUrl}/${clean}`
  }

  const clean = url.replace(/^\/+/, '').replace(/^public\//, '')
  return `${apiUrl}/public/${clean}`
}
