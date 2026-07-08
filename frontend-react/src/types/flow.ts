import type { FlowNodeData } from '@/utils/flowConverter'

export interface FlowInteraction {
  id: string
  type: 'MessageField' | 'MediaField'
  data: Record<string, unknown>
}

export interface FlowCondition {
  id: string
  type: 'US' | 'R' | ''
  condition?: string[]
  action?: 0 | 1 | 2
  nextStepId?: string | null
  queueId?: number | null
  userIdDestination?: number | null
}

export interface FlowAction {
  id: string
  type?: string
  data?: Record<string, unknown>
}

export function ensureInteractions(raw: FlowNodeData): FlowInteraction[] {
  return (raw.interactions || []) as FlowInteraction[]
}

export function ensureConditions(raw: FlowNodeData): FlowCondition[] {
  return (raw.conditions || []) as FlowCondition[]
}

export function newMessageInteraction(): FlowInteraction {
  return { id: `int_${Date.now()}`, type: 'MessageField', data: { message: '' } }
}

export function newMediaInteraction(): FlowInteraction {
  return {
    id: `int_${Date.now()}`,
    type: 'MediaField',
    data: { ext: '', mediaUrl: '', media: '', type: '', name: '', caption: '' }
  }
}

export function newCondition(): FlowCondition {
  return { id: `cond_${Date.now()}`, type: 'US', condition: [], action: 0, nextStepId: null }
}

export const ROUTE_ACTIONS = [
  { value: 0, label: 'Etapa' },
  { value: 1, label: 'Fila' },
  { value: 2, label: 'Usuário' }
] as const

export const CONDITION_TYPES = [
  { value: 'US', label: 'Qualquer resposta' },
  { value: 'R', label: 'Respostas específicas' }
] as const
