import { useRef, useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  FormControlLabel,
  Switch,
  Popover,
  Typography
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { CalendarClock, Mic, Paperclip, Send, Video, X } from 'lucide-react'
import { ActionIconButton } from '@/components/icons/ActionIconButton'
import { ICON_SIZE, ICON_STROKE } from '@/components/icons/iconStyles'
import { EmojiPicker } from '@/components/atendimento/EmojiPicker'
import { MediaPreviewDialog } from '@/components/atendimento/MediaPreviewDialog'
import { useQuery } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { resolveBackendError } from '@/api/backendErrors'
import { listFastReplies } from '@/api/fastReply'
import { sendTicketMessage } from '@/api/tickets'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import {
  appendOutgoingFormFields,
  buildOutgoingTextPayload,
  formatOutgoingSignature
} from '@/utils/outgoingMessage'
import { randomUUID } from '@/utils/uuid'
import type { Message } from '@/types/entities'

interface ChatInputProps {
  ticketId: number
  channel?: string | null
  disabled?: boolean
  replyingMessage?: Message | null
  onClearReply?: () => void
  onSent?: () => void
}

export function ChatInput({
  ticketId,
  channel,
  disabled,
  replyingMessage,
  onClearReply,
  onSent
}: ChatInputProps) {
  const theme = useTheme()
  const { enqueueSnackbar } = useSnackbar()
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [sign, setSign] = useState(true)
  const [sending, setSending] = useState(false)
  const [fastReplyAnchor, setFastReplyAnchor] = useState<HTMLElement | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const { recording, seconds, formatTime, start, cancel, stop } = useAudioRecorder()

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const { data: fastReplies = [] } = useQuery({
    queryKey: ['fastReplies'],
    queryFn: async () => (await listFastReplies()).data
  })

  const filteredFastReplies = text.startsWith('/')
    ? fastReplies.filter(r => r.key.toLowerCase().includes(text.slice(1).toLowerCase()))
    : []

  const buildTextBody = () => {
    let body = text.trim()
    if (body.startsWith('/')) {
      const key = body.slice(1).toLowerCase()
      const match = fastReplies.find(r => r.key.toLowerCase() === key)
      if (match) body = match.message
      else throw new Error('Mensagem rápida não encontrada')
    }
    if (sign) {
      body = formatOutgoingSignature(localStorage.getItem('username'), body)
    }
    return body
  }

  const notifyError = (err: unknown, fallback: string) => {
    const message =
      (err as { userMessage?: string }).userMessage || resolveBackendError(err) || fallback
    enqueueSnackbar(message, { variant: 'error' })
  }

  const sendPayload = (payload: Record<string, unknown> | FormData) =>
    sendTicketMessage(ticketId, payload, channel).then(() => {
      onSent?.()
      onClearReply?.()
    })

  const closePreview = () => {
    setPreviewOpen(false)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setPreviewFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const openImagePreview = (file: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setPreviewOpen(true)
  }

  const isImageFile = (file: File) => file.type.startsWith('image/')

  const handleSendPreview = async () => {
    if (!previewFile) return
    setSending(true)
    try {
      const formData = new FormData()
      appendOutgoingFormFields(formData, replyingMessage)
      if (scheduleMode && scheduleDate) formData.append('scheduleDate', scheduleDate)
      formData.append('medias', previewFile)
      formData.append('body', previewFile.name)
      await sendPayload(formData)
      closePreview()
      setScheduleMode(false)
      setScheduleDate('')
    } catch (err: unknown) {
      notifyError(err, 'Erro ao enviar arquivo')
    } finally {
      setSending(false)
    }
  }

  const handleSendText = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const body = buildTextBody()
      const payload = buildOutgoingTextPayload(body, replyingMessage)
      if (scheduleMode && scheduleDate) {
        await sendPayload({ ...payload, scheduleDate })
        setScheduleMode(false)
        setScheduleDate('')
      } else {
        await sendPayload(payload)
      }
      setText('')
      setFastReplyAnchor(null)
    } catch (err: unknown) {
      notifyError(err, 'Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  const handleSendFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const fileList = Array.from(files)
    if (fileList.length === 1 && isImageFile(fileList[0]) && !scheduleMode) {
      openImagePreview(fileList[0])
      return
    }
    setSending(true)
    try {
      const formData = new FormData()
      appendOutgoingFormFields(formData, replyingMessage)
      if (scheduleMode && scheduleDate) formData.append('scheduleDate', scheduleDate)
      fileList.forEach(file => {
        formData.append('medias', file)
        formData.append('body', file.name)
      })
      await sendPayload(formData)
      setScheduleMode(false)
      setScheduleDate('')
    } catch (err: unknown) {
      notifyError(err, 'Erro ao enviar arquivo')
    } finally {
      setSending(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleStartRecording = async () => {
    try {
      await start()
    } catch {
      enqueueSnackbar('Permita acesso ao microfone', { variant: 'warning' })
    }
  }

  const handleStopRecording = async () => {
    setSending(true)
    try {
      const result = await stop()
      if (!result) {
        enqueueSnackbar('Gravação muito curta', { variant: 'info' })
        return
      }
      const formData = new FormData()
      appendOutgoingFormFields(formData, replyingMessage)
      formData.append('medias', result.blob, result.filename)
      formData.append('body', result.filename)
      await sendPayload(formData)
    } catch (err: unknown) {
      notifyError(err, 'Erro ao enviar áudio')
    } finally {
      setSending(false)
    }
  }

  const handleSendVideoLink = async () => {
    const link = `https://meet.jit.si/${randomUUID()}/${randomUUID()}`
    let body = link
    if (sign) body = formatOutgoingSignature(localStorage.getItem('username'), body)
    setSending(true)
    try {
      await sendPayload(buildOutgoingTextPayload(body, replyingMessage))
      window.open(link, '_blank')
    } catch (err: unknown) {
      notifyError(err, 'Erro ao enviar link')
    } finally {
      setSending(false)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length === 1 && isImageFile(files[0])) {
      e.preventDefault()
      openImagePreview(files[0])
      return
    }
    if (files.length) {
      e.preventDefault()
      const dt = new DataTransfer()
      files.forEach(f => dt.items.add(f))
      handleSendFiles(dt.files)
    }
  }

  const inputDisabled = disabled || sending

  return (
    <Paper elevation={0} sx={{ borderTop: 1, borderColor: 'divider' }}>
      {recording && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 1.5,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <ActionIconButton title="Cancelar gravação" onClick={cancel}>
            <X size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ActionIconButton>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'error.main',
              animation: 'pulse 1.2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.35 }
              }
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 48 }}>
            {formatTime(seconds)}
          </Typography>
          <ActionIconButton title="Enviar áudio" onClick={handleStopRecording} disabled={sending} active>
            <Send size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          </ActionIconButton>
        </Box>
      )}

      {!recording && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, pt: 1, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Switch size="small" checked={sign} onChange={e => setSign(e.target.checked)} />}
              label="Assinar"
              sx={{ ml: 0.5 }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={scheduleMode} onChange={e => setScheduleMode(e.target.checked)} />}
              label="Agendar"
              sx={{ ml: 0.5 }}
            />
            {scheduleMode && (
              <TextField
                size="small"
                type="datetime-local"
                label="Data/hora"
                slotProps={{ inputLabel: { shrink: true } }}
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                sx={{ ml: 1, minWidth: 200 }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-end', p: 1.5, pt: 0 }}>
            <input
              ref={fileRef}
              type="file"
              hidden
              multiple
              onChange={e => handleSendFiles(e.target.files)}
            />
            <ActionIconButton
              title="Agendar mensagem"
              active={scheduleMode}
              disabled={inputDisabled}
              onClick={() => setScheduleMode(v => !v)}
            >
              <CalendarClock size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </ActionIconButton>
            <ActionIconButton
              title="Anexar arquivo"
              disabled={inputDisabled}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </ActionIconButton>
            <EmojiPicker disabled={inputDisabled} onPick={emoji => setText(t => t + emoji)} />
            {!text.trim() && (
              <>
                <ActionIconButton
                  title="Gravar áudio"
                  disabled={inputDisabled}
                  onClick={handleStartRecording}
                >
                  <Mic size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                </ActionIconButton>
                <ActionIconButton
                  title="Enviar link de videoconferência"
                  disabled={inputDisabled}
                  onClick={handleSendVideoLink}
                >
                  <Video size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                </ActionIconButton>
              </>
            )}
            <TextField
              fullWidth
              size="small"
              placeholder="Digite / para mensagens rápidas..."
              value={text}
              disabled={inputDisabled}
              onPaste={handlePaste}
              onChange={e => {
                setText(e.target.value)
                if (e.target.value.startsWith('/')) {
                  setFastReplyAnchor(e.currentTarget)
                } else {
                  setFastReplyAnchor(null)
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendText()
                }
              }}
              multiline
              maxRows={4}
            />
            <ActionIconButton
              title="Enviar mensagem"
              onClick={handleSendText}
              disabled={inputDisabled || !text.trim()}
              active={Boolean(text.trim())}
            >
              <Send size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </ActionIconButton>
          </Box>
        </>
      )}

      <Popover
        open={Boolean(fastReplyAnchor) && filteredFastReplies.length > 0}
        anchorEl={fastReplyAnchor}
        onClose={() => setFastReplyAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <List dense sx={{ minWidth: 260, maxHeight: 240, overflow: 'auto' }}>
          {filteredFastReplies.map(r => (
            <ListItemButton
              key={r.id}
              onClick={() => {
                setText(r.message)
                setFastReplyAnchor(null)
              }}
            >
              <ListItemText primary={`/${r.key}`} secondary={r.message} />
            </ListItemButton>
          ))}
        </List>
      </Popover>

      <MediaPreviewDialog
        open={previewOpen}
        title="Enviar imagem"
        previewUrl={previewUrl}
        sending={sending}
        onClose={closePreview}
        onSend={handleSendPreview}
      />
    </Paper>
  )
}
