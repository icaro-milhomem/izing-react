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
import { createTag, deleteTag, listTags, updateTag } from '@/api/tags'
import type { Tag } from '@/types/entities'

function TagFormDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<Tag>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<Tag>>({ tag: '', color: '#1976d2', isActive: true, ...initial })
  const { enqueueSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!form.tag?.trim()) return
    setLoading(true)
    try {
      if (form.id) {
        await updateTag(form as Tag)
        enqueueSnackbar('Etiqueta atualizada', { variant: 'success' })
      } else {
        await createTag(form)
        enqueueSnackbar('Etiqueta criada', { variant: 'success' })
      }
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
      <DialogTitle>{form.id ? 'Editar' : 'Criar'} Etiqueta</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Etiqueta"
          margin="normal"
          value={form.tag || ''}
          onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
        />
        <TextField
          fullWidth
          label="Cor"
          margin="normal"
          type="color"
          value={form.color || '#1976d2'}
          onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
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

export function EtiquetasPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Tag>>({})
  const [confirm, setConfirm] = useState<Tag | null>(null)

  const { data: etiquetas = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await listTags()).data
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      enqueueSnackbar('Etiqueta deletada', { variant: 'success' })
      setConfirm(null)
    }
  })

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title="Etiquetas"
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
                <TableCell>Etiqueta</TableCell>
                <TableCell align="center">Cor</TableCell>
                <TableCell align="center">Ativo</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {etiquetas.map(tag => (
                <TableRow key={tag.id}>
                  <TableCell>{tag.id}</TableCell>
                  <TableCell>{tag.tag}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ bgcolor: tag.color, color: '#fff', px: 1, py: 0.5, borderRadius: 1, display: 'inline-block' }}>
                      {tag.color}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{tag.isActive ? 'Sim' : 'Não'}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => { setEditing(tag); setDialogOpen(true) }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => setConfirm(tag)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <TagFormDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['tags'] })}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Atenção"
        message={`Deseja deletar a etiqueta "${confirm?.tag}"?`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && removeMutation.mutate(confirm.id)}
        loading={removeMutation.isPending}
      />
    </AdminOnly>
  )
}
