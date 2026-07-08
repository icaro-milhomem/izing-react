import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type DateInput = string | number | Date | null | undefined

function isNumericTimestamp(value: string | number): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  return /^\d+$/.test(value.trim())
}

function normalizeNumericTimestamp(value: string | number): number {
  const num = typeof value === 'number' ? value : Number(value.trim())
  if (!Number.isFinite(num)) return NaN
  // WhatsApp/Baileys usam segundos; o sistema usa milissegundos.
  return num < 1e12 ? num * 1000 : num
}

export function parseDate(value?: DateInput): Date | null {
  if (value == null || value === '') return null

  if (value instanceof Date) {
    return isValid(value) ? value : null
  }

  if (isNumericTimestamp(value)) {
    const date = new Date(normalizeNumericTimestamp(value))
    return isValid(date) ? date : null
  }

  if (typeof value === 'string') {
    const date = parseISO(value)
    return isValid(date) ? date : null
  }

  return null
}

export function formatRelativeTime(value?: DateInput): string | null {
  const date = parseDate(value)
  if (!date) return null

  try {
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
  } catch {
    return null
  }
}

export function formatDateTime(value?: DateInput, pattern = 'dd/MM/yyyy HH:mm'): string | null {
  const date = parseDate(value)
  if (!date) return null

  try {
    return format(date, pattern, { locale: ptBR })
  } catch {
    return null
  }
}

export function timestampOrZero(value?: DateInput): number {
  return parseDate(value)?.getTime() ?? 0
}

export function formatTicketRelativeTime(
  lastMessageAt?: DateInput,
  updatedAt?: DateInput
): string | null {
  const value = lastMessageAt != null && lastMessageAt !== '' ? lastMessageAt : updatedAt
  return formatRelativeTime(value)
}

export function formatMessageTime(value?: DateInput): string | null {
  return formatDateTime(value, 'HH:mm')
}
