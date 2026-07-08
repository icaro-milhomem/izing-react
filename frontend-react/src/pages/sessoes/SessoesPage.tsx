import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/Edit'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import QrCodeIcon from '@mui/icons-material/QrCode'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ChannelLogo } from '@/components/atendimento/ChannelLogo'
import { WhatsappQrDialog } from '@/components/whatsapp/WhatsappQrDialog'
import { FacebookConnectButton } from '@/components/whatsapp/FacebookConnectButton'
import { resolveBackendError } from '@/api/backendErrors'
import { buildHubChannelPayload, createHubChannels, listHubChannels, type HubChannelOption } from '@/api/hub'
import { uploadFile } from '@/api/upload'
import {
  buildWhatsappPayload,
  createWhatsapp,
  deleteWhatsapp,
  deleteWhatsappSession,
  getWhatsapp,
  listWhatsapps,
  requestNewQrCode,
  startWhatsappSession,
  updateWhatsapp
} from '@/api/whatsapp'
import { listQueues } from '@/api/queues'
import { listChatFlows } from '@/api/chatFlow'
import { useWhatsappStore } from '@/store/whatsappStore'
import type { WhatsappSession } from '@/types/entities'
import { resolveMediaUrl } from '@/utils/mediaUrl'

function mergeSessions(apiSessions: WhatsappSession[], storeSessions: WhatsappSession[]) {
  if (!storeSessions.length) return apiSessions
  return apiSessions.map(item => {
    const live = storeSessions.find(s => s.id === item.id)
    return live ? { ...item, ...live } : item
  })
}

function isPairingCode(code: string) {
  return code.length <= 12 && !code.includes(',') && !code.includes('@')
}

function statusColor(status: string) {
  if (status === 'CONNECTED') return 'success'
  if (status === 'DISCONNECTED') return 'error'
  if (status === 'qrcode' || status === 'OPENING') return 'warning'
  return 'default'
}

function emptyForm(): Partial<WhatsappSession> {
  return {
    name: '',
    type: 'whatsapp',
    logo: '',
    farewellMessage: '',
    wavoip: '',
    tokenTelegram: '',
    instagramUser: '',
    instagramKey: '',
    wabaBSP: '360',
    tokenAPI: '',
    isDefault: false
  }
}

function isHubFormType(type?: string) {
  return type === 'hub' || Boolean(type?.includes('hub'))
}

