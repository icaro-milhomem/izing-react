import { format } from 'date-fns'
import { Box, Button, IconButton, Typography } from '@mui/material'
import { X } from 'lucide-react'
import type { Message, Ticket } from '@/types/entities'
import { getGlobalNotifier, type InAppNotifier } from '@/utils/snackbarUtils'
import { getActiveTicketIdFromUrl } from '@/utils/messageTicket'
import {
  playConfiguredNotificationSound,
  previewNotificationSound
} from '@/utils/notificationSoundSettings'

const recentKeys = new Map<string, number>()

export function initNotificationAudio() {
  /* Mantido por compatibilidade — o áudio usa Web Audio API. */
}

export function unlockNotificationAudio() {
  previewNotificationSound()
}

export function playNotificationSound() {
  playConfiguredNotificationSound()
}

export function isViewingTicketChat(ticketId: number): boolean {
  const activeId = getActiveTicketIdFromUrl()
  return activeId != null && activeId === ticketId
}

const INTERNAL_CHAT_PEER_KEY = 'internalChatPeerId'
const INTERNAL_CHAT_OPEN_KEY = 'internalChatOpenPeerId'

export function setInternalChatPeerId(peerId: number | null) {
  if (peerId) sessionStorage.setItem(INTERNAL_CHAT_PEER_KEY, String(peerId))
  else sessionStorage.removeItem(INTERNAL_CHAT_PEER_KEY)
}

export function setInternalChatOpenPeerId(peerId: number) {
  sessionStorage.setItem(INTERNAL_CHAT_OPEN_KEY, String(peerId))
}

export function consumeInternalChatOpenPeerId(): number | null {
  const raw = sessionStorage.getItem(INTERNAL_CHAT_OPEN_KEY)
  sessionStorage.removeItem(INTERNAL_CHAT_OPEN_KEY)
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

export function isViewingInternalChat(peerId: number): boolean {
  const path = `${window.location.pathname}${window.location.hash}`
  if (!path.includes('chat-interno')) return false
  const active = Number(sessionStorage.getItem(INTERNAL_CHAT_PEER_KEY))
  return active === peerId
}

export function shouldNotifyInternalMessage(
  senderId: number,
  receiverId: number,
  currentUserId: number
): boolean {
  if (!senderId || !receiverId || !currentUserId) return false
  if (receiverId !== currentUserId) return false
  if (senderId === currentUserId) return false
  if (isViewingInternalChat(senderId)) return false
  return true
}

function userCanReceiveTicketNotification(ticket: Ticket): boolean {
  const userId = Number(localStorage.getItem('userId'))
  const profile = localStorage.getItem('profile')

  if (profile === 'admin') return true
  if (ticket.userId && ticket.userId !== userId) return false
  if (ticket.userId && ticket.userId === userId) return true

  const userQueues = JSON.parse(localStorage.getItem('queues') || '[]') as Array<{ id: number }>
  const filasCadastradas = JSON.parse(localStorage.getItem('filasCadastradas') || '[]') as unknown[]

  if (filasCadastradas.length > 0 && ticket.queueId) {
    return userQueues.some(q => q.id === ticket.queueId)
  }

  return true
}

export function shouldReceiveIncomingMessage(payload: Message | null | undefined): boolean {
  try {
    if (!payload || payload.fromMe) return false
    const ticket = payload.ticket as Ticket | undefined
    if (!ticket?.id) return false
    return userCanReceiveTicketNotification(ticket)
  } catch {
    return true
  }
}

export function shouldShowIncomingMessageToast(ticketId: number): boolean {
  return !isViewingTicketChat(ticketId)
}

/** @deprecated use shouldReceiveIncomingMessage + shouldShowIncomingMessageToast */
export function shouldNotifyIncomingMessage(payload: Message | null | undefined): boolean {
  if (!shouldReceiveIncomingMessage(payload)) return false
  const ticket = payload?.ticket as Ticket | undefined
  if (!ticket?.id) return false
  return shouldShowIncomingMessageToast(ticket.id)
}

function shouldSkipDuplicate(key: string): boolean {
  const now = Date.now()
  const lastAt = recentKeys.get(key)
  if (lastAt && now - lastAt < 800) return true
  recentKeys.set(key, now)
  return false
}

export function canUseBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && 'Notification' in window
}

export function getBrowserNotificationBlockReason(): string | null {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) {
    return 'Seu navegador não suporta notificações nativas.'
  }
  if (!window.isSecureContext) {
    const { protocol, hostname, port } = window.location
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
    if (protocol === 'http:' && !isLocalHost) {
      return `Popups do sistema exigem HTTPS ou localhost. Você está em ${protocol}//${hostname}${port ? `:${port}` : ''}. Use http://localhost:5173 ou inicie com npm run dev:https.`
    }
    return 'Popups do sistema exigem uma conexão segura (HTTPS ou localhost).'
  }
  return null
}

