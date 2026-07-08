import { useEffect, useRef, useState } from 'react'

function pickAudioMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || ''
}

function extensionForMime(mime: string) {
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mp4')) return 'm4a'
  return 'webm'
}

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<number | undefined>(undefined)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeRef = useRef('audio/webm')

  useEffect(() => {
    if (!recording) {
      if (timerRef.current) window.clearInterval(timerRef.current)
      setSeconds(0)
      return
    }
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [recording])

  const formatTime = (total: number) => {
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    const mimeType = pickAudioMimeType()
    mimeRef.current = mimeType || 'audio/webm'
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunksRef.current = []
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    mediaRecorderRef.current = recorder
    recorder.start()
    setRecording(true)
  }

  const cancel = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        releaseStream()
        chunksRef.current = []
      }
      recorder.stop()
    } else {
      releaseStream()
    }
    mediaRecorderRef.current = null
    setRecording(false)
  }

  const stop = async (): Promise<{ blob: Blob; filename: string } | null> => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      setRecording(false)
      return null
    }

    return new Promise(resolve => {
      recorder.onstop = () => {
        const mime = recorder.mimeType || mimeRef.current
        const blob = new Blob(chunksRef.current, { type: mime })
        releaseStream()
        mediaRecorderRef.current = null
        chunksRef.current = []
        setRecording(false)
        if (blob.size < 10000) {
          resolve(null)
          return
        }
        resolve({
          blob,
          filename: `${Date.now()}.${extensionForMime(mime)}`
        })
      }
      recorder.stop()
    })
  }

  return { recording, seconds, formatTime, start, cancel, stop }
}
