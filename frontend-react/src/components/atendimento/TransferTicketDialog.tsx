import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { updateTicket } from '@/api/tickets'
import { listUsers } from '@/api/users'
import type { Queue, Ticket, User } from '@/types/entities'

interface TransferTicketDialogProps {
  open: boolean
  ticket: Ticket | null
  filas: Queue[]
  onClose: () => void
  onTransferred: (ticket: Ticket) => void
}

export function TransferTicketDialog({
  open,
  ticket,
  filas,
  onClose,
  onTransferred
}: TransferTicketDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const [queueId, setQueueId] = useState<number | ''>('')
  const [userId, setUserId] = useState<number | null>(null)
  const [usuarios, setUsuarios] = useState<User[]>([])

  useEffect(() => {
    if (open) {
      setQueueId(ticket?.queueId ?? '')
      setUserId(ticket?.userId ?? null)
      listUsers().then(res => setUsuarios(res.data.users || []))
    }
  }, [open, ticket])

  const filteredUsers = queueId
    ? usuarios.filter(u => u.queues?.some(q => q.id === queueId))
    : usuarios

  const handleSave = async () => {
    if (!ticket || !queueId) {
      enqueueSnackbar('Selecione a fila de destino', { variant: 'warning' })
      return
    }
    try {
      const { data } = await updateTicket(ticket.id, {
        userId: userId || null,
        queueId,
        status: userId ? 'open' : 'pending',
        isTransference: 1
      })
      enqueueSnackbar('Ticket transferido', { variant: 'success' })
      onTransferred(data)
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao transferir', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transferir ticket</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Fila destino</InputLabel>
          <Select
            label="Fila destino"
            value={queueId}
            onChange={e => { setQueueId(Number(e.target.value)); setUserId(null) }}
          >
            {filas.map(f => (
              <MenuItem key={f.id} value={f.id}>{f.queue}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Usuário destino</InputLabel>
          <Select
            label="Usuário destino"
            value={userId === null ? '' : String(userId)}
            onChange={e => {
              const v = e.target.value as string
              setUserId(v === '' ? null : Number(v))
            }}
          >
            <MenuItem value="">Nenhum (fila)</MenuItem>
            {filteredUsers.map(u => (
              <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>Transferir</Button>
      </DialogActions>
    </Dialog>
  )
}
