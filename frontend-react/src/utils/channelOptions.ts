import type { Ticket, WhatsappSession } from '@/types/entities'

export type ChannelFilter = number | 'all'

export interface ChannelOption {
  id: ChannelFilter
  name: string
  channel?: string | null
  logo?: string | null
}

export function buildChannelOptions(
  whatsapps: WhatsappSession[],
  tickets: Ticket[]
): ChannelOption[] {
  const map = new Map<number, ChannelOption>()

  whatsapps.forEach(session => {
    if (!session?.id) return
    map.set(session.id, {
      id: session.id,
      name: session.name || `Canal ${session.id}`,
      channel: session.type,
      logo: session.logo || null
    })
  })

  tickets.forEach(ticket => {
    const whatsapp = ticket.whatsapp
    if (!whatsapp?.id) return

    const existing = map.get(whatsapp.id)
    if (existing) {
      if (!existing.logo && whatsapp.logo) existing.logo = whatsapp.logo
      if (!existing.name && whatsapp.name) existing.name = whatsapp.name
      return
    }

    map.set(whatsapp.id, {
      id: whatsapp.id,
      name: whatsapp.name || `Canal ${whatsapp.id}`,
      channel: ticket.channel,
      logo: whatsapp.logo || null
    })
  })

  const channels = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))

  if (channels.length <= 1) return channels

  return [{ id: 'all', name: 'Todas', channel: null, logo: null }, ...channels]
}

export function filterTicketsByChannel(tickets: Ticket[], channelId?: ChannelFilter | null) {
  if (!channelId || channelId === 'all') return tickets
  return tickets.filter(ticket => ticket.whatsapp?.id === channelId)
}

export interface TicketChannelGroup {
  channelId: number | 'other'
  name: string
  channel?: string | null
  logo?: string | null
  tickets: Ticket[]
}

export function groupTicketsByChannel(
  tickets: Ticket[],
  channelOptions: ChannelOption[]
): TicketChannelGroup[] {
  const buckets = new Map<number, Ticket[]>()
  const other: Ticket[] = []

  tickets.forEach(ticket => {
    const id = ticket.whatsapp?.id
    if (id) {
      const list = buckets.get(id) ?? []
      list.push(ticket)
      buckets.set(id, list)
    } else {
      other.push(ticket)
    }
  })

  const ordered: TicketChannelGroup[] = []

  channelOptions
    .filter(option => option.id !== 'all')
    .forEach(option => {
      const id = option.id as number
      const groupTickets = buckets.get(id)
      if (!groupTickets?.length) return
      ordered.push({
        channelId: id,
        name: option.name,
        channel: option.channel,
        logo: option.logo,
        tickets: groupTickets
      })
      buckets.delete(id)
    })

  buckets.forEach((groupTickets, id) => {
    if (!groupTickets.length) return
    const sample = groupTickets[0]
    ordered.push({
      channelId: id,
      name: sample.whatsapp?.name || `Canal ${id}`,
      channel: sample.channel,
      logo: sample.whatsapp?.logo ?? null,
      tickets: groupTickets
    })
  })

  if (other.length) {
    ordered.push({
      channelId: 'other',
      name: 'Outros',
      channel: null,
      logo: null,
      tickets: other
    })
  }

  return ordered
}

export function countTicketsByStatusAndChannel(
  tickets: Ticket[],
  status: string,
  channelId?: ChannelFilter | null
) {
  return filterTicketsByChannel(tickets, channelId).filter(
    ticket => ticket.status === status && !ticket.isGroup
  ).length
}
