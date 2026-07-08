import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node
} from '@xyflow/react'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Paper,
  TextField,
  Typography,
  CircularProgress
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import DownloadIcon from '@mui/icons-material/Download'
import { useSnackbar } from 'notistack'
import { FlowHelpDialog } from '@/components/chatFlow/FlowHelpDialog'
import { flowNodeTypes } from '@/components/chatFlow/FlowNodes'
import { FlowNodeEditor } from '@/components/chatFlow/FlowNodeEditor'
import {
  buildSavePayload,
  defaultFlowCanvas,
  fromReactFlow,
  getFlowCanvas,
  toReactFlow,
  type FlowNodeData,
  type ChatFlowRecord
} from '@/utils/flowConverter'
import { getChatFlowById, updateChatFlow } from '@/api/chatFlow'
import { listQueues } from '@/api/queues'
import { listUsers } from '@/api/users'

function uid() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export interface FlowBuilderCanvasProps {
  flowId: number
  embedded?: boolean
  height?: number | string
  toolbarExtra?: ReactNode
}

export function FlowBuilderCanvas({
  flowId,
  embedded = false,
  height = embedded ? 560 : '100vh',
  toolbarExtra
}: FlowBuilderCanvasProps) {
  const { enqueueSnackbar } = useSnackbar()
  const [record, setRecord] = useState<ChatFlowRecord | null>(null)
  const [canvasName, setCanvasName] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const { data: filas = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => (await listQueues()).data
  })

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await listUsers()).data.users
  })

  const baseCanvas = useMemo(
    () => (record ? getFlowCanvas(record) : defaultFlowCanvas()),
    [record]
  )

  useEffect(() => {
    if (!flowId) {
      setLoading(false)
      return
    }
    setLoading(true)
    getChatFlowById(flowId)
      .then(flow => {
        setRecord(flow)
        setCanvasName(flow.name)
        const canvas = getFlowCanvas(flow)
        const { nodes: n, edges: e } = toReactFlow(canvas)
        setNodes(n)
        setEdges(e)
        setSelectedId(null)
      })
      .catch(() => enqueueSnackbar('Erro ao carregar fluxo', { variant: 'error' }))
      .finally(() => setLoading(false))
  }, [flowId, setNodes, setEdges, enqueueSnackbar])

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges(eds => addEdge({ ...connection, animated: true, style: { stroke: '#8db1dd' } }, eds)),
    [setEdges]
  )

  const selectedNode = nodes.find(n => n.id === selectedId)
  const selectedRaw = (selectedNode?.data as { raw?: FlowNodeData })?.raw

  const allNodes = useMemo(
    () =>
      nodes.map(n => {
        const raw = (n.data as { raw?: FlowNodeData }).raw
        return raw || ({ id: n.id, name: String((n.data as { label?: string })?.label || n.id), type: 'node' } as FlowNodeData)
      }),
    [nodes]
  )

  const handleConditionRoute = useCallback(
    (targetStepId: string) => {
      if (!selectedId) return
      setEdges(eds => {
        if (eds.some(e => e.source === selectedId && e.target === targetStepId)) return eds
        return [
          ...eds,
          {
            id: `e-${selectedId}-${targetStepId}-${Date.now()}`,
            source: selectedId,
            target: targetStepId,
            animated: true,
            style: { stroke: '#8db1dd', strokeWidth: 2 }
          }
        ]
      })
    },
    [selectedId, setEdges]
  )

  const updateSelected = (patch: Partial<FlowNodeData>) => {
    if (!selectedId) return
    setNodes(nds =>
      nds.map(n => {
        if (n.id !== selectedId) return n
        const raw = { ...(n.data as { raw: FlowNodeData }).raw, ...patch }
        return { ...n, data: { label: patch.name || raw.name, raw } }
      })
    )
  }

  const addStepNode = () => {
    const id = uid()
    const newNode: Node = {
      id,
      type: 'node',
      position: { x: 120 + nodes.length * 20, y: 320 + nodes.length * 20 },
      data: {
        label: 'Nova etapa',
        raw: { id, name: 'Nova etapa', type: 'node', interactions: [], conditions: [], actions: [] }
      }
    }
    setNodes(nds => [...nds, newNode])
    setSelectedId(id)
  }

  const deleteSelected = () => {
    if (!selectedId || ['start', 'configurations'].includes(selectedId)) return
    setNodes(nds => nds.filter(n => n.id !== selectedId))
    setEdges(eds => eds.filter(e => e.source !== selectedId && e.target !== selectedId))
    setSelectedId(null)
  }

  const handleSave = async () => {
    if (!record) return
    try {
      const canvas = fromReactFlow(nodes, edges, { ...baseCanvas, name: canvasName })
      const payload = buildSavePayload({ ...record, name: canvasName }, canvas)
      await updateChatFlow(record.id, payload)
      enqueueSnackbar('Fluxo salvo!', { variant: 'success' })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao salvar', { variant: 'error' })
    }
  }

  const exportJson = () => {
    const canvas = fromReactFlow(nodes, edges, { ...baseCanvas, name: canvasName })
    const blob = new Blob([JSON.stringify(canvas, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(canvasName || 'fluxo').replace(/\s+/g, '_')}.json`
    link.click()
    URL.revokeObjectURL(url)
    enqueueSnackbar('JSON exportado', { variant: 'info' })
  }

  if (!flowId) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Selecione um fluxo para editar no canvas.</Typography>
      </Paper>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: embedded ? 320 : '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  const containerHeight = fullscreen ? '100vh' : height

  return (
    <Box
      sx={{
        height: containerHeight,
        display: 'flex',
        flexDirection: 'column',
        border: embedded ? 1 : 0,
        borderColor: 'divider',
        borderRadius: embedded ? 2 : 0,
        overflow: 'hidden',
        ...(fullscreen ? { position: 'fixed', inset: 0, zIndex: 1300, bgcolor: 'background.paper' } : {})
      }}
    >
      <Paper elevation={0} sx={{ px: embedded ? 1.5 : 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }}>
        {toolbarExtra}
        <TextField size="small" value={canvasName} onChange={e => setCanvasName(e.target.value)} sx={{ minWidth: 180 }} />
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={() => setHelpOpen(true)} title="Ajuda" size="small"><HelpOutlineOutlinedIcon /></IconButton>
        <IconButton onClick={() => setFullscreen(v => !v)} title="Tela cheia" size="small">
          {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>
        <Button size="small" startIcon={<DownloadIcon />} onClick={exportJson}>Exportar</Button>
        <Button size="small" startIcon={<AddIcon />} onClick={addStepNode}>Etapa</Button>
        <Button size="small" startIcon={<DeleteIcon />} color="error" onClick={deleteSelected} disabled={!selectedId || ['start', 'configurations'].includes(selectedId)}>
          Excluir
        </Button>
        <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>Salvar</Button>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={flowNodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </Box>

        <Paper sx={{ width: embedded ? 300 : 360, p: 2, overflow: 'auto', borderLeft: 1, borderColor: 'divider', display: { xs: 'none', md: 'block' } }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Propriedades</Typography>
          {!selectedNode ? (
            <Typography color="text.secondary" variant="body2">Selecione um nó no canvas</Typography>
          ) : (
            <>
              <TextField
                fullWidth
                label="Nome"
                margin="normal"
                size="small"
                value={selectedRaw?.name || ''}
                disabled={selectedRaw?.viewOnly}
                onChange={e => updateSelected({ name: e.target.value })}
              />
              {selectedRaw && (
                <FlowNodeEditor
                  node={selectedRaw}
                  allNodes={allNodes}
                  filas={filas}
                  usuarios={usuarios}
                  onChange={updateSelected}
                  onConditionRoute={handleConditionRoute}
                />
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={Boolean(record?.isActive)}
                    onChange={e => setRecord(r => (r ? { ...r, isActive: e.target.checked } : r))}
                  />
                }
                label="Fluxo ativo"
              />
              <TextField
                fullWidth
                label="Celular teste"
                margin="normal"
                size="small"
                value={record?.celularTeste || ''}
                onChange={e => setRecord(r => (r ? { ...r, celularTeste: e.target.value } : r))}
              />
            </>
          )}
        </Paper>
      </Box>

      <FlowHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Box>
  )
}
