import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  Autocomplete
} from '@mui/material'
import { EmojiPicker } from '@/components/atendimento/EmojiPicker'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import type { Queue } from '@/types/entities'
import type { User } from '@/types/entities'
import type { FlowNodeData } from '@/utils/flowConverter'
import {
  CONDITION_TYPES,
  ROUTE_ACTIONS,
  ensureConditions,
  ensureInteractions,
  newCondition,
  newMediaInteraction,
  newMessageInteraction,
  type FlowCondition,
  type FlowInteraction
} from '@/types/flow'

const MESSAGE_VARIABLES = [
  { label: 'Nome', value: '{{name}}' },
  { label: 'Saudação', value: '{{greeting}}' },
  { label: 'Protocolo', value: '{{protocol}}' }
]

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface FlowNodeEditorProps {
  node: FlowNodeData
  allNodes: FlowNodeData[]
  filas: Queue[]
  usuarios: User[]
  onChange: (patch: Partial<FlowNodeData>) => void
  onConditionRoute?: (targetStepId: string) => void
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  if (to < 0 || to >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function FlowNodeEditor({
  node,
  allNodes,
  filas,
  usuarios,
  onChange,
  onConditionRoute
}: FlowNodeEditorProps) {
  const [tab, setTab] = useState(0)
  const interactions = ensureInteractions(node)
  const conditions = ensureConditions(node)
  const stepOptions = allNodes.filter(n => n.type === 'node' || n.type === 'start')

  const setInteractions = (items: FlowInteraction[]) => onChange({ interactions: items })
  const setConditions = (items: FlowCondition[]) => onChange({ conditions: items })

  if (node.type === 'configurations') {
    const cfg = node.configurations || {}
    return (
      <Box>
        <TextField
          fullWidth
          label="Mensagem de boas-vindas"
          margin="normal"
          multiline
          minRows={3}
          value={(cfg.welcomeMessage as { message?: string })?.message || ''}
          onChange={e =>
            onChange({
              configurations: {
                ...cfg,
                welcomeMessage: { message: e.target.value }
              }
            })
          }
        />
        <TextField
          fullWidth
          label="Msg. fila/usuário (saudação ao rotear)"
          margin="normal"
          multiline
          minRows={2}
          value={(cfg.greetingMessage as { message?: string })?.message || ''}
          onChange={e =>
            onChange({
              configurations: {
                ...cfg,
                greetingMessage: { message: e.target.value }
              }
            })
          }
        />
        <TextField
          fullWidth
          label="Msg. opção inválida"
          margin="normal"
          multiline
          minRows={2}
          value={(cfg.notOptionsSelectMessage as { message?: string })?.message || ''}
          onChange={e =>
            onChange({
              configurations: {
                ...cfg,
                notOptionsSelectMessage: { message: e.target.value, stepReturn: 'A' }
              }
            })
          }
        />
        <TextField
          fullWidth
          type="number"
          label="Tentativas máx. bot"
          margin="normal"
          value={(cfg.maxRetryBotMessage as { number?: number })?.number ?? 3}
          onChange={e =>
            onChange({
              configurations: {
                ...cfg,
                maxRetryBotMessage: { number: Number(e.target.value), type: 1, destiny: '' }
              }
            })
          }
        />
      </Box>
    )
  }

  if (node.type === 'start') {
    return <Typography color="text.secondary">Nó inicial — somente conexão de saída.</Typography>
  }

  if (node.type !== 'node') return null

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Interações" />
        <Tab label="Condições" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setInteractions([...interactions, newMessageInteraction()])}>
              Mensagem
            </Button>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setInteractions([...interactions, newMediaInteraction()])}>
              Mídia
            </Button>
          </Box>
          {interactions.map((item, idx) => (
            <Box key={item.id} sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Chip size="small" label={`#${idx + 1} ${item.type === 'MediaField' ? 'Mídia' : 'Texto'}`} />
                <Box>
                  <IconButton size="small" disabled={idx === 0} onClick={() => setInteractions(moveItem(interactions, idx, idx - 1))}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" disabled={idx === interactions.length - 1} onClick={() => setInteractions(moveItem(interactions, idx, idx + 1))}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setInteractions(interactions.filter((_, i) => i !== idx))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              {item.type === 'MessageField' ? (
                <>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    size="small"
                    label="Mensagem"
                    value={String(item.data.message || '')}
                    onChange={e => {
                      const next = [...interactions]
                      next[idx] = { ...item, data: { ...item.data, message: e.target.value } }
                      setInteractions(next)
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <EmojiPicker
                      onPick={emoji => {
                        const next = [...interactions]
                        const current = String(item.data.message || '')
                        next[idx] = { ...item, data: { ...item.data, message: current + emoji } }
                        setInteractions(next)
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                    {MESSAGE_VARIABLES.map(v => (
                      <Chip
                        key={v.value}
                        size="small"
                        label={v.label}
                        clickable
                        onClick={() => {
                          const next = [...interactions]
                          const current = String(item.data.message || '')
                          next[idx] = { ...item, data: { ...item.data, message: current + v.value } }
                          setInteractions(next)
                        }}
                      />
                    ))}
                  </Box>
                </>
              ) : (
                <>
                  <Button
                    size="small"
                    component="label"
                    startIcon={<AttachFileIcon />}
                    sx={{ mb: 1 }}
                  >
                    Enviar arquivo
                    <input
                      hidden
                      type="file"
                      accept="image/*,.pdf,.mp4,.mp3,.ogg,.doc,.docx,.xls,.xlsx"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 10 * 1024 * 1024) return
                        const dataUrl = await readFileAsDataUrl(file)
                        const next = [...interactions]
                        next[idx] = {
                          ...item,
                          data: {
                            ...item.data,
                            mediaUrl: dataUrl,
                            name: file.name,
                            type: file.type,
                            ext: file.name.split('.').pop()
                          }
                        }
                        setInteractions(next)
                        e.target.value = ''
                      }}
                    />
                  </Button>
                  <TextField
                    fullWidth
                    size="small"
                    label="URL / nome arquivo"
                    margin="dense"
                    value={String(item.data.mediaUrl || item.data.name || '')}
                    onChange={e => {
                      const next = [...interactions]
                      next[idx] = { ...item, data: { ...item.data, mediaUrl: e.target.value, name: e.target.value } }
                      setInteractions(next)
                    }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Legenda"
                    margin="dense"
                    value={String(item.data.caption || '')}
                    onChange={e => {
                      const next = [...interactions]
                      next[idx] = { ...item, data: { ...item.data, caption: e.target.value } }
                      setInteractions(next)
                    }}
                  />
                </>
              )}
            </Box>
          ))}
          {!interactions.length && (
            <Typography variant="body2" color="text.secondary">Nenhuma interação — adicione mensagem ou mídia.</Typography>
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Button size="small" startIcon={<AddIcon />} sx={{ mb: 2 }} onClick={() => setConditions([...conditions, newCondition()])}>
            Nova condição
          </Button>
          {conditions.map((cond, idx) => (
            <Box key={cond.id} sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Chip size="small" label={`Condição ${idx + 1}`} />
                <IconButton size="small" color="error" onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel>Se</InputLabel>
                <Select
                  label="Se"
                  value={cond.type || 'US'}
                  onChange={e => {
                    const next = [...conditions]
                    next[idx] = { ...cond, type: e.target.value as FlowCondition['type'] }
                    setConditions(next)
                  }}
                >
                  {CONDITION_TYPES.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {cond.type === 'R' && (
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={[]}
                  value={cond.condition || []}
                  onChange={(_, v) => {
                    const next = [...conditions]
                    next[idx] = { ...cond, condition: v as string[] }
                    setConditions(next)
                  }}
                  renderInput={params => <TextField {...params} label="Respostas (Enter)" margin="dense" />}
                />
              )}
              <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 0.5 }}>Rotear para:</Typography>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel>Ação</InputLabel>
                <Select
                  label="Ação"
                  value={cond.action ?? 0}
                  onChange={e => {
                    const next = [...conditions]
                    next[idx] = { ...cond, action: Number(e.target.value) as 0 | 1 | 2 }
                    setConditions(next)
                  }}
                >
                  {ROUTE_ACTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {cond.action === 0 && (
                <FormControl fullWidth size="small">
                  <InputLabel>Próxima etapa</InputLabel>
                  <Select
                    label="Próxima etapa"
                    value={cond.nextStepId || ''}
                    onChange={e => {
                      const target = e.target.value as string
                      const next = [...conditions]
                      next[idx] = { ...cond, nextStepId: target, queueId: null, userIdDestination: null }
                      setConditions(next)
                      if (target) onConditionRoute?.(target)
                    }}
                  >
                    {stepOptions.map(s => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {cond.action === 1 && (
                <FormControl fullWidth size="small">
                  <InputLabel>Fila</InputLabel>
                  <Select
                    label="Fila"
                    value={cond.queueId ?? ''}
                    onChange={e => {
                      const next = [...conditions]
                      next[idx] = { ...cond, queueId: Number(e.target.value), nextStepId: null, userIdDestination: null }
                      setConditions(next)
                    }}
                  >
                    {filas.map(f => (
                      <MenuItem key={f.id} value={f.id}>{f.queue}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {cond.action === 2 && (
                <FormControl fullWidth size="small">
                  <InputLabel>Usuário</InputLabel>
                  <Select
                    label="Usuário"
                    value={cond.userIdDestination ?? ''}
                    onChange={e => {
                      const next = [...conditions]
                      next[idx] = { ...cond, userIdDestination: Number(e.target.value), nextStepId: null, queueId: null }
                      setConditions(next)
                    }}
                  >
                    {usuarios.map(u => (
                      <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
