import type { ThemeColors } from '@/utils/themeApply'
import { DEFAULT_THEME } from '@/utils/themeApply'

export interface ChatBubblePalette {
  wallpaper: string
  outgoingBg: string
  outgoingText: string
  incomingBg: string
  incomingText: string
  contactName: string
  quoteBar: string
  quoteBgOutgoing: string
  quoteBgIncoming: string
  meta: string
  ackRead: string
  audioPlayOutgoing: string
  audioPlayIncoming: string
  audioWaveActive: string
  audioWaveInactive: string
  shadow: string
}

export function getChatBubblePalette(
  mode: 'light' | 'dark',
  colors: ThemeColors = DEFAULT_THEME
): ChatBubblePalette {
  const { primary, accent, secondary } = colors

  if (mode === 'dark') {
    return {
      wallpaper: '#0b141a',
      outgoingBg: `color-mix(in srgb, ${primary} 44%, #0b141a)`,
      outgoingText: '#e9edef',
      incomingBg: '#202c33',
      incomingText: '#e9edef',
      contactName: accent,
      quoteBar: accent,
      quoteBgOutgoing: `color-mix(in srgb, ${primary} 20%, transparent)`,
      quoteBgIncoming: 'rgba(255,255,255,0.06)',
      meta: 'rgba(233, 237, 239, 0.63)',
      ackRead: accent,
      audioPlayOutgoing: '#e9edef',
      audioPlayIncoming: '#8696a0',
      audioWaveActive: '#e9edef',
      audioWaveInactive: 'rgba(233, 237, 239, 0.35)',
      shadow: '0 1px 0.5px rgba(0,0,0,0.35)'
    }
  }

  return {
    wallpaper: `color-mix(in srgb, ${secondary} 40%, #efeae2)`,
    outgoingBg: `color-mix(in srgb, ${primary} 18%, ${secondary})`,
    outgoingText: '#111b21',
    incomingBg: '#ffffff',
    incomingText: '#111b21',
    contactName: primary,
    quoteBar: accent,
    quoteBgOutgoing: `color-mix(in srgb, ${primary} 10%, white)`,
    quoteBgIncoming: 'rgba(0,0,0,0.04)',
    meta: 'rgba(17, 27, 33, 0.45)',
    ackRead: accent,
    audioPlayOutgoing: primary,
    audioPlayIncoming: '#8696a0',
    audioWaveActive: primary,
    audioWaveInactive: 'rgba(102, 119, 129, 0.35)',
    shadow: '0 1px 0.5px rgba(11, 20, 26, 0.13)'
  }
}

export function bubbleRadius(fromMe: boolean) {
  return fromMe ? '8px 8px 0 8px' : '8px 8px 8px 0'
}

export function buildWaveformBars(seed: string, count = 34) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }

  return Array.from({ length: count }, (_, index) => {
    const value = Math.abs(Math.sin((hash + index) * 0.73)) * 0.55 + 0.25
    return Number(value.toFixed(3))
  })
}
