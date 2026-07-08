import { api } from './client'
import type { ChatFlowRecord } from '@/utils/flowConverter'
import { buildSavePayload, getFlowCanvas } from '@/utils/flowConverter'

export const listChatFlows = async () => {
  const res = await api.get<{ chatFlow: ChatFlowRecord[] }>('/chat-flow')
  return { ...res, data: res.data.chatFlow || [] }
}

export const createChatFlow = (data: Record<string, unknown>) => api.post('/chat-flow', data)

export const updateChatFlow = (id: number, data: Record<string, unknown>) =>
  api.put(`/chat-flow/${id}`, data)

export const deleteChatFlow = (id: number) => api.delete(`/chat-flow/${id}`)

export const getChatFlowById = async (id: number) => {
  const { data } = await listChatFlows()
  const flow = data.find(f => f.id === id)
  if (!flow) throw new Error('Fluxo não encontrado')
  return flow
}

export const duplicateChatFlow = async (sourceId: number, name: string) => {
  const source = await getChatFlowById(sourceId)
  const canvas = getFlowCanvas(source)
  const payload = buildSavePayload({ ...source, name, isActive: false }, canvas)
  const { id: _id, ...createPayload } = payload as ChatFlowRecord & { flow: unknown }
  return createChatFlow(createPayload as Record<string, unknown>)
}
