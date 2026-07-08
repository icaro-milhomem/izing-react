import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import { Mic, Pause, Play } from 'lucide-react'
import { audioMimeFromUrl, resolveMediaUrl } from '@/utils/mediaUrl'
import { buildWaveformBars, getChatBubblePalette } from '@/utils/chatBubbleStyles'
import { useBrandTokens } from '@/hooks/useBrandTokens'

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

interface AudioMessageProps {
  mediaUrl: string
  fromMe?: boolean
  meta?: ReactNode
}

export function AudioMessage({ mediaUrl, fromMe, meta }: AudioMessageProps) {
  const { colors, mode } = useBrandTokens()
  const palette = getChatBubblePalette(mode, colors)
  const src = resolveMediaUrl(mediaUrl)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [ready, setReady] = useState(false)

  const bars = useMemo(() => buildWaveformBars(src || mediaUrl), [src, mediaUrl])
  const progress = duration > 0 ? current / duration : 0

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onLoaded = () => {
      setDuration(el.duration || 0)
      setReady(Number.isFinite(el.duration) && el.duration > 0)
    }
    const onTime = () => setCurrent(el.currentTime)
    const onEnd = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('durationchange', onLoaded)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnd)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)

    return () => {
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('durationchange', onLoaded)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnd)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [src])

  const toggle = async () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      return
    }
    try {
      await el.play()
    } catch {
      setPlaying(false)
    }
  }

  const seekByIndex = (index: number) => {
    const el = audioRef.current
    if (!el || !duration) return
    const next = (index / bars.length) * duration
    el.currentTime = next
    setCurrent(next)
  }

  if (!src) return null

  const playColor = fromMe ? palette.audioPlayOutgoing : palette.audioPlayIncoming
  const waveActive = palette.audioWaveActive
  const waveInactive = fromMe ? `color-mix(in srgb, ${colors.primary} 22%, transparent)` : palette.audioWaveInactive

  return (
    <Box
      sx={{
        width: 280,
        maxWidth: '100%',
        minWidth: 230,
        flexShrink: 0
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 50 }}>
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <IconButton
            onClick={() => void toggle()}
            disabled={!ready}
            sx={{
              width: 44,
              height: 44,
              bgcolor: fromMe
                ? `color-mix(in srgb, ${colors.primary} 16%, transparent)`
                : 'rgba(134, 150, 160, 0.16)',
              color: playColor,
              '&:hover': {
                bgcolor: fromMe
                  ? `color-mix(in srgb, ${colors.primary} 24%, transparent)`
                  : 'rgba(134, 150, 160, 0.24)'
              },
              '&.Mui-disabled': { opacity: 0.45 }
            }}
          >
            {playing ? <Pause size={20} strokeWidth={2.25} fill="currentColor" /> : <Play size={20} strokeWidth={2.25} fill="currentColor" />}
          </IconButton>
          {!fromMe && (
            <Box
              sx={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: palette.incomingBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: palette.audioPlayIncoming
              }}
            >
              <Mic size={11} strokeWidth={2.5} />
            </Box>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'flex-end',
            gap: '2px',
            height: 28,
            cursor: ready ? 'pointer' : 'default'
          }}
          onClick={e => {
            if (!ready) return
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
            const el = audioRef.current
            if (!el || !duration) return
            el.currentTime = ratio * duration
            setCurrent(el.currentTime)
          }}
        >
          {bars.map((height, index) => {
            const filled = index / bars.length <= progress
            return (
              <Box
                key={index}
                onClick={e => {
                  e.stopPropagation()
                  seekByIndex(index)
                }}
                sx={{
                  width: 3,
                  height: `${height * 100}%`,
                  minHeight: 4,
                  borderRadius: 999,
                  bgcolor: filled ? waveActive : waveInactive,
                  transition: 'background-color 0.12s linear'
                }}
              />
            )
          })}
        </Box>

        <Typography
          variant="caption"
          sx={{
            flexShrink: 0,
            minWidth: 34,
            textAlign: 'right',
            color: palette.meta,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 11,
            lineHeight: 1
          }}
        >
          {playing || current > 0 ? formatTime(current) : ready ? formatTime(duration) : '--:--'}
        </Typography>
      </Box>

      {meta && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 0.5,
            mt: 0.25,
            color: palette.meta,
            '& .MuiSvgIcon-root': { fontSize: 14, opacity: 0.85 }
          }}
        >
          {meta}
        </Box>
      )}

      <audio ref={audioRef} preload="metadata" playsInline src={src}>
        <source src={src} type={audioMimeFromUrl(src)} />
      </audio>
    </Box>
  )
}