function ChannelDialog({
  open,
  channelId,
  onClose,
  onSaved
}: {
  open: boolean
  channelId?: number
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<WhatsappSession>>(emptyForm())
  const [existing, setExisting] = useState<Partial<WhatsappSession> | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [hubOptions, setHubOptions] = useState<HubChannelOption[]>([])
  const [selectedHubId, setSelectedHubId] = useState('')
  const [hubLoading, setHubLoading] = useState(false)
  const [instagramEditPassword, setInstagramEditPassword] = useState(false)
  const [showInstagramPassword, setShowInstagramPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    if (!open || channelId || form.type !== 'hub') return

    let cancelled = false
    setHubLoading(true)
    listHubChannels()
      .then(res => {
        if (cancelled) return
        const options = (res.data || []).filter(
          hub => hub.channel === 'facebook' || hub.channel === 'instagram'
        )
        setHubOptions(options)
      })
      .catch(err => {
        if (!cancelled) {
          enqueueSnackbar(
            resolveBackendError(err) ||
              'Erro ao listar hubs. Verifique o token Notificame em Configurações.',
            { variant: 'error' }
          )
        }
      })
      .finally(() => {
        if (!cancelled) setHubLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, channelId, form.type, enqueueSnackbar])

  useEffect(() => {
    if (!open) return

    if (!channelId) {
      setForm(emptyForm())
      setExisting(null)
      setSelectedHubId('')
      setInstagramEditPassword(false)
      setShowInstagramPassword(false)
      return
    }

    let cancelled = false
    setLoadingDetails(true)
    getWhatsapp(channelId)
      .then(res => {
        if (cancelled) return
        setForm(res.data)
        setExisting(res.data)
        setInstagramEditPassword(false)
        setShowInstagramPassword(false)
      })
      .catch(err => {
        if (!cancelled) {
          enqueueSnackbar(resolveBackendError(err) || 'Erro ao carregar canal', { variant: 'error' })
          onClose()
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, channelId, enqueueSnackbar, onClose])

  const handleLogoUpload = async (file: File | null) => {
    if (!file) {
      setForm(f => ({ ...f, logo: '' }))
      return
    }

    setUploadingLogo(true)
    try {
      const { fullUrl } = await uploadFile(file)
      setForm(f => ({ ...f, logo: fullUrl }))
      enqueueSnackbar('Logo enviada', { variant: 'success' })
    } catch (err: unknown) {
      enqueueSnackbar(resolveBackendError(err) || 'Erro ao enviar logo', { variant: 'error' })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    const name = form.name?.trim()
    if (!name || name.length < 2) {
      enqueueSnackbar('Informe um nome com pelo menos 2 caracteres', { variant: 'warning' })
      return
    }

    if (form.type === 'instagram') {
      if (!form.instagramUser?.trim()) {
        enqueueSnackbar('Informe o usuário do Instagram', { variant: 'warning' })
        return
      }
      if (!channelId && !form.instagramKey?.trim()) {
        enqueueSnackbar('Informe a senha do Instagram', { variant: 'warning' })
        return
      }
    }

    if (form.type === 'waba') {
      if (!form.wabaBSP || !form.tokenAPI?.trim()) {
        enqueueSnackbar('WABA: informe a BSP e o Token API', { variant: 'warning' })
        return
      }
    }

    if (form.type === 'telegram' && !channelId && !form.tokenTelegram?.trim()) {
      enqueueSnackbar('Informe o token do Telegram', { variant: 'warning' })
      return
    }

    if (form.type === 'hub' && !channelId && !selectedHubId) {
      enqueueSnackbar('Selecione um canal Hub Notificame', { variant: 'warning' })
      return
    }

    setSaving(true)
    try {
      if (form.type === 'hub' && !channelId) {
        const selectedHub = hubOptions.find(h => h.id === selectedHubId)!
        await createHubChannels([buildHubChannelPayload(name, selectedHub)])
        enqueueSnackbar('Canal Hub adicionado com sucesso', { variant: 'success' })
      } else if (channelId) {
        const payload = buildWhatsappPayload(form, existing || undefined)
        await updateWhatsapp(channelId, payload)
        enqueueSnackbar('Canal editado com sucesso', { variant: 'success' })
      } else {
        const payload = buildWhatsappPayload(form, existing || undefined)
        await createWhatsapp(payload)
        enqueueSnackbar('Canal criado com sucesso', { variant: 'success' })
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar(
        resolveBackendError(err) ||
          'Não foi possível salvar. O nome da conexão deve ser único na plataforma.',
        { variant: 'error' }
      )
    } finally {
      setSaving(false)
    }
  }

  const logoPreview = resolveMediaUrl(form.logo)
  const isHub = isHubFormType(form.type)
  const isCreateHub = form.type === 'hub' && !channelId

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ChannelLogo channel={form.type} logo={form.logo} size={40} />
        {channelId ? 'Editar' : 'Adicionar'} Canal
      </DialogTitle>
      <DialogContent>
        {loadingDetails ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <FormControl fullWidth margin="normal">
              <InputLabel>Tipo</InputLabel>
              <Select
                label="Tipo"
                value={form.type || 'whatsapp'}
                disabled={Boolean(channelId)}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="telegram">Telegram</MenuItem>
                <MenuItem value="hub">Hub Notificame</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="messenger">Messenger</MenuItem>
                <MenuItem value="waba">WhatsApp Business (WABA)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Nome"
              margin="normal"
              value={form.name || ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            {isCreateHub && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Canal Notificame</InputLabel>
                <Select
                  label="Canal Notificame"
                  value={selectedHubId}
                  disabled={hubLoading}
                  onChange={e => setSelectedHubId(String(e.target.value))}
                >
                  {hubLoading && (
                    <MenuItem value="" disabled>
                      Carregando canais...
                    </MenuItem>
                  )}
                  {!hubLoading && hubOptions.length === 0 && (
                    <MenuItem value="" disabled>
                      Nenhum canal Hub disponível
                    </MenuItem>
                  )}
                  {hubOptions.map(hub => (
                    <MenuItem key={hub.id} value={hub.id}>
                      {hub.name} ({hub.channel})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {form.type === 'telegram' && (
              <TextField
                fullWidth
                label="Token Telegram"
                margin="normal"
                value={form.tokenTelegram || ''}
                onChange={e => setForm(f => ({ ...f, tokenTelegram: e.target.value }))}
              />
            )}
            {form.type === 'whatsapp' && (
              <TextField
                fullWidth
                label="Wavoip chamadas WhatsApp"
                margin="normal"
                value={form.wavoip || ''}
                onChange={e => setForm(f => ({ ...f, wavoip: e.target.value }))}
              />
            )}
            {form.type === 'instagram' && (
              <>
                <TextField
                  fullWidth
                  label="Usuário Instagram"
                  margin="normal"
                  value={form.instagramUser || ''}
                  helperText="Seu usuário do Instagram (sem @)"
                  onChange={e => setForm(f => ({ ...f, instagramUser: e.target.value }))}
                />
                {channelId && !instagramEditPassword ? (
                  <Button sx={{ mt: 1 }} onClick={() => setInstagramEditPassword(true)}>
                    Alterar senha
                  </Button>
                ) : (
                  <TextField
                    fullWidth
                    label="Senha Instagram"
                    margin="normal"
                    type={showInstagramPassword ? 'text' : 'password'}
                    value={form.instagramKey || ''}
                    helperText="Senha utilizada para logar no Instagram"
                    onChange={e => setForm(f => ({ ...f, instagramKey: e.target.value }))}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <IconButton
                            edge="end"
                            onClick={() => setShowInstagramPassword(v => !v)}
                            aria-label="mostrar senha"
                          >
                            {showInstagramPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        )
                      }
                    }}
                  />
                )}
              </>
            )}
            {form.type === 'waba' && (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>BSP</InputLabel>
                  <Select
                    label="BSP"
                    value={form.wabaBSP || '360'}
                    onChange={e => setForm(f => ({ ...f, wabaBSP: e.target.value }))}
                  >
                    <MenuItem value="360">360dialog</MenuItem>
                    <MenuItem value="gupshup">Gupshup</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Token API (D360-API-KEY)"
                  margin="normal"
                  value={form.tokenAPI || ''}
                  onChange={e => setForm(f => ({ ...f, tokenAPI: e.target.value }))}
                />
              </>
            )}
            {form.type === 'messenger' && !channelId && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Após criar o canal, use o botão &quot;Vincular Facebook&quot; no card para conectar a página.
              </Typography>
            )}
            {!isHub && (
              <TextField
                fullWidth
                label="Mensagem de despedida"
                margin="normal"
                multiline
                minRows={3}
                value={form.farewellMessage || ''}
                onChange={e => setForm(f => ({ ...f, farewellMessage: e.target.value }))}
              />
            )}
            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Switch
                  checked={Boolean(form.isDefault)}
                  onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                />
              }
              label="Canal padrão"
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Logo do canal (opcional)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  const file = e.target.files?.[0] ?? null
                  void handleLogoUpload(file)
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={uploadingLogo ? <CircularProgress size={16} /> : <ImageOutlinedIcon />}
                  disabled={uploadingLogo || saving}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {form.logo ? 'Trocar logo' : 'Enviar logo'}
                </Button>
                {form.logo && (
                  <Button
                    color="inherit"
                    disabled={uploadingLogo || saving}
                    onClick={() => {
                      setForm(f => ({ ...f, logo: '' }))
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    Remover
                  </Button>
                )}
              </Box>
              {logoPreview && (
                <Box
                  component="img"
                  src={logoPreview}
                  alt="Logo do canal"
                  sx={{ mt: 1.5, maxWidth: 100, maxHeight: 100, borderRadius: 1, border: 1, borderColor: 'divider' }}
                />
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={uploadingLogo || saving || loadingDetails}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </Box>
    </Dialog>
  )
}

export function SessoesPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const deleteSessionFromStore = useWhatsappStore(s => s.deleteSession)
  const [qrSession, setQrSession] = useState<WhatsappSession | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<WhatsappSession | null>(null)
  const [deleting, setDeleting] = useState(false)
  const storeSessions = useWhatsappStore(s => s.sessions)

  const { data: canaisRaw = [], isLoading } = useQuery({
    queryKey: ['whatsapps'],
    queryFn: async () => (await listWhatsapps()).data
  })

  const canais = mergeSessions(canaisRaw, storeSessions)

  const { data: filas = [] } = useQuery({ queryKey: ['queues'], queryFn: async () => (await listQueues()).data })
  const { data: flows = [] } = useQuery({ queryKey: ['chatFlows'], queryFn: async () => (await listChatFlows()).data })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['whatsapps'] })

  const startSession = useMutation({
    mutationFn: (id: number) => startWhatsappSession(id),
    onSuccess: () => {
      refresh()
      enqueueSnackbar('Conectando...', { variant: 'info' })
    }
  })

  const newQr = useMutation({
    mutationFn: (id: number) => requestNewQrCode(id),
    onSuccess: () => refresh()
  })

  const disconnect = useMutation({
    mutationFn: (id: number) => deleteWhatsappSession(id),
    onSuccess: () => {
      refresh()
      enqueueSnackbar('Sessão encerrada', { variant: 'info' })
    }
  })

  const saveChannel = async (item: WhatsappSession, patch: Partial<WhatsappSession>) => {
    try {
      const payload = buildWhatsappPayload({ ...item, ...patch }, item)
      await updateWhatsapp(item.id, payload)
      refresh()
    } catch (err: unknown) {
      enqueueSnackbar(resolveBackendError(err) || 'Erro ao salvar canal', { variant: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteWhatsapp(deleteTarget.id)
      deleteSessionFromStore(deleteTarget.id)
      enqueueSnackbar('Canal excluído', { variant: 'success' })
      setDeleteTarget(null)
      refresh()
    } catch (err: unknown) {
      enqueueSnackbar(resolveBackendError(err) || 'Erro ao excluir canal', { variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const openCreateDialog = () => {
    setEditingId(undefined)
    setDialogOpen(true)
  }

  const openEditDialog = (item: WhatsappSession) => {
    setEditingId(item.id)
    setDialogOpen(true)
  }

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title="Canais"
        subtitle="Conexões WhatsApp e outros canais"
        action={
          <Button variant="contained" onClick={openCreateDialog}>
            Adicionar
          </Button>
        }
      />
      {isLoading ? (
        <CircularProgress />
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {canais.map(item => (
            <Box key={item.id} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 11px)' } }}>
              <Card sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0 }}>
                      <ChannelLogo channel={item.type} logo={item.logo} size={40} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" noWrap>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.type}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Editar canal">
                        <IconButton onClick={() => openEditDialog(item)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir conexão">
                        <IconButton color="error" onClick={() => setDeleteTarget(item)}>
                          <DeleteOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Chip label={item.status} color={statusColor(item.status) as 'success' | 'error' | 'warning' | 'default'} size="small" sx={{ mt: 1 }} />
                  {item.number && (
                    <Typography variant="body2" sx={{ mt: 1 }}>Número: {item.number}</Typography>
                  )}
                  {item.type === 'messenger' && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Página: {item.fbObject?.name || 'Nenhuma página configurada.'}
                    </Typography>
                  )}
                  <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <InputLabel>Fila</InputLabel>
                    <Select
                      label="Fila"
                      value={item.queueId ?? ''}
                      onChange={e => saveChannel(item, { queueId: Number(e.target.value) || null })}
                    >
                      <MenuItem value="">Nenhuma</MenuItem>
                      {filas.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.queue}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {!item.type.includes('hub') && (
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                      <InputLabel>Bot</InputLabel>
                      <Select
                        label="Bot"
                        value={item.chatFlowId ?? ''}
                        onChange={e => saveChannel(item, { chatFlowId: Number(e.target.value) || null })}
                      >
                        <MenuItem value="">Nenhum</MenuItem>
                        {flows.map(f => (
                          <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </CardContent>
                <CardActions sx={{ flexWrap: 'wrap', gap: 1, p: 2 }}>
                  {item.type === 'whatsapp' && (item.status === 'qrcode' || (item.status === 'OPENING' && item.qrcode)) && (
                    <Button startIcon={<QrCodeIcon />} onClick={() => setQrSession(item)}>
                      {item.qrcode && isPairingCode(item.qrcode) ? 'Ver código' : 'QR Code'}
                    </Button>
                  )}
                  {item.type === 'messenger' && !item.fbObject?.name && (
                    <FacebookConnectButton channel={item} onConnected={refresh} />
                  )}
                  {item.status === 'OPENING' && !item.qrcode && item.type !== 'messenger' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">Conectando...</Typography>
                    </Box>
                  )}
                  {item.status === 'DISCONNECTED' && !isHubFormType(item.type) && item.type !== 'messenger' && (
                    <>
                      <Button variant="contained" color="success" onClick={() => startSession.mutate(item.id)}>
                        Conectar
                      </Button>
                      {item.type === 'whatsapp' && (
                        <Button onClick={() => newQr.mutate(item.id)}>Novo QR</Button>
                      )}
                    </>
                  )}
                  {item.status === 'CONNECTED' && !isHubFormType(item.type) && item.type !== 'messenger' && (
                    <Button color="error" onClick={() => disconnect.mutate(item.id)}>
                      Desconectar
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      )}
      <WhatsappQrDialog
        session={qrSession}
        open={Boolean(qrSession)}
        onClose={() => setQrSession(null)}
        onRequestNewQr={
          qrSession
            ? () => {
                newQr.mutate(qrSession.id)
              }
            : undefined
        }
      />
      <ChannelDialog
        open={dialogOpen}
        channelId={editingId}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir conexão?"
        message="Não é uma boa ideia apagar se já tiver gerado atendimentos para este canal."
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </AdminOnly>
  )
}
