import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useSnackbar } from 'notistack'
import { updateContact, updateContactTags, updateContactWallet } from '@/api/contacts'
import { listTags } from '@/api/tags'
import { listUsers } from '@/api/users'
import type { Contact, Ticket } from '@/types/entities'

function ContactEditDialog({
  open,
  contact,
  onClose,
  onSaved
}: {
  open: boolean
  contact: Contact
  onClose: () => void
  onSaved: (c: Contact) => void
}) {
  const [form, setForm] = useState(contact)
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    if (open) setForm(contact)
  }, [open, contact])

  const save = async () => {
    try {
      const { data } = await updateContact(form.id, form)
      enqueueSnackbar('Contato atualizado', { variant: 'success' })
      onSaved(data)
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar contato</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Nome" margin="normal" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <TextField fullWidth label="Número" margin="normal" value={form.number || ''} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
        <TextField fullWidth label="E-mail" margin="normal" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}

interface ContactDrawerProps {
  open: boolean
  ticket: Ticket | null
  onClose: () => void
  onContactUpdated: (contact: Contact) => void
  onOpenLogs: () => void
}

export function ContactDrawer({ open, ticket, onClose, onContactUpdated, onOpenLogs }: ContactDrawerProps) {
  const contact = ticket?.contact
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [tagIds, setTagIds] = useState<number[]>([])
  const [walletId, setWalletId] = useState<number | ''>('')

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await listTags(true)).data,
    enabled: open
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users-drawer'],
    queryFn: async () => (await listUsers()).data.users,
    enabled: open
  })

  useEffect(() => {
    if (contact && open) {
      setTagIds(contact.tags?.map(t => t.id) || [])
      setWalletId(contact.wallets?.[0]?.id ?? '')
    }
  }, [contact, open])

  if (!contact) return null

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    enqueueSnackbar('Copiado', { variant: 'info' })
  }

  const saveTags = async (ids: number[]) => {
    setTagIds(ids)
    try {
      await updateContactTags(contact.id, ids)
      const updated = { ...contact, tags: tags.filter(t => ids.includes(t.id)) }
      onContactUpdated(updated)
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao salvar etiquetas', { variant: 'error' })
    }
  }

  const saveWallet = async (id: number | '') => {
    setWalletId(id)
    try {
      await updateContactWallet(contact.id, id ? [id] : [])
      const updated = {
        ...contact,
        wallets: id ? users.filter(u => u.id === id).map(u => ({ id: u.id, name: u.name })) : []
      }
      onContactUpdated(updated)
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao salvar carteira', { variant: 'error' })
    }
  }

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 360 } } } }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Dados do contato</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ p: 2, overflow: 'auto' }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Avatar src={contact.profilePicUrl} sx={{ width: 96, height: 96, mx: 'auto', mb: 1 }}>
              {contact.name?.[0]}
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{contact.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">{contact.number}</Typography>
              <IconButton size="small" onClick={() => copy(contact.number)}><ContentCopyIcon fontSize="small" /></IconButton>
            </Box>
            {contact.email && (
              <Typography variant="body2" color="text.secondary">{contact.email}</Typography>
            )}
            <Button sx={{ mt: 1 }} size="small" onClick={() => setEditOpen(true)}>Editar contato</Button>
          </Box>

          <Button fullWidth variant="outlined" sx={{ mb: 2 }} onClick={onOpenLogs}>
            Ver logs do ticket
          </Button>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Etiquetas</InputLabel>
            <Select
              multiple
              label="Etiquetas"
              value={tagIds}
              onChange={e => saveTags(e.target.value as number[])}
              renderValue={selected =>
                tags.filter(t => selected.includes(t.id)).map(t => t.tag).join(', ') || '—'
              }
            >
              {tags.map(tag => (
                <MenuItem key={tag.id} value={tag.id}>
                  <Checkbox checked={tagIds.includes(tag.id)} />
                  <ListItemText primary={tag.tag} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Carteira</InputLabel>
            <Select
              label="Carteira"
              value={walletId === '' ? '' : String(walletId)}
              onChange={e => {
                const v = e.target.value as string
                saveWallet(v === '' ? '' : Number(v))
              }}
            >
              <MenuItem value="">Nenhum</MenuItem>
              {users.map(u => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Drawer>

      <ContactEditDialog
        open={editOpen}
        contact={contact}
        onClose={() => setEditOpen(false)}
        onSaved={onContactUpdated}
      />
    </>
  )
}
