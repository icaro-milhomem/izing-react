import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Link,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { resolveApiUrl } from '@/api/resolveApiUrl'
import { listWhatsapps } from '@/api/whatsapp'
import {
  createApiConfig,
  deleteApiConfig,
  listApiConfigs,
  renewApiToken,
  updateApiConfig,
  type ApiConfig
} from '@/api/apiConfig'

function buildIntegrationUrl(apiId: string) {
  return `${resolveApiUrl()}/v1/api/external/${apiId}`
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  document.body.removeChild(area)
}

function ApiDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<ApiConfig>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<ApiConfig>>(initial)
  const [saving, setSaving] = useState(false)
  const { enqueueSnackbar } = useSnackbar()

  const { data: whatsapps = [] } = useQuery({
    queryKey: ['whatsapps'],
    queryFn: async () => (await listWhatsapps()).data,
    enabled: open
  })

  const sessions = useMemo(
    () => whatsapps.filter(item => item.type === 'whatsapp'),
    [whatsapps]
  )

  useEffect(() => {
    if (!open) return
    setForm(
      initial.id
        ? { ...initial }
        : {
            name: '',
            sessionId: sessions.length === 1 ? sessions[0].id : undefined,
            urlServiceStatus: '',
            urlMessageStatus: '',
            authToken: '',
            isActive: true
          }
    )
  }, [open, initial, sessions])

  const save = async () => {
    if (!form.name?.trim()) {
      enqueueSnackbar('Informe o nome da API', { variant: 'warning' })
      return
    }
    if (!form.sessionId) {
      enqueueSnackbar('Selecione o canal de envio', { variant: 'warning' })
      return
    }

    setSaving(true)
    try {
      if (form.id) {
        await updateApiConfig(form as ApiConfig)
      } else {
        await createApiConfig(form)
      }
      enqueueSnackbar('API salva', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao salvar API', { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Criar'} configuração API</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" sx={{ mt: 1, mb: 1.5, fontWeight: 700 }}>
          Dados API
        </Typography>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Nome da API"
            value={form.name || ''}
            onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
          />
          <TextField
            fullWidth
            select
            label="Enviar por"
            value={form.sessionId ?? ''}
            onChange={e => setForm(current => ({ ...current, sessionId: Number(e.target.value) }))}
            helperText={sessions.length === 0 ? 'Nenhum canal WhatsApp disponível' : undefined}
          >
            {sessions.map(session => (
              <MenuItem key={session.id} value={session.id}>
                {session.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, fontWeight: 700 }}>
          WebHook
        </Typography>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="URL WebHook Status Sessão"
            value={form.urlServiceStatus || ''}
            onChange={e => setForm(current => ({ ...current, urlServiceStatus: e.target.value }))}
            helperText="Dispara sempre que o status da sessão conectada ao WhatsApp é alterado."
          />
          <TextField
            fullWidth
            label="URL WebHook Status Mensagem"
            value={form.urlMessageStatus || ''}
            onChange={e => setForm(current => ({ ...current, urlMessageStatus: e.target.value }))}
            helperText="Dispara sempre que o status de uma mensagem é atualizado."
          />
          <TextField
            fullWidth
            label="Token de autenticação"
            value={form.authToken || ''}
            onChange={e => setForm(current => ({ ...current, authToken: e.target.value }))}
            helperText="Será enviado no header authorization. Informe o prefixo se houver (ex.: Bearer, Token)."
          />
        </Stack>

        {form.id && (
          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Checkbox
                checked={form.isActive !== false}
                onChange={e => setForm(current => ({ ...current, isActive: e.target.checked }))}
              />
            }
            label="Ativo"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving || sessions.length === 0}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function ApiServicePage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<ApiConfig>>({})
  const [confirm, setConfirm] = useState<ApiConfig | null>(null)
  const [renewConfirm, setRenewConfirm] = useState<ApiConfig | null>(null)

  const { data: apis = [], isLoading, isError, error } = useQuery({
    queryKey: ['api-configs'],
    queryFn: listApiConfigs
  })

  const removeMutation = useMutation({
    mutationFn: deleteApiConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-configs'] })
      enqueueSnackbar('API excluída', { variant: 'success' })
      setConfirm(null)
    },
    onError: (err: { userMessage?: string }) => {
      enqueueSnackbar(err.userMessage || 'Erro ao excluir API', { variant: 'error' })
    }
  })

  const renewMut = useMutation({
    mutationFn: renewApiToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-configs'] })
      enqueueSnackbar('Token renovado', { variant: 'success' })
      setRenewConfirm(null)
    },
    onError: (err: { userMessage?: string }) => {
      enqueueSnackbar(err.userMessage || 'Erro ao renovar token', { variant: 'error' })
    }
  })

  const handleCopy = async (text?: string) => {
    if (!text) return
    try {
      await copyText(text)
      enqueueSnackbar('Copiado!', { variant: 'success' })
    } catch {
      enqueueSnackbar('Não foi possível copiar', { variant: 'error' })
    }
  }

  const downloadPostman = () => {
    const link = document.createElement('a')
    link.href = `${import.meta.env.BASE_URL}apiizing.json`
    link.download = 'apiizing.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title="API Externa"
        subtitle="Configure integrações externas, tokens e webhooks."
        action={
          <Button variant="contained" onClick={() => { setEditing({}); setDialogOpen(true) }}>
            Adicionar
          </Button>
        }
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Typography color="error">
          {(error as { userMessage?: string }).userMessage || 'Erro ao carregar APIs'}
        </Typography>
      ) : apis.length === 0 ? (
        <Typography color="text.secondary">Nenhuma configuração de API cadastrada.</Typography>
      ) : (
        <Stack spacing={2}>
          {apis.map(apiItem => (
            <Card key={apiItem.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {apiItem.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Copiar token">
                      <IconButton onClick={() => void handleCopy(apiItem.token)}>
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton onClick={() => { setEditing(apiItem); setDialogOpen(true) }}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Gerar novo token">
                      <IconButton onClick={() => setRenewConfirm(apiItem)}>
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton color="error" onClick={() => setConfirm(apiItem)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Stack spacing={1.25} sx={{ mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      URL
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {buildIntegrationUrl(apiItem.id)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Token
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {apiItem.token || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      WebHook Status WhatsApp
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {apiItem.urlServiceStatus || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      WebHook Status Mensagem
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {apiItem.urlMessageStatus || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      Token Autenticação
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {apiItem.authToken || '—'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          Baixe a collection do Postman e use em{' '}
          <Link href="https://www.postman.com/" target="_blank" rel="noopener noreferrer">
            postman.com
          </Link>
        </Typography>
        <Button variant="outlined" onClick={downloadPostman}>
          Postman
        </Button>
      </Box>

      <ApiDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['api-configs'] })}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Excluir API?"
        message={`Deseja realmente deletar "${confirm?.name}"?`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && removeMutation.mutate(confirm.id)}
      />

      <ConfirmDialog
        open={Boolean(renewConfirm)}
        title="Renovar token?"
        message={
          renewConfirm
            ? `Deseja gerar novo token para "${renewConfirm.name}"? Integrações que usam o token atual deixarão de funcionar até atualizar.`
            : ''
        }
        onCancel={() => setRenewConfirm(null)}
        onConfirm={() =>
          renewConfirm &&
          renewMut.mutate({ id: renewConfirm.id, sessionId: renewConfirm.sessionId })
        }
      />
    </AdminOnly>
  )
}
