import { Fragment, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
  Typography
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import AddIcon from '@mui/icons-material/Add'
import { Link } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FlowBuilderCanvas } from '@/components/chatFlow/FlowBuilderCanvas'
import { StepActionDialog } from '@/components/autoResposta/StepActionDialog'
import { listChatFlows } from '@/api/chatFlow'
import { listSettings } from '@/api/settings'
import {
  createAutoReply,
  createAutoReplyStep,
  deleteAutoReply,
  deleteAutoReplyStep,
  listAutoReplies,
  updateAutoReply,
  updateAutoReplyStep,
  type AutoReply,
  type AutoReplyAction,
  type AutoReplyStep
} from '@/api/autoReply'

const FLOW_ACTIONS = [
  { value: 0, label: 'Entrada (criação do ticket)' },
  { value: 1, label: 'Encerramento (resolução)' }
]

function AutoReplyDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<AutoReply>
  onClose: () => void
  onSaved: () => void
}) {
  const userId = Number(localStorage.getItem('userId'))
  const [form, setForm] = useState<Partial<AutoReply>>({ isActive: true, action: 0, ...initial })
  const { enqueueSnackbar } = useSnackbar()

  const save = async () => {
    try {
      const payload = { ...form, userId, action: form.action ?? 0 }
      if (form.id) await updateAutoReply(payload as AutoReply)
      else await createAutoReply(payload)
      enqueueSnackbar('Salvo', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Nova'} Auto Resposta</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Descrição" margin="normal" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <FormControl fullWidth margin="normal">
          <InputLabel>Tipo de fluxo</InputLabel>
          <Select
            label="Tipo de fluxo"
            value={form.action ?? 0}
            onChange={e => setForm(f => ({ ...f, action: Number(e.target.value) }))}
          >
            {FLOW_ACTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth label="Celular teste" margin="normal" value={form.celularTeste || ''} onChange={e => setForm(f => ({ ...f, celularTeste: e.target.value }))} helperText="Deixe vazio para funcionar para todos" />
        <FormControlLabel control={<Checkbox checked={Boolean(form.isActive)} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />} label="Ativo" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}

function StepDialog({
  open,
  autoReplyId,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  autoReplyId: number
  initial: Partial<AutoReplyStep>
  onClose: () => void
  onSaved: () => void
}) {
  const userId = Number(localStorage.getItem('userId'))
  const [form, setForm] = useState(initial)
  const { enqueueSnackbar } = useSnackbar()

  const save = async () => {
    try {
      const payload = { ...form, userId, idAutoReply: autoReplyId }
      if (form.id) await updateAutoReplyStep(autoReplyId, form.id, payload)
      else await createAutoReplyStep(autoReplyId, payload)
      enqueueSnackbar('Etapa salva', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Nova'} etapa</DialogTitle>
      <DialogContent>
        <TextField fullWidth multiline minRows={4} label="Mensagem" margin="normal" value={form.reply || ''} onChange={e => setForm(f => ({ ...f, reply: e.target.value }))} />
        <FormControlLabel control={<Checkbox checked={Boolean(form.initialStep)} onChange={e => setForm(f => ({ ...f, initialStep: e.target.checked }))} />} label="Etapa inicial" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}

export function AutoRespostaPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<AutoReply>>({})
  const [confirm, setConfirm] = useState<AutoReply | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [stepDialog, setStepDialog] = useState<{ autoReplyId: number; step: Partial<AutoReplyStep> } | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    autoReplyId: number
    step: AutoReplyStep
    allSteps: AutoReplyStep[]
    action?: AutoReplyAction | null
  } | null>(null)
  const [tab, setTab] = useState<'builder' | 'crud'>('builder')
  const [selectedFlowId, setSelectedFlowId] = useState<number | ''>('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['auto-replies'],
    queryFn: async () => (await listAutoReplies()).data
  })

  const { data: chatFlows = [] } = useQuery({
    queryKey: ['chatFlows'],
    queryFn: async () => (await listChatFlows()).data
  })

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await listSettings()).data
  })

  useEffect(() => {
    if (selectedFlowId !== '' || !chatFlows.length) return
    const botActive = settings.find(s => s.key === 'botTicketActive')?.value
    const fromSettings = botActive ? Number(botActive) : NaN
    if (Number.isFinite(fromSettings) && chatFlows.some(f => f.id === fromSettings)) {
      setSelectedFlowId(fromSettings)
      return
    }
    setSelectedFlowId(chatFlows[0]?.id ?? '')
  }, [chatFlows, settings, selectedFlowId])

  const removeMutation = useMutation({
    mutationFn: deleteAutoReply,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auto-replies'] })
  })

  const removeStep = async (autoReplyId: number, stepId: number) => {
    try {
      await deleteAutoReplyStep(autoReplyId, stepId)
      enqueueSnackbar('Etapa removida', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['auto-replies'] })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title="Auto Resposta"
        action={
          tab === 'crud' ? (
            <Button variant="contained" onClick={() => { setEditing({}); setDialogOpen(true) }}>Adicionar</Button>
          ) : (
            <Button component={Link} to="/chat-flow" variant="outlined" size="small">Gerenciar fluxos</Button>
          )
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="builder" label="Builder visual" />
        <Tab value="crud" label="Fluxos automáticos (etapas)" />
      </Tabs>

      {tab === 'builder' && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>Fluxo do chatbot</InputLabel>
              <Select
                label="Fluxo do chatbot"
                value={selectedFlowId === '' ? '' : String(selectedFlowId)}
                onChange={e => setSelectedFlowId(Number(e.target.value))}
              >
                {chatFlows.map(f => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              Mesmo canvas visual do Vue — fluxos salvos via Chat Flow.
            </Typography>
          </Box>
          {selectedFlowId !== '' ? (
            <FlowBuilderCanvas flowId={Number(selectedFlowId)} embedded height={620} />
          ) : (
            <Typography color="text.secondary">
              Nenhum fluxo cadastrado.{' '}
              <Button component={Link} to="/chat-flow" size="small">Criar em Chat Flow</Button>
            </Typography>
          )}
        </Paper>
      )}

      {tab === 'crud' && (isLoading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={48} />
                <TableCell>#</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Ativo</TableCell>
                <TableCell>Teste</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <Fragment key={item.id}>
                  <TableRow>
                    <TableCell>
                      <IconButton size="small" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                        {expanded === item.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.isActive ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>{item.celularTeste || '—'}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => { setEditing(item); setDialogOpen(true) }}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => setConfirm(item)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                      <Collapse in={expanded === item.id}>
                        <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2">Etapas</Typography>
                            <Button size="small" startIcon={<AddIcon />} onClick={() => setStepDialog({ autoReplyId: item.id, step: {} })}>
                              Nova etapa
                            </Button>
                          </Box>
                          {(item.stepsReply || []).map(step => (
                            <Box key={step.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">#{step.id}{step.initialStep ? ' · inicial' : ''}</Typography>
                                <Typography variant="body2">{step.reply}</Typography>
                                {(step.stepsReplyAction || []).map(action => (
                                  <Box key={action.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ flex: 1 }}>
                                      "{action.words}" → ação {action.action}
                                    </Typography>
                                    <Button
                                      size="small"
                                      onClick={() => setActionDialog({ autoReplyId: item.id, step, allSteps: item.stepsReply || [], action })}
                                    >
                                      Editar
                                    </Button>
                                  </Box>
                                ))}
                                <Button
                                  size="small"
                                  sx={{ ml: 2, mt: 0.5 }}
                                  onClick={() => setActionDialog({ autoReplyId: item.id, step, allSteps: item.stepsReply || [], action: null })}
                                >
                                  + Ação
                                </Button>
                              </Box>
                              <IconButton size="small" onClick={() => setStepDialog({ autoReplyId: item.id, step })}><EditIcon fontSize="small" /></IconButton>
                              <IconButton size="small" color="error" onClick={() => removeStep(item.id, step.id)}><DeleteIcon fontSize="small" /></IconButton>
                            </Box>
                          ))}
                          {!item.stepsReply?.length && (
                            <Typography variant="body2" color="text.secondary">Nenhuma etapa cadastrada</Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ))}

      <AutoReplyDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['auto-replies'] })} />
      {stepDialog && (
        <StepDialog
          open
          autoReplyId={stepDialog.autoReplyId}
          initial={stepDialog.step}
          onClose={() => setStepDialog(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['auto-replies'] })}
        />
      )}
      {actionDialog && (
        <StepActionDialog
          open
          autoReplyId={actionDialog.autoReplyId}
          step={actionDialog.step}
          allSteps={actionDialog.allSteps}
          action={actionDialog.action}
          onClose={() => setActionDialog(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['auto-replies'] })}
        />
      )}
      <ConfirmDialog open={Boolean(confirm)} title="Excluir?" message={`Excluir "${confirm?.name}"?`} onCancel={() => setConfirm(null)} onConfirm={() => confirm && removeMutation.mutate(confirm.id)} />
    </AdminOnly>
  )
}
