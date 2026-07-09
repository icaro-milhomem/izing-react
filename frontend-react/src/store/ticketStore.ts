import { create } from 'zustand'
import type { Message, Ticket } from '@/types/entities'
import { checkTicketFilter } from '@/utils/checkTicketFilter'
import { timestampOrZero } from '@/utils/formatDate'
import { getActiveTicketIdFromUrl, messageBelongsToTicket } from '@/utils/messageTicket'
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

function resolveViewingTicketId(
  viewingTicketId: number | null,
  focusedTicket: Ticket | null
): number | null {
  return viewingTicketId ?? focusedTicket?.id ?? getActiveTicketIdFromUrl()
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const merged = [...incoming]
  existing.forEach(message => {
    const duplicate = merged.some(
      item =>
        item.id === message.id ||
        (message.messageId && item.messageId === message.messageId)
    )
    if (!duplicate) merged.push(message)
  })
  return orderMessages(merged)
}

interface TicketState {
  tickets: Ticket[]
  focusedTicket: Ticket | null
  viewingTicketId: number | null
  messages: Message[]
  hasMoreMessages: boolean
  hasMoreTickets: boolean
  resetTickets: () => void
  loadTickets: (incoming: Ticket[]) => void
  setViewingTicketId: (ticketId: number | null) => void
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
  viewingTicketId: null,
  messages: [],
  hasMoreMessages: false,
  hasMoreTickets: true,

  resetTickets: () => set({ tickets: [], hasMoreTickets: true }),

  setViewingTicketId: ticketId => set({ viewingTicketId: ticketId }),

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
    const existing = idx !== -1 ? tickets[idx] : null
    const merged: Ticket = {
      ...(existing || {}),
      ...ticket,
      contact: ticket.contact ?? existing?.contact,
      whatsapp: ticket.whatsapp ?? existing?.whatsapp,
      user: ticket.user ?? existing?.user
    }

    let nextTickets = tickets
    if (idx === -1) {
      if (checkTicketFilter(merged)) {
        nextTickets = orderTickets([merged, ...tickets])
      }
    } else {
      nextTickets = orderTickets(tickets.map((t, i) => (i === idx ? merged : t)))
    }

    set({
      tickets: nextTickets,
      focusedTicket:
        focusedTicket?.id === merged.id
          ? {
              ...focusedTicket,
              ...merged,
              contact: merged.contact ?? focusedTicket.contact,
              whatsapp: merged.whatsapp ?? focusedTicket.whatsapp,
              user: merged.user ?? focusedTicket.user
            }
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

  setMessages: (messages, hasMore) => {
    if (messages.length === 0) {
      set({ messages: [], hasMoreMessages: hasMore })
      return
    }
    const { messages: existing } = get()
    set({
      messages: mergeMessages(existing, normalizeMessages(messages)),
      hasMoreMessages: hasMore
    })
  },

  prependMessages: (messages, hasMore) => {
    const merged = orderMessages([...normalizeMessages(messages), ...get().messages])
    set({ messages: merged, hasMoreMessages: hasMore })
  },

  addMessage: message => {
    const { messages, focusedTicket, viewingTicketId } = get()
    const activeTicketId = resolveViewingTicketId(viewingTicketId, focusedTicket)
    const normalized = normalizeMessage(message)

    if (activeTicketId != null && !messageBelongsToTicket(normalized, activeTicketId)) {
      return
    }

    const existingIndex = messages.findIndex(
      m =>
        m.id === normalized.id ||
        (normalized.messageId && m.messageId && m.messageId === normalized.messageId)
    )

    if (existingIndex !== -1) {
      const next = [...messages]
      next[existingIndex] = { ...next[existingIndex], ...normalized }
      set({ messages: orderMessages(next) })
      return
    }

    set({ messages: orderMessages([...messages, normalized]) })
  },

  updateMessage: message => {
    const { messages, focusedTicket, viewingTicketId } = get()
    const activeTicketId = resolveViewingTicketId(viewingTicketId, focusedTicket)
    const normalized = normalizeMessage(message)
    let found = false

    const next = messages.map(m => {
      if (m.id === normalized.id) {
        found = true
        return { ...m, ...normalized }
      }
      if (
        normalized.messageId &&
        m.messageId &&
        m.messageId === normalized.messageId
      ) {
        found = true
        return { ...m, ...normalized }
      }
      return m
    })

    if (
      !found &&
      (activeTicketId == null || messageBelongsToTicket(normalized, activeTicketId))
    ) {
      next.push(normalized)
    }

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
