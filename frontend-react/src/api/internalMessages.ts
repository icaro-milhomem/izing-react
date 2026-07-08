import { api } from './client'

export interface InternalMessage {
  id: number
  body: string
  fromMe: boolean
  createdAt: string
  senderId?: number
  receiverId?: number
  sender?: { id: number; name: string }
  senderName?: string
}

type ApiInternalMessage = {
  id: number
  message: string
  senderId: number
  receiverId: number
  createdAt: string
  sender?: { id: number; name: string }
  senderName?: string
}

export function mapInternalMessage(
  row: ApiInternalMessage,
  currentUserId: number
): InternalMessage {
  const senderId = Number(row.senderId)
  return {
    id: row.id,
    body: row.message,
    fromMe: senderId === Number(currentUserId),
    createdAt: row.createdAt,
    senderId,
    receiverId: Number(row.receiverId),
    sender: row.sender ? { ...row.sender, id: Number(row.sender.id) } : undefined,
    senderName: row.senderName
  }
}

export const listInternalMessages = async (userId: number) => {
  const currentUserId = Number(localStorage.getItem('userId'))
  const res = await api.get<ApiInternalMessage[]>(`/internal-messages/${userId}`)
  return { ...res, data: res.data.map(row => mapInternalMessage(row, currentUserId)) }
}

export const sendInternalMessage = async (data: { receiverId: number; body: string }) => {
  const currentUserId = Number(localStorage.getItem('userId'))
  const res = await api.post<ApiInternalMessage>('/internal-messages', {
    receiverId: data.receiverId,
    message: data.body
  })
  return { ...res, data: mapInternalMessage(res.data, currentUserId) }
}

export const markInternalMessagesRead = (userId: number) =>
  api.put(`/internal-messages/read/${userId}`)
