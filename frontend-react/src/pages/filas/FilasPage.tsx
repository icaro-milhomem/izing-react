import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { createQueue, deleteQueue, listQueues, updateQueue } from '@/api/queues'
import type { Queue } from '@/types/entities'

function QueueFormDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<Queue>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<Queue>>({ queue: '', isActive: true, ...initial })
  const { enqueueSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!form.queue?.trim()) return
    setLoading(true)
    try {
      if (form.id) {
        await updateQueue(form as Queue)
        enqueueSnackbar('Fila atualizada', { variant: 'success' })
      } else {
        await createQueue(form)
        enqueueSnackbar('Fila criada', { variant: 'success' })
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { userMessage?: string }).userMessage || 'Erro ao salvar'
      enqueueSnackbar(msg, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Criar'} Fila</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Nome da Fila"
          margin="normal"
          value={form.queue || ''}
          onChange={e => setForm(f => ({ ...f, queue: e.target.value }))}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(form.isActive)}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
            />
          }
          label="Ativo"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function FilasPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Queue>>({})
  const [confirm, setConfirm] = useState<Queue | null>(null)

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const { data } = await listQueues()
      localStorage.setItem('filasCadastradas', JSON.stringify(data))
      return data
    }
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteQueue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      enqueueSnackbar('Fila deletada', { variant: 'success' })
      setConfirm(null)
    }
  })

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title="Filas"
        action={
          <Button variant="contained" onClick={() => { setEditing({}); setDialogOpen(true) }}>
            Adicionar
          </Button>
        }
      />
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Fila</TableCell>
                <TableCell align="center">Ativo</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filas.map(fila => (
                <TableRow key={fila.id}>
                  <TableCell>{fila.id}</TableCell>
                  <TableCell>{fila.queue}</TableCell>
                  <TableCell align="center">{fila.isActive ? 'Sim' : 'Não'}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => { setEditing(fila); setDialogOpen(true) }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => setConfirm(fila)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <QueueFormDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['queues'] })}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Atenção"
        message={`Deseja deletar a fila "${confirm?.queue}"?`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && removeMutation.mutate(confirm.id)}
        loading={removeMutation.isPending}
      />
    </AdminOnly>
  )
}
