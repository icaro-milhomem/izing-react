import type { Message, Ticket } from '@/types/entities'

export function isCallMessage(message: Message): boolean {
  return message.sendType === 'call'
}

export function isUnansweredTicket(ticket: Ticket): boolean {
  return ticket.status === 'open' && !ticket.isGroup && ticket.answered === false
}

export function canUseWavoip(ticket?: Ticket | null): boolean {
  if (!ticket) return false
  if (ticket.status === 'closed' || ticket.status === 'pending') return false
  if (ticket.channel !== 'whatsapp') return false
  if (ticket.contact?.isGroup) return false
  if (!ticket.whatsapp?.wavoip) return false
  if (!ticket.contact?.number) return false
  return true
}

export function openWavoipCall(ticket: Ticket): void {
  const token = ticket.whatsapp?.wavoip
  const phone = ticket.contact?.number?.replace(/\D/g, '')
  if (!token || !phone) return

  const name = encodeURIComponent(ticket.contact?.name || '')
  const url = `https://app.wavoip.com/call?token=${encodeURIComponent(token)}&phone=${phone}&name=${name}&start_if_ready=true&close_after_call=true`

  window.open(
    url,
    'wavoip',
    'toolbar=no,scrollbars=no,resizable=no,top=120,left=120,width=500,height=700'
  )
}
