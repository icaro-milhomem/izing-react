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
  CircularProgress,
  Chip
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useSnackbar } from 'notistack'
import { SuperOnly, PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { createTenant, deleteTenant, listTenants, updateTenant } from '@/api/tenants'
import type { Tenant } from '@/types/entities'

function TenantDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<Tenant>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<Tenant>>({ name: '', email: '', ...initial })
  const { enqueueSnackbar } = useSnackbar()

  const handleSave = async () => {
    try {
      if (form.id) await updateTenant(form as Tenant)
      else await createTenant(form)
      enqueueSnackbar('Empresa salva', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Nova'} Empresa</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Nome" margin="normal" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <TextField fullWidth label="E-mail" margin="normal" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}

export function EmpresasSuperPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Tenant>>({})
  const [confirm, setConfirm] = useState<Tenant | null>(null)

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => (await listTenants()).data
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      enqueueSnackbar('Empresa deletada', { variant: 'success' })
      setConfirm(null)
    }
  })

  return (
    <SuperOnly profile={profile}>
      <PageHeader
        title="Empresas"
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
                <TableCell>Status</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.id}</TableCell>
                  <TableCell><Chip label={t.status || '—'} size="small" /></TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.email || '—'}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => { setEditing(t); setDialogOpen(true) }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => setConfirm(t)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <TenantDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['tenants'] })} />
      <ConfirmDialog open={Boolean(confirm)} title="Atenção" message={`Deletar empresa "${confirm?.name}"?`} onCancel={() => setConfirm(null)} onConfirm={() => confirm && removeMutation.mutate(confirm.id)} loading={removeMutation.isPending} />
    </SuperOnly>
  )
}
