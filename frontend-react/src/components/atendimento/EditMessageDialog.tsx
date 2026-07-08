import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { resolveBackendError } from '@/api/backendErrors'
import { editMessage } from '@/api/tickets'
import type { Message } from '@/types/entities'
import { stripUserSignature } from '@/utils/messageHelpers'

interface EditMessageDialogProps {
  open: boolean
  message: Message | null
  onClose: () => void
  onSaved: (message: Message) => void
}

export function EditMessageDialog({ open, message, onClose, onSaved }: EditMessageDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (message) setBody(stripUserSignature(message.body || ''))
  }, [message])

  const handleSave = async () => {
    if (!message?.messageId) return
    setSaving(true)
    try {
      await editMessage(message.messageId, {
        id: message.id,
        messageId: message.messageId,
        body: body.trim()
      })
      onSaved({ ...message, body: body.trim(), edited: true })
      enqueueSnackbar('Mensagem editada', { variant: 'success' })
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar(
        (err as { userMessage?: string }).userMessage || resolveBackendError(err) || 'Erro ao editar',
        { variant: 'error' }
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar mensagem</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          minRows={4}
          margin="normal"
          label="Mensagem"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !body.trim()}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
