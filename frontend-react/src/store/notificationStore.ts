import { create } from 'zustand'
import type { Ticket } from '@/types/entities'

export interface InternalChatNotification {
  senderId: number
  senderName: string
  lastMessage: string
  unreadCount: number
}

interface NotificationState {
  openTickets: Ticket[]
  pendingTickets: Ticket[]
  openCount: number
  pendingCount: number
  internalChats: InternalChatNotification[]
  internalCount: number
  setOpenTickets: (tickets: Ticket[], count?: number) => void
  setPendingTickets: (tickets: Ticket[], count?: number) => void
  addInternalMessage: (senderId: number, senderName: string, message: string) => void
  clearInternalFromSender: (senderId: number) => void
}

export const useNotificationStore = create<NotificationState>(set => ({
  openTickets: [],
  pendingTickets: [],
  openCount: 0,
  pendingCount: 0,
  internalChats: [],
  internalCount: 0,
  setOpenTickets: (tickets, count) =>
    set({ openTickets: tickets, openCount: count ?? tickets.length }),
  setPendingTickets: (tickets, count) =>
    set({ pendingTickets: tickets, pendingCount: count ?? tickets.length }),
  addInternalMessage: (senderId, senderName, message) =>
    set(state => {
      const existing = state.internalChats.find(item => item.senderId === senderId)
      const internalChats = existing
        ? state.internalChats.map(item =>
            item.senderId === senderId
              ? {
                  ...item,
                  senderName,
                  lastMessage: message,
                  unreadCount: item.unreadCount + 1
                }
              : item
          )
        : [
            ...state.internalChats,
            { senderId, senderName, lastMessage: message, unreadCount: 1 }
          ]
      const internalCount = internalChats.reduce((sum, item) => sum + item.unreadCount, 0)
      return { internalChats, internalCount }
    }),
  clearInternalFromSender: senderId =>
    set(state => {
      const internalChats = state.internalChats.filter(item => item.senderId !== senderId)
      const internalCount = internalChats.reduce((sum, item) => sum + item.unreadCount, 0)
      return { internalChats, internalCount }
    })
}))

export function getTotalNotificationCount() {
  const { openCount, pendingCount, internalCount } = useNotificationStore.getState()
  return openCount + pendingCount + internalCount
}
