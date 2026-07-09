export type NotificationSoundId =
  | 'grave_deep'
  | 'grave_bell'
  | 'grave_double'
  | 'medium_soft'
  | 'medium_default'
  | 'medium_loud'
  | 'acute_ping'
  | 'acute_bell'
  | 'acute_trill'
  | 'acute_alert'
  | 'special_chime'
  | 'special_rise'
  | 'special_fall'
  | 'special_double'
  | 'off'

export interface NotificationSoundOption {
  id: NotificationSoundId
  label: string
  hint?: string
}

export interface NotificationSoundGroup {
  title: string
  options: NotificationSoundOption[]
}

/** Sons agrupados por registro (grave → agudo). */
export const NOTIFICATION_SOUND_GROUPS: NotificationSoundGroup[] = [
  {
    title: 'Graves',
    options: [
      { id: 'grave_deep', label: 'Profundo', hint: 'Tom baixo e longo' },
      { id: 'grave_bell', label: 'Sino grave', hint: 'Campana grave' },
      { id: 'grave_double', label: 'Dois graves', hint: 'Par de notas baixas' }
    ]
  },
  {
    title: 'Médios',
    options: [
      { id: 'medium_soft', label: 'Suave', hint: 'Discreto' },
      { id: 'medium_default', label: 'Padrão', hint: 'Equilibrado' },
      { id: 'medium_loud', label: 'Alto', hint: 'Recomendado' }
    ]
  },
  {
    title: 'Agudos',
    options: [
      { id: 'acute_ping', label: 'Ping', hint: 'Bipe curto e agudo' },
      { id: 'acute_bell', label: 'Sino agudo', hint: 'Campainha fina' },
      { id: 'acute_trill', label: 'Trilo', hint: 'Três notas altas' },
      { id: 'acute_alert', label: 'Alerta', hint: 'Atenção imediata' }
    ]
  },
  {
    title: 'Especiais',
    options: [
      { id: 'special_chime', label: 'Campainha', hint: 'Subindo em 3 notas' },
      { id: 'special_rise', label: 'Subindo', hint: 'Grave → agudo' },
      { id: 'special_fall', label: 'Descendo', hint: 'Agudo → grave' },
      { id: 'special_double', label: 'Duplo', hint: 'Dois bipes médios' }
    ]
  },
  {
    title: 'Outros',
    options: [{ id: 'off', label: 'Sem som' }]
  }
]

export const NOTIFICATION_SOUND_OPTIONS = NOTIFICATION_SOUND_GROUPS.flatMap(g => g.options)

export interface NotificationSoundSettings {
  sound: NotificationSoundId
  volume: number
}

const STORAGE_KEY = 'notificationSoundSettings'

const DEFAULT_SETTINGS: NotificationSoundSettings = {
  sound: 'medium_loud',
  volume: 85
}

/** IDs antigos → novos (compatibilidade). */
const LEGACY_SOUND_MAP: Record<string, NotificationSoundId> = {
  soft: 'medium_soft',
  default: 'medium_default',
  loud: 'medium_loud',
  double: 'special_double',
  chime: 'special_chime',
  alert: 'acute_alert'
}

type Tone = {
  freq: number
  duration: number
  delay?: number
  type?: OscillatorType
}

const SOUND_PATTERNS: Record<NotificationSoundId, Tone[]> = {
  grave_deep: [{ freq: 185, duration: 0.28, type: 'sine' }],
  grave_bell: [{ freq: 311, duration: 0.32, type: 'triangle' }],
  grave_double: [
    { freq: 220, duration: 0.16, type: 'sine' },
    { freq: 277, duration: 0.2, type: 'sine', delay: 0.17 }
  ],
  medium_soft: [{ freq: 660, duration: 0.12 }],
  medium_default: [{ freq: 880, duration: 0.16 }],
  medium_loud: [{ freq: 880, duration: 0.24 }],
  acute_ping: [{ freq: 1568, duration: 0.07, type: 'sine' }],
  acute_bell: [{ freq: 1175, duration: 0.14, type: 'triangle' }],
  acute_trill: [
    { freq: 1047, duration: 0.07 },
    { freq: 1319, duration: 0.07, delay: 0.08 },
    { freq: 1568, duration: 0.1, delay: 0.16 }
  ],
  acute_alert: [{ freq: 1760, duration: 0.22, type: 'square' }],
  special_chime: [
    { freq: 523, duration: 0.1 },
    { freq: 659, duration: 0.1, delay: 0.11 },
    { freq: 784, duration: 0.18, delay: 0.22 }
  ],
  special_rise: [
    { freq: 262, duration: 0.1, type: 'sine' },
    { freq: 523, duration: 0.1, type: 'sine', delay: 0.11 },
    { freq: 1047, duration: 0.14, type: 'sine', delay: 0.22 }
  ],
  special_fall: [
    { freq: 1047, duration: 0.1, type: 'sine' },
    { freq: 523, duration: 0.1, type: 'sine', delay: 0.11 },
    { freq: 262, duration: 0.16, type: 'sine', delay: 0.22 }
  ],
  special_double: [
    { freq: 880, duration: 0.11 },
    { freq: 988, duration: 0.14, delay: 0.15 }
  ],
  off: []
}

let audioContext: AudioContext | null = null

function clampVolume(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.volume
  return Math.max(0, Math.min(100, Math.round(n)))
}

function normalizeSoundId(value: unknown): NotificationSoundId {
  if (typeof value === 'string' && value in SOUND_PATTERNS) {
    return value as NotificationSoundId
  }
  if (typeof value === 'string' && LEGACY_SOUND_MAP[value]) {
    return LEGACY_SOUND_MAP[value]
  }
  return DEFAULT_SETTINGS.sound
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioContext) {
      const Ctx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      audioContext = new Ctx()
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }
    return audioContext
  } catch {
    return null
  }
}

export function getNotificationSoundSettings(): NotificationSoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<NotificationSoundSettings>
    return {
      sound: normalizeSoundId(parsed.sound),
      volume: clampVolume(parsed.volume)
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveNotificationSoundSettings(settings: NotificationSoundSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      sound: normalizeSoundId(settings.sound),
      volume: clampVolume(settings.volume)
    })
  )
}

export function getNotificationSoundOption(sound: NotificationSoundId): NotificationSoundOption | undefined {
  return NOTIFICATION_SOUND_OPTIONS.find(option => option.id === sound)
}

function playPattern(pattern: Tone[], volumePercent: number): void {
  if (!pattern.length) return

  const ctx = getAudioContext()
  if (!ctx) return

  const masterGain = (volumePercent / 100) * 0.75
  const baseTime = ctx.currentTime

  pattern.forEach(tone => {
    const when = baseTime + (tone.delay || 0)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = tone.type || 'sine'
    osc.frequency.value = tone.freq
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(Math.max(masterGain, 0.0001), when + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + tone.duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(when)
    osc.stop(when + tone.duration + 0.05)
  })
}

export function previewNotificationSound(
  settings: NotificationSoundSettings = getNotificationSoundSettings()
): void {
  if (settings.sound === 'off' || settings.volume <= 0) return
  playPattern(SOUND_PATTERNS[settings.sound], settings.volume)
}

export function playConfiguredNotificationSound(): void {
  previewNotificationSound(getNotificationSoundSettings())
}
