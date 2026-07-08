import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Message } from '@/types/entities'
import { parseDate } from './formatDate'

export function stripUserSignature(body: string): string {
  return body
    .replace(/^\*[^*]+\*:\s*\n?\s*/, '')
    .replace(/^Editada:\s*/i, '')
    .replace(/^Mensagem anterior:\s*/i, '')
    .replace(/^[^*]*:\s*$/gm, '')
    .trim()
}

export function formatMessageDay(value?: string | number | null): string | null {
  const date = parseDate(value ?? null)
  if (!date) return null
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

export function messageDayKey(message: Message): string | null {
  return formatMessageDay(message.timestamp || message.createdAt)
}

export function canEditMessage(message: Message): boolean {
  return Boolean(
    !message.isDeleted &&
      message.fromMe &&
      (message.mediaType === 'chat' || !message.mediaType) &&
      message.messageId
  )
}

export function canDeleteMessage(message: Message): boolean {
  return Boolean(!message.isDeleted && message.fromMe && message.messageId)
}

export function canForwardMessage(message: Message): boolean {
  return Boolean(!message.isDeleted)
}
