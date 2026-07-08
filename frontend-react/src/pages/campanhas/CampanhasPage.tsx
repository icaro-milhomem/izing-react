import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Chip,
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
  Typography,
  CircularProgress
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import PeopleIcon from '@mui/icons-material/People'
import AddIcon from '@mui/icons-material/Add'
import { Link, useParams } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { listContacts } from '@/api/contacts'
import { listWhatsapps } from '@/api/whatsapp'
import {
  addCampaignContacts,
  cancelCampaign,
  clearCampaignContacts,
  createCampaign,
  deleteCampaign,
  listCampaignContacts,
  listCampaigns,
  removeCampaignContact,
  startCampaign,
  updateCampaign,
  type Campaign
} from '@/api/campaigns'
import type { Contact } from '@/types/entities'

function CampaignDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<Campaign>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<Campaign>>({ delay: 20, ...initial })
  const { enqueueSnackbar } = useSnackbar()

  const { data: sessions = [] } = useQuery({
    queryKey: ['whatsapps'],
    queryFn: async () => (await listWhatsapps()).data
  })

  const save = async () => {
    try {
      const payload = {
        ...form,
        message1: form.message1 || '',
        message2: form.message2 || form.message1 || '',
        message3: form.message3 || form.message2 || form.message1 || ''
      }
      if (form.id) await updateCampaign(form.id, payload)
      else await createCampaign(payload)
      enqueueSnackbar('Campanha salva', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Nova'} Campanha</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mensagens enviadas em horário comercial e dias úteis.
        </Typography>
        <TextField fullWidth label="Nome" margin="normal" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <TextField
          fullWidth
          type="datetime-local"
          label="Data/Hora início"
          margin="normal"
          slotProps={{ inputLabel: { shrink: true } }}
          value={form.start?.slice(0, 16) || ''}
          onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Enviar por (sessão)</InputLabel>
          <Select
            label="Enviar por (sessão)"
            value={form.sessionId ?? ''}
            onChange={e => setForm(f => ({ ...f, sessionId: Number(e.target.value) }))}
          >
            {sessions.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth label="Delay (segundos)" margin="normal" type="number" value={form.delay ?? 20} onChange={e => setForm(f => ({ ...f, delay: e.target.value }))} />
        <TextField fullWidth label="Mensagem 1" margin="normal" multiline minRows={2} value={form.message1 || ''} onChange={e => setForm(f => ({ ...f, message1: e.target.value }))} />
        <TextField fullWidth label="Mensagem 2" margin="normal" multiline minRows={2} value={form.message2 || ''} onChange={e => setForm(f => ({ ...f, message2: e.target.value }))} />
        <TextField fullWidth label="Mensagem 3" margin="normal" multiline minRows={2} value={form.message3 || ''} onChange={e => setForm(f => ({ ...f, message3: e.target.value }))} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}

export function CampanhasPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Campaign>>({})
  const [confirm, setConfirm] = useState<Campaign | null>(null)

  const { data: campanhas = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => (await listCampaigns()).data
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  })

  const startMut = useMutation({
    mutationFn: startCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      enqueueSnackbar('Campanha iniciada', { variant: 'success' })
    }
  })

  const cancelMut = useMutation({
    mutationFn: cancelCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      enqueueSnackbar('Campanha cancelada', { variant: 'info' })
    }
  })

  return (
    <AdminOnly profile={profile}>
      <PageHeader title="Campanhas" action={<Button variant="contained" onClick={() => { setEditing({}); setDialogOpen(true) }}>Adicionar</Button>} />
      {isLoading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campanhas.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell><Chip label={c.status} size="small" /></TableCell>
                  <TableCell align="center">
                    <IconButton component={Link} to={`/campanhas/${c.id}`}><PeopleIcon /></IconButton>
                    {['pending', 'canceled'].includes(c.status) && (
                      <IconButton color="success" onClick={() => startMut.mutate(c.id)}><PlayArrowIcon /></IconButton>
                    )}
                    {['scheduled', 'processing'].includes(c.status) && (
                      <IconButton color="warning" onClick={() => cancelMut.mutate(c.id)}><StopIcon /></IconButton>
                    )}
                    <IconButton onClick={() => { setEditing(c); setDialogOpen(true) }}><EditIcon /></IconButton>
                    <IconButton color="error" onClick={() => setConfirm(c)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <CampaignDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })} />
      <ConfirmDialog open={Boolean(confirm)} title="Excluir campanha?" message={`Excluir "${confirm?.name}"?`} onCancel={() => setConfirm(null)} onConfirm={() => confirm && removeMutation.mutate(confirm.id)} />
    </AdminOnly>
  )
}

export function CampanhaContatosPage() {
  const profile = localStorage.getItem('profile')
  const { campanhaId } = useParams()
  const id = Number(campanhaId)
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact[]>([])

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['campaign-contacts', id],
    enabled: Boolean(id),
    queryFn: async () => (await listCampaignContacts(id)).data
  })

  const searchContacts = async () => {
    if (search.length < 2) return
    const { data } = await listContacts({ searchParam: search, pageNumber: 1 })
    setOptions(data.contacts.filter(c => !contacts.some(cc => cc.id === c.id)))
  }

  const addContacts = async () => {
    if (!selected.length) return
    try {
      await addCampaignContacts(id, selected.map(c => ({ contactId: c.id, campaignId: id })))
      enqueueSnackbar('Contatos adicionados', { variant: 'success' })
      setAddOpen(false)
      setSelected([])
      queryClient.invalidateQueries({ queryKey: ['campaign-contacts', id] })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  const removeContact = async (contactId: number) => {
    try {
      await removeCampaignContact(id, contactId)
      queryClient.invalidateQueries({ queryKey: ['campaign-contacts', id] })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  const clearAll = async () => {
    try {
      await clearCampaignContacts(id)
      queryClient.invalidateQueries({ queryKey: ['campaign-contacts', id] })
      enqueueSnackbar('Campanha limpa', { variant: 'info' })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title={`Contatos da Campanha #${id}`}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setAddOpen(true)}>Incluir</Button>
            <Button color="error" variant="outlined" onClick={clearAll}>Limpar</Button>
            <Button component={Link} to="/campanhas">Voltar</Button>
          </Box>
        }
      />
      {isLoading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Número</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.number}</TableCell>
                  <TableCell align="center">
                    <IconButton color="error" onClick={() => removeContact(c.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar contatos</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Buscar contato"
            margin="normal"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchContacts()}
          />
          <Button sx={{ mb: 2 }} onClick={searchContacts}>Buscar</Button>
          {options.map(c => (
            <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <input
                type="checkbox"
                checked={selected.some(s => s.id === c.id)}
                onChange={e => {
                  if (e.target.checked) setSelected(prev => [...prev, c])
                  else setSelected(prev => prev.filter(x => x.id !== c.id))
                }}
              />
              <Typography variant="body2">{c.name} — {c.number}</Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={addContacts}>Adicionar {selected.length ? `(${selected.length})` : ''}</Button>
        </DialogActions>
      </Dialog>
    </AdminOnly>
  )
}
