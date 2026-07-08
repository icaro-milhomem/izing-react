import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { listQueues } from '@/api/queues'
import { listUsers } from '@/api/users'
import {
  createAutoReplyAction,
  deleteAutoReplyAction,
  updateAutoReplyAction,
  type AutoReplyAction,
  type AutoReplyStep
} from '@/api/autoReply'

const ACTION_LABELS: Record<number, string> = {
  0: 'Próxima etapa',
  1: 'Transferir para fila',
  2: 'Transferir para usuário'
}

interface StepActionDialogProps {
  open: boolean
  autoReplyId: number
  step: AutoReplyStep
  allSteps: AutoReplyStep[]
  action?: AutoReplyAction | null
  onClose: () => void
  onSaved: () => void
}

export function StepActionDialog({
  open,
  autoReplyId,
  step,
  allSteps,
  action,
  onClose,
  onSaved
}: StepActionDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState<Partial<AutoReplyAction>>({ action: 0, words: '' })

  const { data: filas = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => (await listQueues()).data
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await listUsers()).data.users
  })

  useEffect(() => {
    if (action) setForm(action)
    else setForm({ action: 0, words: '', stepReplyId: step.id })
  }, [action, step.id, open])

  const save = async () => {
    try {
      const payload = {
        ...form,
        stepReplyId: step.id,
        idAutoReply: autoReplyId
      }
      if (form.id) await updateAutoReplyAction(form.id, payload)
      else await createAutoReplyAction(payload)
      enqueueSnackbar('Ação salva', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  const remove = async () => {
    if (!form.id) return
    try {
      await deleteAutoReplyAction(form.id)
      enqueueSnackbar('Ação removida', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Nova'} ação — etapa #{step.id}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Palavra-chave"
          margin="normal"
          value={form.words || ''}
          onChange={e => setForm(f => ({ ...f, words: e.target.value }))}
          helperText="Texto que o cliente deve enviar para acionar"
        />
        <FormControl component="fieldset" sx={{ mt: 2 }}>
          <RadioGroup
            value={String(form.action ?? 0)}
            onChange={e => setForm(f => ({ ...f, action: Number(e.target.value) }))}
          >
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <FormControlLabel key={value} value={value} control={<Radio />} label={label} />
            ))}
          </RadioGroup>
        </FormControl>
        {form.action === 0 && (
          <FormControl fullWidth margin="normal">
            <InputLabel>Próxima etapa</InputLabel>
            <Select
              label="Próxima etapa"
              value={form.nextStepId ?? ''}
              onChange={e => setForm(f => ({ ...f, nextStepId: Number(e.target.value) }))}
            >
              {allSteps.filter(s => s.id !== step.id).map(s => (
                <MenuItem key={s.id} value={s.id}>#{s.id} — {s.reply?.slice(0, 40)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {form.action === 1 && (
          <FormControl fullWidth margin="normal">
            <InputLabel>Fila</InputLabel>
            <Select
              label="Fila"
              value={form.queueId ?? ''}
              onChange={e => setForm(f => ({ ...f, queueId: Number(e.target.value) }))}
            >
              {filas.map(f => (
                <MenuItem key={f.id} value={f.id}>{f.queue}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {form.action === 2 && (
          <FormControl fullWidth margin="normal">
            <InputLabel>Usuário</InputLabel>
            <Select
              label="Usuário"
              value={form.userIdDestination ?? ''}
              onChange={e => setForm(f => ({ ...f, userIdDestination: Number(e.target.value) }))}
            >
              {users.map(u => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        {form.id && <Button color="error" onClick={remove}>Excluir</Button>}
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}
