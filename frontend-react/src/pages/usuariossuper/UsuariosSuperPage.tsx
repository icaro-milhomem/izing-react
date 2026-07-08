import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
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
import SearchIcon from '@mui/icons-material/Search'
import { useSnackbar } from 'notistack'
import { SuperOnly, PageHeader } from '@/components/PageHeader'
import { adminListUsers, adminUpdateUser, createUserTenant, type AdminUser } from '@/api/users'
import { listTenants } from '@/api/tenants'

const PROFILE_LABELS: Record<string, string> = {
  user: 'Usuário',
  admin: 'Administrador',
  super: 'Super'
}

function CreateUserDialog({
  open,
  onClose,
  onSaved
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({
    tenantId: '' as number | '',
    name: '',
    email: '',
    password: '',
    profile: 'user' as 'user' | 'admin'
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => (await listTenants()).data,
    enabled: open
  })

  const handleSave = async () => {
    try {
      await createUserTenant(form)
      enqueueSnackbar('Usuário criado', { variant: 'success' })
      onSaved()
      onClose()
      setForm({ tenantId: '', name: '', email: '', password: '', profile: 'user' })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao criar', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cadastrar Usuário</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Empresa</InputLabel>
          <Select
            label="Empresa"
            value={form.tenantId}
            onChange={e => setForm(f => ({ ...f, tenantId: Number(e.target.value) }))}
          >
            {tenants.map(t => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth label="Nome" margin="normal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <TextField fullWidth label="E-mail" margin="normal" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <TextField fullWidth label="Senha" type="password" margin="normal" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        <FormControl fullWidth margin="normal">
          <InputLabel>Perfil</InputLabel>
          <Select label="Perfil" value={form.profile} onChange={e => setForm(f => ({ ...f, profile: e.target.value as 'user' | 'admin' }))}>
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

function EditUserDialog({
  open,
  user,
  onClose,
  onSaved
}: {
  open: boolean
  user: AdminUser | null
  onClose: () => void
  onSaved: () => void
}) {
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ name: '', email: '', password: '', profile: 'user' as AdminUser['profile'] })

  useEffect(() => {
    if (user && open) {
      setForm({ name: user.name, email: user.email, password: '', profile: user.profile })
    }
  }, [user, open])

  const handleSave = async () => {
    if (!user) return
    try {
      const payload: Partial<AdminUser> & { password?: string } = {
        name: form.name,
        email: form.email,
        profile: form.profile
      }
      if (form.password) payload.password = form.password
      await adminUpdateUser(user.id, payload)
      enqueueSnackbar('Usuário atualizado', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao salvar', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Usuário</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Nome" margin="normal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <TextField fullWidth label="E-mail" margin="normal" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <TextField fullWidth label="Nova senha (opcional)" type="password" margin="normal" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        <FormControl fullWidth margin="normal">
          <InputLabel>Perfil</InputLabel>
          <Select label="Perfil" value={form.profile} onChange={e => setForm(f => ({ ...f, profile: e.target.value as AdminUser['profile'] }))}>
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

export function UsuariosSuperPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['admin-users', search],
    queryFn: async ({ pageParam }) => {
      const res = await adminListUsers({ pageNumber: pageParam, searchParam: search || undefined })
      return res.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length + 1 : undefined)
  })

  const usuarios = (data?.pages.flatMap(p => p.users) || []).filter(u => u.profile !== 'super')
  const total = data?.pages[0]?.count ?? usuarios.length

  const reload = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  return (
    <SuperOnly profile={profile}>
      <PageHeader
        title="Usuários"
        action={
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Adicionar
          </Button>
        }
      />
      <TextField
        placeholder="Localize..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 320 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }
        }}
      />
      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Empresa</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>E-mail</TableCell>
                  <TableCell>Perfil</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.tenant ? `${u.tenant.id} - ${u.tenant.name}` : '—'}</TableCell>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{PROFILE_LABELS[u.profile] || u.profile}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => setEditUser(u)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button sx={{ mt: 2 }} disabled={!hasNextPage || isFetchingNextPage} onClick={() => fetchNextPage()}>
            {hasNextPage ? `Carregar mais (${usuarios.length}/${total})` : `${usuarios.length} usuários`}
          </Button>
        </>
      )}
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={reload} />
      <EditUserDialog open={Boolean(editUser)} user={editUser} onClose={() => setEditUser(null)} onSaved={reload} />
    </SuperOnly>
  )
}
