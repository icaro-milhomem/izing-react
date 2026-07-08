import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material'
import { useState } from 'react'
import { useSnackbar } from 'notistack'
import { resolveBackendError } from '@/api/backendErrors'
import { sendTicketMessage } from '@/api/tickets'
import { buildOutgoingTextPayload } from '@/utils/outgoingMessage'
import type { Message } from '@/types/entities'

interface ScheduleMessageDialogProps {
  open: boolean
  ticketId: number
  channel?: string | null
  replyingMessage?: Message | null
  onClose: () => void
  onScheduled?: () => void
}

export function ScheduleMessageDialog({
  open,
  ticketId,
  channel,
  replyingMessage,
  onClose,
  onScheduled
}: ScheduleMessageDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const [scheduleDate, setScheduleDate] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!scheduleDate || !body.trim()) {
      enqueueSnackbar('Informe data/hora e mensagem', { variant: 'warning' })
      return
    }
    setSending(true)
    try {
      const username = localStorage.getItem('username')
      const text = username ? `*${username}*:\n ${body.trim()}` : body.trim()
      await sendTicketMessage(
        ticketId,
        {
          ...buildOutgoingTextPayload(text, replyingMessage),
          scheduleDate
        },
        channel
      )
      enqueueSnackbar('Mensagem agendada', { variant: 'success' })
      setBody('')
      setScheduleDate('')
      onScheduled?.()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar(
        (err as { userMessage?: string }).userMessage || resolveBackendError(err) || 'Erro',
        { variant: 'error' }
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Agendar mensagem</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          type="datetime-local"
          label="Data e hora"
          margin="normal"
          slotProps={{ inputLabel: { shrink: true } }}
          value={scheduleDate}
          onChange={e => setScheduleDate(e.target.value)}
        />
        <TextField
          fullWidth
          multiline
          minRows={4}
          label="Mensagem"
          margin="normal"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSend} disabled={sending}>Agendar</Button>
      </DialogActions>
    </Dialog>
  )
}