async function showBrowserNotification(
  title: string,
  options: NotificationOptions,
  onClick?: () => void
) {
  if (!canUseBrowserNotifications()) return false
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      return false
    }
  }
  if (Notification.permission !== 'granted') return false

  const icon =
    options.icon && String(options.icon).startsWith('https://')
      ? String(options.icon)
      : `${window.location.origin}/favicon.svg`

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          ...options,
          icon,
          badge: `${window.location.origin}/favicon.svg`
        } as NotificationOptions)
        return true
      }
    }
  } catch {
    /* fallback below */
  }

  try {
    const notification = new Notification(title, { ...options, icon })
    notification.onclick = () => {
      window.focus()
      onClick?.()
      notification.close()
    }
    setTimeout(() => notification.close(), 10000)
    return true
  } catch {
    return false
  }
}

function isAppTabActive(): boolean {
  return document.visibilityState === 'visible'
}

function resolveNotifier(notifier?: InAppNotifier): InAppNotifier | null {
  return notifier ?? getGlobalNotifier()
}

async function deliverNotification(
  title: string,
  body: string,
  options: {
    notifier?: InAppNotifier
    onOpen?: () => void
    dedupeKey?: string
    browserTag?: string
    browserIcon?: string
    showInApp?: boolean
  }
) {
  if (options.dedupeKey && shouldSkipDuplicate(options.dedupeKey)) return

  playNotificationSound()

  const notifier = resolveNotifier(options.notifier)
  const onOpen = options.onOpen
  const showInApp = options.showInApp !== false

  if (showInApp && notifier) {
    showInAppNotification(notifier, title, body, onOpen)
  }

  if (!isAppTabActive() && canUseBrowserNotifications()) {
    await showBrowserNotification(
      title,
      {
        body,
        icon: options.browserIcon,
        tag: options.browserTag || `notify-${Date.now()}`
      },
      onOpen
    )
  }
}
export function showInAppNotification(
  notifier: InAppNotifier,
  title: string,
  body: string,
  onOpen?: () => void
) {
  const key = notifier.enqueueSnackbar(
    <Box sx={{ pr: 1, minWidth: 220 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'common.white' }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.92)', display: 'block', mt: 0.25 }}>
        {body}
      </Typography>
    </Box>,
    {
      variant: 'info',
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      autoHideDuration: 8000,
      preventDuplicate: false,
      key: `notify-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      style: { zIndex: 9999 },
      action: snackKey => (
        <>
          {onOpen ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                onOpen()
                notifier.closeSnackbar(snackKey)
              }}
            >
              Abrir
            </Button>
          ) : null}
          <IconButton size="small" color="inherit" onClick={() => notifier.closeSnackbar(snackKey)}>
            <X size={16} />
          </IconButton>
        </>
      )
    }
  )
  return key
}

export async function notifyIncomingMessage(
  payload: Message,
  onOpen?: (ticketId: number) => void,
  notifier?: InAppNotifier
) {
  const ticket = payload.ticket as Ticket | undefined
  if (!ticket?.id || !shouldReceiveIncomingMessage(payload)) return

  const messageKey = payload.messageId || payload.id
  const contact = ticket.contact || payload.contact
  const bodyText =
    (payload.body && String(payload.body).trim()) ||
    (payload.mediaType ? `[${payload.mediaType}]` : '') ||
    'Nova mensagem'

  const title = contact?.name ? `Mensagem de ${contact.name}` : 'Nova mensagem'
  const body = `${bodyText} - ${format(new Date(), 'HH:mm')}`

  await deliverNotification(title, body, {
    notifier,
    onOpen: () => onOpen?.(ticket.id!),
    dedupeKey: messageKey ? `${ticket.id}:${messageKey}` : undefined,
    browserTag: `ticket-${ticket.id}-${Date.now()}`,
    browserIcon: contact?.profilePicUrl,
    showInApp: shouldShowIncomingMessageToast(ticket.id)
  })
}

export async function notifyPendingClient(
  contactName: string | undefined,
  notifier?: InAppNotifier,
  onOpen?: () => void
) {
  const body = `Cliente: ${contactName || 'Novo contato'} - ${format(new Date(), 'HH:mm')}`

  await deliverNotification('Novo cliente pendente', body, {
    notifier,
    onOpen,
    dedupeKey: `pending:${contactName || 'novo'}`,
    browserTag: `pending-${Date.now()}`
  })
}

export async function notifyInternalMessage(
  payload: {
    id?: number
    senderId: number
    message?: string
    body?: string
    senderName?: string
    sender?: { id?: number; name?: string }
  },
  onOpen?: (senderId: number) => void,
  notifier?: InAppNotifier
) {
  const senderId = Number(payload.senderId)
  const senderName =
    payload.senderName || payload.sender?.name || 'Atendente'
  const bodyText =
    (payload.message && String(payload.message).trim()) ||
    (payload.body && String(payload.body).trim()) ||
    'Nova mensagem'

  const title = `Chat interno: ${senderName}`
  const body = `${bodyText} - ${format(new Date(), 'HH:mm')}`

  await deliverNotification(title, body, {
    notifier,
    onOpen: () => onOpen?.(senderId),
    dedupeKey: payload.id ? `internal:${payload.id}` : `internal:${senderId}:${bodyText}`,
    browserTag: `internal-${senderId}-${Date.now()}`
  })
}
