import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
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
import { Edit, Trash2, RefreshCw, Upload, Download, Plus, MinusCircle } from 'lucide-react'
import { ActionIconButton } from '@/components/icons/ActionIconButton'
import { ChannelLogo } from '@/components/atendimento/ChannelLogo'
import { StartContactTicketDialog } from '@/components/contatos/StartContactTicketDialog'
import { useSnackbar } from 'notistack'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  createContact,
  deleteContact,
  exportContacts,
  importContactsCsv,
  listContacts,
  syncContacts,
  updateContact
} from '@/api/contacts'
import { listTags } from '@/api/tags'
import { listUsers } from '@/api/users'
import type { Contact, Tag, User } from '@/types/entities'

function ContactDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<Contact>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<Contact>>({
    name: '',
    number: '',
    email: '',
    extraInfo: []
  })
  const { enqueueSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        name: '',
        number: '',
        email: '',
        ...initial,
        extraInfo: initial.extraInfo?.length ? [...initial.extraInfo] : []
      })
    }
  }, [open, initial])

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        ...form,
        extraInfo: (form.extraInfo || []).filter(info => info.name?.trim() || info.value?.trim())
      }
      if (form.id) await updateContact(form.id, payload)
      else await createContact(payload)
      enqueueSnackbar('Contato salvo', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const updateExtraInfo = (index: number, field: 'name' | 'value', value: string) => {
    setForm(f => {
      const extraInfo = [...(f.extraInfo || [])]
      extraInfo[index] = { ...extraInfo[index], [field]: value }
      return { ...f, extraInfo }
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Novo'} Contato</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>Dados do contato</Typography>
        <TextField fullWidth label="Nome" margin="normal" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <TextField fullWidth label="Número" margin="normal" value={form.number || ''} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} helperText="Informe número com DDI e DDD" />
        <TextField fullWidth label="E-mail" margin="normal" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 1 }}>
          <Typography variant="subtitle2">Informações adicionais</Typography>
          <Button
            size="small"
            startIcon={<Plus size={16} strokeWidth={2.25} />}
            onClick={() => setForm(f => ({ ...f, extraInfo: [...(f.extraInfo || []), { name: '', value: '' }] }))}
          >
            Adicionar
          </Button>
        </Box>
        {(form.extraInfo || []).map((info, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
            <TextField
              label="Descrição"
              size="small"
              value={info.name}
              onChange={e => updateExtraInfo(index, 'name', e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Informação"
              size="small"
              value={info.value}
              onChange={e => updateExtraInfo(index, 'value', e.target.value)}
              sx={{ flex: 1 }}
            />
            <IconButton
              color="error"
              onClick={() =>
                setForm(f => ({
                  ...f,
                  extraInfo: (f.extraInfo || []).filter((_, i) => i !== index)
                }))
              }
            >
              <MinusCircle size={18} strokeWidth={2} />
            </IconButton>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}

function ImportContactsDialog({
  open,
  onClose,
  onImport,
  loading
}: {
  open: boolean
  onClose: () => void
  onImport: (file: File, tags: number[], wallets: number[]) => void
  loading: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [tags, setTags] = useState<number[]>([])
  const [wallets, setWallets] = useState<number[]>([])

  const { data: tagOptions = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await listTags(true)).data as Tag[],
    enabled: open
  })

  const { data: userOptions = [] } = useQuery({
    queryKey: ['users-import'],
    queryFn: async () => (await listUsers()).data.users as User[],
    enabled: open
  })

  useEffect(() => {
    if (!open) {
      setFile(null)
      setTags([])
      setWallets([])
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importar contatos (CSV)</DialogTitle>
      <DialogContent>
        <Button variant="outlined" component="label" fullWidth sx={{ mt: 1, mb: 2 }}>
          {file ? file.name : 'Selecionar arquivo CSV'}
          <input
            hidden
            type="file"
            accept=".csv"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
        </Button>
        <FormControl fullWidth margin="normal">
          <InputLabel>Etiquetas</InputLabel>
          <Select
            multiple
            value={tags}
            onChange={e => setTags(e.target.value as number[])}
            input={<OutlinedInput label="Etiquetas" />}
            renderValue={selected =>
              tagOptions.filter(t => selected.includes(t.id)).map(t => t.tag).join(', ')
            }
          >
            {tagOptions.map(tag => (
              <MenuItem key={tag.id} value={tag.id}>
                <Checkbox checked={tags.includes(tag.id)} />
                <ListItemText primary={tag.tag} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Carteira</InputLabel>
          <Select
            multiple
            value={wallets}
            onChange={e => setWallets((e.target.value as number[]).slice(-1))}
            input={<OutlinedInput label="Carteira" />}
            renderValue={selected =>
              userOptions.filter(u => selected.includes(u.id)).map(u => u.name).join(', ')
            }
          >
            {userOptions.map(user => (
              <MenuItem key={user.id} value={user.id}>
                <Checkbox checked={wallets.includes(user.id)} />
                <ListItemText primary={user.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!file || loading}
          onClick={() => file && onImport(file, tags, wallets)}
        >
          Importar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function ContatosPage() {
  const location = useLocation()
  const isChatContact = location.pathname.includes('/atendimento/contatos')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Contact>>({})
  const [confirm, setConfirm] = useState<Contact | null>(null)
  const [startTicket, setStartTicket] = useState<{ contact: Contact; channel: string } | null>(null)
  const fileImportRef = useRef<HTMLInputElement>(null)
  const loadMoreRef = useRef<HTMLTableRowElement>(null)

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['contacts', search],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (await listContacts({ searchParam: search, pageNumber: pageParam })).data,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length + 1 : undefined)
  })

  const contacts = data?.pages.flatMap(page => page.contacts) ?? []
  const totalCount = data?.pages[0]?.count

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasNextPage) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '120px' }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, contacts.length])

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      enqueueSnackbar('Contato deletado', { variant: 'success' })
      setConfirm(null)
    }
  })

  const syncMutation = useMutation({
    mutationFn: syncContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      enqueueSnackbar('Sincronização iniciada', { variant: 'info' })
    }
  })

  const importMutation = useMutation({
    mutationFn: ({ file, tags, wallets }: { file: File; tags: number[]; wallets: number[] }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (tags.length) formData.append('tags', tags.join(','))
      if (wallets.length) formData.append('wallets', wallets.join(','))
      return importContactsCsv(formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      enqueueSnackbar('Contatos importados com sucesso', { variant: 'success' })
      setImportOpen(false)
    },
    onError: (err: unknown) => {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao importar', { variant: 'error' })
    }
  })

  const downloadModelCsv = () => {
    const csvContent = 'nome;numero\nCliente;5511999999999'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'modelo.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleExport = async () => {
    try {
      const { data } = await exportContacts()
      const link = document.createElement('a')
      link.href = data.downloadLink
      link.download = 'contatos.xlsx'
      link.click()
      enqueueSnackbar('Exportação iniciada', { variant: 'success' })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao exportar', { variant: 'error' })
    }
  }

  return (
    <>
      <PageHeader
        title="Contatos"
        action={
          !isChatContact ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" onClick={downloadModelCsv}>Modelo CSV</Button>
            <Button size="small" startIcon={<Upload size={16} strokeWidth={2} />} onClick={() => setImportOpen(true)} disabled={importMutation.isPending}>
              Importar CSV
            </Button>
            <Button size="small" startIcon={<Download size={16} strokeWidth={2} />} onClick={handleExport}>
              Exportar XLSX
            </Button>
            <Button startIcon={<RefreshCw size={16} strokeWidth={2} />} onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              Importar WhatsApp
            </Button>
            <Button variant="contained" onClick={() => { setEditing({}); setDialogOpen(true) }}>
              Adicionar
            </Button>
            <input ref={fileImportRef} type="file" accept=".csv" hidden />
          </Box>
          ) : undefined
        }
      />
      {totalCount != null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Exibindo {contacts.length} de {totalCount}
        </Typography>
      )}
      <TextField
        fullWidth
        placeholder="Localizar contato..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 400 }}
      />
      {isLoading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: isChatContact ? 'calc(100vh - 220px)' : undefined }}>
          <Table stickyHeader={isChatContact}>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Nome</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map(contact => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Avatar src={contact.profilePicUrl}>{contact.name?.[0]}</Avatar>
                  </TableCell>
                  <TableCell>{contact.name}</TableCell>
                  <TableCell>{contact.number}</TableCell>
                  <TableCell>{contact.email || '—'}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {contact.number && (
                        <ActionIconButton
                          title="Conversar no WhatsApp"
                          onClick={() => setStartTicket({ contact, channel: 'whatsapp' })}
                        >
                          <ChannelLogo channel="whatsapp" size={20} />
                        </ActionIconButton>
                      )}
                      {contact.instagramPK != null && Number(contact.instagramPK) > 0 && (
                        <ActionIconButton
                          title="Conversar no Instagram"
                          onClick={() => setStartTicket({ contact, channel: 'instagram' })}
                        >
                          <ChannelLogo channel="instagram" size={20} />
                        </ActionIconButton>
                      )}
                      {contact.telegramId && (
                        <ActionIconButton
                          title="Conversar no Telegram"
                          onClick={() => setStartTicket({ contact, channel: 'telegram' })}
                        >
                          <ChannelLogo channel="telegram" size={20} />
                        </ActionIconButton>
                      )}
                      <ActionIconButton title="Editar contato" onClick={() => { setEditing(contact); setDialogOpen(true) }}>
                        <Edit size={17} strokeWidth={2.25} />
                      </ActionIconButton>
                      {!isChatContact && (
                        <ActionIconButton title="Excluir contato" onClick={() => setConfirm(contact)} sx={{ color: 'error.main' }}>
                          <Trash2 size={17} strokeWidth={2.25} />
                        </ActionIconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {hasNextPage && (
                <TableRow ref={loadMoreRef}>
                  <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                    {isFetchingNextPage ? <CircularProgress size={24} /> : 'Carregar mais...'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <ContactDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })} />
      <ImportContactsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        loading={importMutation.isPending}
        onImport={(file, tags, wallets) => {
          enqueueSnackbar('Isso pode demorar um pouco. A lista será atualizada ao finalizar.', { variant: 'warning' })
          importMutation.mutate({ file, tags, wallets })
        }}
      />
      <ConfirmDialog open={Boolean(confirm)} title="Atenção" message={`Deletar contato "${confirm?.name}"?`} onCancel={() => setConfirm(null)} onConfirm={() => confirm && removeMutation.mutate(confirm.id)} loading={removeMutation.isPending} />
      <StartContactTicketDialog
        contact={startTicket?.contact ?? null}
        channel={startTicket?.channel ?? null}
        open={Boolean(startTicket)}
        onClose={() => setStartTicket(null)}
      />
    </>
  )
}
