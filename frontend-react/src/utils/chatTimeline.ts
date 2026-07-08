import type { Message } from '@/types/entities'
import { messageDayKey } from '@/utils/messageHelpers'
import type { TicketLogEntry } from '@/utils/ticketLogHelpers'
import { parseDate } from '@/utils/formatDate'

export type ChatTimelineItem =
  | { type: 'date'; label: string; key: string }
  | {
      type: 'channel'
      key: string
      channel?: string | null
      whatsappName?: string | null
      whatsappLogo?: string | null
      ticketId?: number
    }
  | { type: 'log'; key: string; log: TicketLogEntry }
  | { type: 'msg'; key: string; message: Message }

const SESSION_LOG_TYPES = new Set([
  'create',
  'access',
  'open',
  'chatBot',
  'queue',
  'userDefine',
  'retriesLimitQueue',
  'retriesLimitUserDefine',
  'receivedTransfer'
])

function eventTime(value?: string | number | null): number {
  const date = parseDate(value ?? null)
  return date?.getTime() ?? 0
}

function messageTicketId(message: Message): number | undefined {
  return message.ticketId ?? message.ticket?.id
}

function sortLogs(logs: TicketLogEntry[]) {
  return [...logs].sort((a, b) => {
    const diff = eventTime(a.createdAt) - eventTime(b.createdAt)
    if (diff !== 0) return diff
    return a.id - b.id
  })
}

function sortMessages(messages: Message[]) {
  return [...messages].sort((a, b) => {
    const diff =
      eventTime(a.timestamp || a.createdAt) - eventTime(b.timestamp || b.createdAt)
    if (diff !== 0) return diff
    return a.id.localeCompare(b.id)
  })
}

export function buildChatTimeline(
  messages: Message[],
  logs: TicketLogEntry[],
  fallback?: {
    channel?: string | null
    whatsappId?: number | null
    whatsapp?: { name?: string | null; logo?: string | null }
    ticketId?: number
  }
): ChatTimelineItem[] {
  const sortedLogs = sortLogs(logs)
  const sortedMessages = sortMessages(messages)
  const focusTicketId = fallback?.ticketId

  const sessionLogs = sortedLogs.filter(log => SESSION_LOG_TYPES.has(log.type))
  const inlineLogs = sortedLogs.filter(log => !SESSION_LOG_TYPES.has(log.type))

  const firstFocusMessageIndex = focusTicketId
    ? sortedMessages.findIndex(message => messageTicketId(message) === focusTicketId)
    : -1

  const items: ChatTimelineItem[] = []
  let lastDay: string | null = null
  let lastWhatsappId: number | null | undefined = undefined
  let sessionLogsInserted = false
  let inlineLogIndex = 0

  const pushLog = (log: TicketLogEntry) => {
    items.push({ type: 'log', key: `log-${log.id}`, log })
  }

  const pushMessage = (message: Message) => {
    const day = messageDayKey(message)
    if (day && day !== lastDay) {
      items.push({ type: 'date', label: day, key: `date-${day}-${message.id}` })
      lastDay = day
    }

    const whatsappId = message.ticket?.whatsappId ?? fallback?.whatsappId
    const channel = message.ticket?.channel ?? fallback?.channel
    const whatsapp = message.ticket?.whatsapp ?? fallback?.whatsapp

    if (whatsappId != null && whatsappId !== lastWhatsappId) {
      items.push({
        type: 'channel',
        key: `channel-${whatsappId}-${message.id}`,
        channel,
        whatsappName: whatsapp?.name,
        whatsappLogo: whatsapp?.logo,
        ticketId: messageTicketId(message)
      })
      lastWhatsappId = whatsappId
    }

    items.push({ type: 'msg', key: message.id, message })
  }

  const insertSessionLogs = () => {
    if (sessionLogsInserted || sessionLogs.length === 0) return

    if (fallback?.whatsappId != null && lastWhatsappId === undefined) {
      items.push({
        type: 'channel',
        key: `channel-${fallback.whatsappId}-session`,
        channel: fallback.channel,
        whatsappName: fallback.whatsapp?.name,
        whatsappLogo: fallback.whatsapp?.logo,
        ticketId: focusTicketId
      })
      lastWhatsappId = fallback.whatsappId
    }

    sessionLogs.forEach(pushLog)
    sessionLogsInserted = true
  }

  const flushInlineLogsBefore = (message: Message) => {
    const msgTicketId = messageTicketId(message)
    const msgTime = eventTime(message.timestamp || message.createdAt)

    while (inlineLogIndex < inlineLogs.length) {
      const log = inlineLogs[inlineLogIndex]
      const logTime = eventTime(log.createdAt)

      if (focusTicketId && msgTicketId !== focusTicketId) break
      if (logTime > msgTime) break

      pushLog(log)
      inlineLogIndex += 1
    }
  }

  if (firstFocusMessageIndex === -1) {
    insertSessionLogs()
    sortedMessages.forEach(message => {
      flushInlineLogsBefore(message)
      pushMessage(message)
    })
  } else {
    for (let index = 0; index < firstFocusMessageIndex; index += 1) {
      flushInlineLogsBefore(sortedMessages[index])
      pushMessage(sortedMessages[index])
    }

    insertSessionLogs()

    for (let index = firstFocusMessageIndex; index < sortedMessages.length; index += 1) {
      const message = sortedMessages[index]
      flushInlineLogsBefore(message)
      pushMessage(message)
    }
  }

  while (inlineLogIndex < inlineLogs.length) {
    pushLog(inlineLogs[inlineLogIndex])
    inlineLogIndex += 1
  }

  return items
}
