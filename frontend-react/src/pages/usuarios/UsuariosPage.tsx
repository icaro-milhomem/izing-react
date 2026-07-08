import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserQueueDialog } from '@/components/usuarios/UserQueueDialog'
import { createUser, deleteUser, listUsers, updateUser } from '@/api/users'
import { listQueues } from '@/api/queues'
import type { User } from '@/types/entities'

function UserDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<User> & { password?: string }
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(initial)
  const { enqueueSnackbar } = useSnackbar()

  const handleSave = async () => {
    try {
      if (form.id) await updateUser(form.id, form)
      else await createUser(form)
      enqueueSnackbar('Usuário salvo', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Novo'} Usuário</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Nome" margin="normal" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <TextField fullWidth label="E-mail" margin="normal" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        {!form.id && (
          <TextField fullWidth label="Senha" type="password" margin="normal" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        )}
        <FormControl fullWidth margin="normal">
          <InputLabel>Perfil</InputLabel>
          <Select label="Perfil" value={form.profile || 'user'} onChange={e => setForm(f => ({ ...f, profile: e.target.value as User['profile'] }))}>
            <MenuItem value="user">Usuário</MenuItem>
            <MenuItem value="admin">Administrador</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}

export function UsuariosPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<User>>({})
  const [confirm, setConfirm] = useState<User | null>(null)
  const [queueUser, setQueueUser] = useState<User | null>(null)

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => (await listUsers({ searchParam: search })).data.users
  })

  const { data: filas = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => (await listQueues()).data
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      enqueueSnackbar('Usuário deletado', { variant: 'success' })
      setConfirm(null)
    }
  })

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title="Usuários"
        action={
          <Button variant="contained" onClick={() => { setEditing({}); setDialogOpen(true) }}>
            Adicionar
          </Button>
        }
      />
      <TextField placeholder="Localizar..." value={search} onChange={e => setSearch(e.target.value)} sx={{ mb: 2, maxWidth: 300 }} />
      {isLoading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.profile}</TableCell>
                  <TableCell align="center">
                    <IconButton title="Filas do usuário" onClick={() => setQueueUser(u)}>
                      <AccountTreeIcon />
                    </IconButton>
                    <IconButton onClick={() => { setEditing(u); setDialogOpen(true) }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => setConfirm(u)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <UserDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['users'] })} />
      <UserQueueDialog
        open={Boolean(queueUser)}
        user={queueUser}
        filas={filas}
        onClose={() => setQueueUser(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
      <ConfirmDialog open={Boolean(confirm)} title="Atenção" message={`Deletar usuário "${confirm?.name}"?`} onCancel={() => setConfirm(null)} onConfirm={() => confirm && removeMutation.mutate(confirm.id)} loading={removeMutation.isPending} />
    </AdminOnly>
  )
}
