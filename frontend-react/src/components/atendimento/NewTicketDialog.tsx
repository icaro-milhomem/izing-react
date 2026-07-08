import { useState } from 'react'
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { listContacts } from '@/api/contacts'
import { createTicket } from '@/api/tickets'
import type { Contact, Ticket } from '@/types/entities'

interface NewTicketDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (ticket: Ticket) => void
}

export function NewTicketDialog({ open, onClose, onCreated }: NewTicketDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const [options, setOptions] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(false)

  const searchContacts = async (term: string) => {
    if (term.length < 2) {
      setOptions([])
      return
    }
    setLoading(true)
    try {
      const { data } = await listContacts({ searchParam: term, pageNumber: 1 })
      setOptions(data.contacts || [])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!selected) {
      enqueueSnackbar('Selecione um contato', { variant: 'warning' })
      return
    }
    const userId = Number(localStorage.getItem('userId'))
    try {
      const { data } = await createTicket({ contactId: selected.id, userId, status: 'open' })
      enqueueSnackbar('Ticket criado', { variant: 'success' })
      onCreated(data)
      setSelected(null)
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao criar ticket', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Novo ticket</DialogTitle>
      <DialogContent>
        <Autocomplete
          options={options}
          loading={loading}
          value={selected}
          onChange={(_, v) => setSelected(v)}
          onInputChange={(_, v) => searchContacts(v)}
          getOptionLabel={o => o.name || o.number || ''}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={params => (
            <TextField
              {...params}
              margin="normal"
              label="Localizar contato"
              placeholder="Digite ao menos 2 letras"
            />
          )}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              {option.name} — {option.number}
            </li>
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleCreate}>Criar</Button>
      </DialogActions>
    </Dialog>
  )
}
