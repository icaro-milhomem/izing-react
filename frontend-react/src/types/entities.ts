export interface Queue {
  id: number
  queue: string
  isActive: boolean
}

export interface Tag {
  id: number
  tag: string
  color: string
  isActive: boolean
}

export interface FastReply {
  id: number
  key: string
  message: string
}

export interface Contact {
  id: number
  name: string
  number: string
  email?: string
  profilePicUrl?: string
  instagramPK?: number
  telegramId?: string
  tags?: Tag[]
  wallets?: Array<{ id: number; name?: string }>
  extraInfo?: Array<{ name: string; value: string }>
}

export interface WhatsappSession {
  id: number
  name: string
  type: string
  status: string
  qrcode?: string
  number?: string
  queueId?: number | null
  chatFlowId?: number | null
  isDefault?: boolean
  wavoip?: string
  logo?: string
  farewellMessage?: string
  tokenTelegram?: string
  instagramUser?: string
  instagramKey?: string
  wabaBSP?: string
  tokenAPI?: string
  fbPageId?: string
  fbObject?: { name?: string; accountId?: string }
  phone?: Record<string, unknown>
  updatedAt?: string
}

export interface Ticket {
  id: number
  status: 'open' | 'pending' | 'closed'
  lastMessage?: string
  lastMessageAt?: string | number
  updatedAt?: string
  unreadMessages?: number
  userId?: number | null
  queueId?: number | null
  tenantId?: number
  isGroup?: boolean
  answered?: boolean
  autoReplyId?: number | null
  contact?: Contact & { isGroup?: boolean }
  contactId?: number
  whatsappId?: number
  whatsapp?: Pick<WhatsappSession, 'id' | 'name' | 'wavoip' | 'logo'>
  channel?: string
  profilePicUrl?: string
  name?: string
  username?: string
  queue?: string
  chatFlowId?: number | null
  stepChatFlow?: number | null
  stepAutoReplyId?: number | null
  user?: Pick<User, 'id' | 'name'>
  scheduledMessages?: Message[]
}

export interface Message {
  id: string
  messageId?: string
  body: string
  fromMe: boolean
  timestamp?: string
  createdAt?: string
  ticketId?: number
  ticket?: Pick<
    Ticket,
    'id' | 'contact' | 'userId' | 'queueId' | 'channel' | 'whatsappId' | 'whatsapp'
  >
  mediaType?: string
  mediaUrl?: string
  ack?: number
  contact?: Contact
  quotedMsg?: Message
  isDeleted?: boolean
  edited?: string | boolean
  scheduleDate?: string
  mediaName?: string
  status?: string
  sendType?: string
}

export interface User {
  id: number
  name: string
  email: string
  profile: 'admin' | 'user' | 'super'
  isActive?: boolean
  status?: 'online' | 'offline'
  queues?: Queue[]
}

export interface Setting {
  id?: number
  key: string
  value: string
}

export interface Tenant {
  id: number
  name: string
  status?: string
  email?: string
  planId?: number
  dueDate?: string
}

export interface ChatFlow {
  id: number
  name: string
  isActive?: boolean
}

export interface TicketFilters {
  searchParam: string
  pageNumber: number
  status: string[]
  showAll: boolean
  count: number | null
  queuesIds: number[]
  withUnreadMessages: boolean
  isNotAssignedUser: boolean
  includeNotQueueDefined: boolean
}

export interface TicketsResponse {
  tickets: Ticket[]
  count: number
  hasMore: boolean
}
