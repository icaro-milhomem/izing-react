import type { Message } from '@/types/entities'

export function resolveMessageTicketId(message: Message): number | null {
  const fromMessage = Number(message.ticketId)
  if (Number.isFinite(fromMessage) && fromMessage > 0) return fromMessage
  const fromTicket = Number(message.ticket?.id)
  if (Number.isFinite(fromTicket) && fromTicket > 0) return fromTicket
  return null
}

export function getActiveTicketIdFromUrl(): number | null {
  if (typeof window === 'undefined') return null
  const path = `${window.location.pathname}${window.location.hash}`
  const match = path.match(/\/atendimento\/(\d+)/)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

export function messageBelongsToTicket(
  message: Message,
  ticketId: number | string | null | undefined
): boolean {
  if (ticketId == null || ticketId === '') return false
  const tid = Number(ticketId)
  if (!Number.isFinite(tid)) return false
  const messageTicketId = resolveMessageTicketId(message)
  return messageTicketId === tid
}
