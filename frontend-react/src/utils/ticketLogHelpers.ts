export type TicketLogType =
  | 'access'
  | 'create'
  | 'closed'
  | 'transfered'
  | 'receivedTransfer'
  | 'open'
  | 'pending'
  | 'queue'
  | 'userDefine'
  | 'delete'
  | 'chatBot'
  | 'autoClose'
  | 'retriesLimitQueue'
  | 'retriesLimitUserDefine'

export interface TicketLogEntry {
  id: number
  type: TicketLogType | string
  createdAt?: string
  user?: { id?: number; name?: string }
  queue?: { id?: number; queue?: string }
}

export const TICKET_LOG_META: Record<
  string,
  { message: string; color: string; icon: string }
> = {
  access: { message: 'Acessou o ticket', color: 'grey.700', icon: 'visibility' },
  closed: { message: 'Resolveu o ticket', color: 'success.main', icon: 'check_circle' },
  create: { message: 'Ticket criado', color: 'success.light', icon: 'add_circle' },
  delete: { message: 'Deletou o ticket', color: 'error.main', icon: 'delete' },
  open: { message: 'Iniciou o atendimento', color: 'primary.main', icon: 'play_circle' },
  pending: { message: 'Retornou atendimento para fila de pendentes', color: 'warning.main', icon: 'swap_horiz' },
  transfered: { message: 'Transferiu o atendimento', color: 'info.main', icon: 'arrow_forward' },
  receivedTransfer: { message: 'Recebeu o atendimento por transferência', color: 'info.light', icon: 'arrow_back' },
  queue: { message: 'Bot: Fila definida', color: 'success.light', icon: 'alt_route' },
  userDefine: { message: 'Bot: Usuário definido', color: 'info.light', icon: 'person_check' },
  retriesLimitQueue: { message: 'Bot: Fila definida (Limite de tentativas)', color: 'success.light', icon: 'alt_route' },
  retriesLimitUserDefine: { message: 'Bot: Usuário definido (Limite de tentativas)', color: 'info.light', icon: 'person_check' },
  chatBot: { message: 'ChatBot iniciado', color: 'primary.light', icon: 'smart_toy' },
  autoClose: { message: 'Bot: Atendimento fechado pelo cliente', color: 'primary.dark', icon: 'check_circle' }
}

export function getTicketLogMeta(type?: string) {
  if (!type) return { message: 'Evento', color: 'text.secondary', icon: 'info' }
  return TICKET_LOG_META[type] || { message: type, color: 'text.secondary', icon: 'info' }
}
