import type { Ticket, TicketFilters } from '@/types/entities'

const defaultFilters: TicketFilters = {
  searchParam: '',
  pageNumber: 1,
  status: ['open', 'pending', 'closed'],
  showAll: false,
  count: null,
  queuesIds: [],
  withUnreadMessages: false,
  isNotAssignedUser: false,
  includeNotQueueDefined: true
}

function getSetting(key: string): boolean {
  try {
    const configuracoes = JSON.parse(localStorage.getItem('configuracoes') || '[]') as Array<{
      key: string
      value: string
    }>
    const conf = configuracoes.find(c => c.key === key)
    return conf?.value === 'enabled'
  } catch {
    return false
  }
}

export function checkTicketFilter(ticket: Ticket): boolean {
  const filtros: TicketFilters =
    JSON.parse(localStorage.getItem('filtrosAtendimento') || 'null') || defaultFilters
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as { userId?: number } | null
  const userQueues = JSON.parse(localStorage.getItem('queues') || '[]') as Array<{ id: number }>
  const filasCadastradas = JSON.parse(localStorage.getItem('filasCadastradas') || '[]') as unknown[]
  const profile = localStorage.getItem('profile')
  const isAdminShowAll = profile === 'admin' && filtros.showAll
  const isQueuesTenantExists = filasCadastradas.length > 0
  const userId = usuario?.userId || Number(localStorage.getItem('userId'))

  if (isAdminShowAll) return true
  if (ticket.isGroup) return true

  if (filtros.status.length > 0 && !filtros.status.includes(ticket.status)) {
    return false
  }

  if (ticket.userId === userId) return true

  if (getSetting('NotViewTicketsChatBot') && ticket.autoReplyId) {
    if (!ticket.userId && !ticket.queueId) return false
  }

  let isValid = true

  if (isQueuesTenantExists) {
    const isQueueUser = userQueues.findIndex(q => ticket.queueId === q.id)
    if (isQueueUser !== -1) {
      isValid = true
    } else {
      return false
    }
  }

  if (isQueuesTenantExists && filtros.queuesIds.length) {
    const isQueue = filtros.queuesIds.findIndex(q => ticket.queueId === q)
    if (isQueue === -1) return false
  }

  if (getSetting('DirectTicketsToWallets') && (ticket.contact?.wallets?.length || 0) > 0) {
    const idx = ticket.contact?.wallets?.findIndex(w => w.id === userId)
    if (idx !== -1) return true
    return false
  }

  if (getSetting('NotViewAssignedTickets') && (ticket.userId || userId) !== userId) {
    if (!ticket.userId) return true
    return false
  }

  if (filtros.isNotAssignedUser) {
    return filtros.isNotAssignedUser && !ticket.userId
  }

  return isValid
}

export function getDefaultTicketFilters(): TicketFilters {
  return { ...defaultFilters }
}

export function loadTicketFilters(): TicketFilters {
  try {
    return JSON.parse(localStorage.getItem('filtrosAtendimento') || 'null') || defaultFilters
  } catch {
    return defaultFilters
  }
}

export function saveTicketFilters(filters: TicketFilters) {
  localStorage.setItem('filtrosAtendimento', JSON.stringify(filters))
}
