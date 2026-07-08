import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { updateUser } from '@/api/users'
import type { Queue, User } from '@/types/entities'

interface UserQueueDialogProps {
  open: boolean
  user: User | null
  filas: Queue[]
  onClose: () => void
  onSaved: () => void
}

export function UserQueueDialog({ open, user, filas, onClose, onSaved }: UserQueueDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    if (user && open) {
      setSelected(user.queues?.map(q => q.id) || [])
    }
  }, [user, open])

  const toggle = (id: number) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    if (!user) return
    try {
      await updateUser(user.id, { ...user, queues: selected as unknown as User['queues'] })
      enqueueSnackbar('Filas do usuário atualizadas', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao salvar', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Filas do usuário</DialogTitle>
      <DialogContent>
        {user && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              {user.email}
            </Typography>
          </>
        )}
        {filas.map(fila => (
          <FormControlLabel
            key={fila.id}
            control={
              <Checkbox
                checked={selected.includes(fila.id)}
                disabled={fila.isActive === false}
                onChange={() => toggle(fila.id)}
              />
            }
            label={`${fila.queue}${fila.isActive === false ? ' (Inativo)' : ''}`}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}
