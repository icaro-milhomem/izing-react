import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { createFastReply, deleteFastReply, listFastReplies, updateFastReply } from '@/api/fastReply'
import type { FastReply } from '@/types/entities'

function FastReplyDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<FastReply>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<FastReply>>({ key: '', message: '', ...initial })
  const { enqueueSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      if (form.id) await updateFastReply(form as FastReply)
      else await createFastReply(form)
      enqueueSnackbar('Salvo com sucesso', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Criar'} Mensagem Rápida</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Atalho"
          margin="normal"
          value={form.key || ''}
          onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
        />
        <TextField
          fullWidth
          label="Mensagem"
          margin="normal"
          multiline
          minRows={3}
          value={form.message || ''}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
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

export function MensagensRapidasPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<FastReply>>({})
  const [confirm, setConfirm] = useState<FastReply | null>(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['fastReplies'],
    queryFn: async () => (await listFastReplies()).data
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteFastReply(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fastReplies'] })
      enqueueSnackbar('Deletado', { variant: 'success' })
      setConfirm(null)
    }
  })

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title="Mensagens Rápidas"
        action={
          <Button variant="contained" onClick={() => { setEditing({}); setDialogOpen(true) }}>
            Adicionar
          </Button>
        }
      />
      {isLoading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Atalho</TableCell>
                <TableCell>Mensagem</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.key}</TableCell>
                  <TableCell>{item.message}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => { setEditing(item); setDialogOpen(true) }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => setConfirm(item)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <FastReplyDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['fastReplies'] })}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Atenção"
        message={`Deseja deletar "${confirm?.key}"?`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && removeMutation.mutate(confirm.id)}
        loading={removeMutation.isPending}
      />
    </AdminOnly>
  )
}
