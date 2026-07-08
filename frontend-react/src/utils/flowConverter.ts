import type { Edge, Node } from '@xyflow/react'

export interface FlowNodeData {
  id: string
  name: string
  type: 'start' | 'configurations' | 'node' | 'exception'
  left?: string
  top?: string
  ico?: string
  viewOnly?: boolean
  interactions?: unknown[]
  conditions?: unknown[]
  actions?: unknown[]
  configurations?: Record<string, unknown>
  [key: string]: unknown
}

export interface FlowLine {
  from: string
  to: string
  label?: string
  connector?: string
  anchors?: string[]
  paintStyle?: Record<string, unknown>
}

export interface FlowCanvas {
  name?: string
  nodeList: FlowNodeData[]
  lineList: FlowLine[]
  isActive?: boolean
  celularTeste?: string
}

export interface ChatFlowRecord {
  id: number
  name: string
  isActive?: boolean
  celularTeste?: string
  userId?: number
  flow?: FlowCanvas | { flow?: FlowCanvas }
}

function parsePx(value?: string, fallback = 0) {
  if (!value) return fallback
  return Number.parseInt(value.replace('px', ''), 10) || fallback
}

export function getFlowCanvas(record: ChatFlowRecord): FlowCanvas {
  const raw = record.flow
  if (!raw) return defaultFlowCanvas(record.name)
  if ('nodeList' in raw && Array.isArray(raw.nodeList)) return raw as FlowCanvas
  if (raw && typeof raw === 'object' && 'flow' in raw && raw.flow) {
    return raw.flow as FlowCanvas
  }
  return defaultFlowCanvas(record.name)
}

export function defaultFlowCanvas(name?: string): FlowCanvas {
  return {
    name: name || 'Fluxo Inicial',
    nodeList: [
      { id: 'start', name: 'Início', type: 'start', left: '26px', top: '100px', ico: 'mdi-play', viewOnly: true },
      {
        id: 'configurations',
        name: 'Configurações',
        type: 'configurations',
        left: '340px',
        top: '100px',
        viewOnly: true,
        ico: 'mdi-alert-circle-outline',
        configurations: {
          welcomeMessage: { message: '' },
          notOptionsSelectMessage: { message: '', stepReturn: 'A' },
          notResponseMessage: { time: 10, type: 1, destiny: '' },
          maxRetryBotMessage: { number: 3, type: 1, destiny: '' }
        }
      },
      {
        id: 'nodeC',
        name: 'Boas vindas!',
        type: 'node',
        left: '26px',
        top: '301px',
        interactions: [],
        conditions: [],
        actions: []
      }
    ],
    lineList: [{ from: 'start', to: 'nodeC', paintStyle: { strokeWidth: 3, stroke: '#8db1dd' } }]
  }
}

export function toReactFlow(canvas: FlowCanvas): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = canvas.nodeList.map(n => ({
    id: n.id,
    type: n.type,
    position: { x: parsePx(n.left, 100), y: parsePx(n.top, 100) },
    data: { label: n.name, raw: n },
    draggable: !n.viewOnly
  }))

  const edges: Edge[] = canvas.lineList.map((line, i) => ({
    id: `e-${line.from}-${line.to}-${i}`,
    source: line.from,
    target: line.to,
    label: line.label,
    animated: true,
    style: { stroke: '#8db1dd', strokeWidth: 2 }
  }))

  return { nodes, edges }
}

export function fromReactFlow(
  nodes: Node[],
  edges: Edge[],
  base: FlowCanvas
): FlowCanvas {
  const nodeList: FlowNodeData[] = nodes.map(n => {
    const raw = (n.data as { raw?: FlowNodeData }).raw || ({} as FlowNodeData)
    return {
      ...raw,
      id: n.id,
      name: (n.data as { label?: string }).label || raw.name || n.id,
      type: (n.type as FlowNodeData['type']) || raw.type || 'node',
      left: `${Math.round(n.position.x)}px`,
      top: `${Math.round(n.position.y)}px`
    }
  })

  const lineList: FlowLine[] = edges.map(e => ({
    from: e.source,
    to: e.target,
    label: typeof e.label === 'string' ? e.label : undefined,
    paintStyle: { strokeWidth: 3, stroke: '#8db1dd' }
  }))

  return {
    ...base,
    nodeList,
    lineList
  }
}

export function buildSavePayload(record: ChatFlowRecord, canvas: FlowCanvas) {
  const userId = Number(localStorage.getItem('userId'))
  const inner = {
    ...canvas,
    name: record.name,
    isActive: record.isActive,
    celularTeste: record.celularTeste
  }
  return {
    id: record.id,
    name: record.name,
    isActive: record.isActive,
    celularTeste: record.celularTeste,
    userId,
    flow: inner
  }
}
