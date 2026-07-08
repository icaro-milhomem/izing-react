import { create } from 'zustand'
import type { Message, Ticket } from '@/types/entities'
import { checkTicketFilter } from '@/utils/checkTicketFilter'
import { timestampOrZero } from '@/utils/formatDate'
import { resolveMediaUrl } from '@/utils/mediaUrl'

function normalizeMessage(message: Message): Message {
  const mediaUrl = resolveMediaUrl(message.mediaUrl) ?? message.mediaUrl
  const quotedMsg = message.quotedMsg ? normalizeMessage(message.quotedMsg) : message.quotedMsg
  if (mediaUrl === message.mediaUrl && quotedMsg === message.quotedMsg) return message
  return { ...message, mediaUrl, quotedMsg }
}

function normalizeMessages(messages: Message[]) {
  return messages.map(normalizeMessage)
}

function orderTickets(tickets: Ticket[]) {
  return [...tickets].sort((a, b) => {
    const db = timestampOrZero(b.lastMessageAt || b.updatedAt)
    const da = timestampOrZero(a.lastMessageAt || a.updatedAt)
    return db - da
  })
}

function orderMessages(messages: Message[]) {
  return [...messages].sort((a, b) => {
    const da = timestampOrZero(a.timestamp || a.createdAt)
    const db = timestampOrZero(b.timestamp || b.createdAt)
    if (da !== db) return da - db
    return a.id.localeCompare(b.id)
  })
}

interface TicketState {
  tickets: Ticket[]
  focusedTicket: Ticket | null
  messages: Message[]
  hasMoreMessages: boolean
  hasMoreTickets: boolean
  resetTickets: () => void
  loadTickets: (incoming: Ticket[]) => void
  setFocusedTicket: (ticket: Ticket | null) => void
  updateTicket: (ticket: Ticket) => void
  deleteTicket: (ticketId: number) => void
  resetUnread: (ticketId: number) => void
  updateUnread: (ticket: Ticket) => void
  setMessages: (messages: Message[], hasMore: boolean) => void
  prependMessages: (messages: Message[], hasMore: boolean) => void
  addMessage: (message: Message) => void
  updateMessage: (message: Message) => void
  patchMessage: (id: string, patch: Partial<Message>) => void
  setHasMoreTickets: (hasMore: boolean) => void
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  focusedTicket: null,
  messages: [],
  hasMoreMessages: false,
  hasMoreTickets: true,

  resetTickets: () => set({ tickets: [], hasMoreTickets: true }),

  loadTickets: incoming => {
    const state = get()
    const merged = [...state.tickets]
    incoming.forEach(ticket => {
      const idx = merged.findIndex(t => t.id === ticket.id)
      if (idx !== -1) {
        merged[idx] = ticket
        if ((ticket.unreadMessages || 0) > 0) {
          const [item] = merged.splice(idx, 1)
          merged.unshift(item)
        }
      } else if (checkTicketFilter(ticket)) {
        merged.push(ticket)
      }
    })
    set({ tickets: orderTickets(merged) })
  },

  setFocusedTicket: ticket => {
    if (!ticket) {
      set({ focusedTicket: null, messages: [], hasMoreMessages: false })
      return
    }
    set({ focusedTicket: ticket })
  },

  updateTicket: ticket => {
    const { tickets, focusedTicket } = get()
    const idx = tickets.findIndex(t => t.id === ticket.id)
    let nextTickets = tickets

    if (idx === -1) {
      if (checkTicketFilter(ticket)) {
        nextTickets = orderTickets([ticket, ...tickets])
      }
    } else {
      nextTickets = orderTickets(tickets.map((t, i) => (i === idx ? ticket : t)))
    }

    set({
      tickets: nextTickets,
      focusedTicket:
        focusedTicket?.id === ticket.id
          ? { ...focusedTicket, ...ticket, contact: ticket.contact ?? focusedTicket.contact }
          : focusedTicket
    })
  },

  deleteTicket: ticketId => {
    set({ tickets: get().tickets.filter(t => t.id !== ticketId) })
  },

  resetUnread: ticketId => {
    const next = get().tickets.map(t => (t.id === ticketId ? { ...t, unreadMessages: 0 } : t))
    set({ tickets: next })
  },

  updateUnread: ticket => {
    const { tickets } = get()
    const idx = tickets.findIndex(t => t.id === ticket.id)
    if (idx === -1) {
      if (checkTicketFilter(ticket)) {
        set({
          tickets: orderTickets([
            { ...ticket, unreadMessages: (ticket.unreadMessages || 0) + 1 },
            ...tickets
          ])
        })
      }
      return
    }
    const next = [...tickets]
    next[idx] = { ...ticket, unreadMessages: (ticket.unreadMessages || 0) + 1 }
    const [item] = next.splice(idx, 1)
    next.unshift(item)
    set({ tickets: next })
  },

  setMessages: (messages, hasMore) => set({ messages: orderMessages(normalizeMessages(messages)), hasMoreMessages: hasMore }),

  prependMessages: (messages, hasMore) => {
    const merged = orderMessages([...normalizeMessages(messages), ...get().messages])
    set({ messages: merged, hasMoreMessages: hasMore })
  },

  addMessage: message => {
    const { messages } = get()
    const normalized = normalizeMessage(message)
    if (messages.some(m => m.id === normalized.id)) return
    set({ messages: orderMessages([...messages, normalized]) })
  },

  updateMessage: message => {
    const normalized = normalizeMessage(message)
    const next = get().messages.map(m => (m.id === normalized.id ? { ...m, ...normalized } : m))
    set({ messages: orderMessages(next) })
  },

  patchMessage: (id, patch) => {
    const next = get().messages.map(m => (m.id === id ? { ...m, ...patch } : m))
    set({ messages: next })
  },

  setHasMoreTickets: hasMore => set({ hasMoreTickets: hasMore })
}))

export function getTicketsByStatus(status: string) {
  return useTicketStore.getState().tickets.filter(t => t.status === status)
}
