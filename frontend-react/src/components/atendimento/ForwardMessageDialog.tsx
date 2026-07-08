import { useEffect, useState } from 'react'
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { resolveBackendError } from '@/api/backendErrors'
import { listContacts } from '@/api/contacts'
import { forwardMessages } from '@/api/tickets'
import type { Contact, Message } from '@/types/entities'

interface ForwardMessageDialogProps {
  open: boolean
  messages: Message[]
  onClose: () => void
  onForwarded: () => void
}

export function ForwardMessageDialog({
  open,
  messages,
  onClose,
  onForwarded
}: ForwardMessageDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const [contact, setContact] = useState<Contact | null>(null)
  const [options, setOptions] = useState<Contact[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) {
      setContact(null)
      setInput('')
      setOptions([])
    }
  }, [open])

  const searchContacts = async (search: string) => {
    if (search.length < 2) {
      setOptions([])
      return
    }
    setLoading(true)
    try {
      const { data } = await listContacts({ searchParam: search, pageNumber: 1 })
      setOptions(data.contacts)
    } finally {
      setLoading(false)
    }
  }

  const handleForward = async () => {
    if (!contact) {
      enqueueSnackbar('Selecione o contato de destino', { variant: 'warning' })
      return
    }
    setSending(true)
    try {
      await forwardMessages(messages, contact)
      enqueueSnackbar(`Encaminhado para ${contact.name}`, { variant: 'success' })
      onForwarded()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar(
        (err as { userMessage?: string }).userMessage || resolveBackendError(err) || 'Erro ao encaminhar',
        { variant: 'error' }
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Encaminhar mensagem</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {messages.length} mensagem(ns) selecionada(s)
        </Typography>
        <Autocomplete
          options={options}
          loading={loading}
          value={contact}
          onChange={(_, value) => setContact(value)}
          inputValue={input}
          onInputChange={(_, value) => {
            setInput(value)
            searchContacts(value)
          }}
          getOptionLabel={o => `${o.name} (${o.number})`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={params => (
            <TextField {...params} label="Contato destino" placeholder="Digite para buscar..." />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleForward} disabled={sending}>
          Encaminhar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
