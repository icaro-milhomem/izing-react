import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { getSocket } from '@/hooks/useSocket'
import { listWhatsapps } from '@/api/whatsapp'
import { useWhatsappStore } from '@/store/whatsappStore'
import { useTicketStore } from '@/store/ticketStore'
import { useUsersAppStore, type OnlineUserBubble } from '@/store/usersAppStore'
import type { Message } from '@/types/entities'
import { fetchNotificationTickets } from '@/utils/fetchNotifications'
import { scheduleNotificationRefresh } from '@/utils/scheduleNotificationRefresh'
import {
  notifyIncomingMessage,
  notifyInternalMessage,
  notifyPendingClient,
  setInternalChatOpenPeerId,
  shouldNotifyIncomingMessage,
  shouldNotifyInternalMessage,
  unlockNotificationAudio
} from '@/utils/notifications'
import { useNotificationStore } from '@/store/notificationStore'

function getTenantId(): number | null {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as { tenantId?: number } | null
    return usuario?.tenantId ?? null
  } catch {
    return null
  }
}

function getCurrentUserId(): number | null {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as { userId?: number } | null
    const fromStorage = Number(localStorage.getItem('userId'))
    const id = usuario?.userId ?? (Number.isFinite(fromStorage) ? fromStorage : null)
    return id != null && Number.isFinite(Number(id)) ? Number(id) : null
  } catch {
    return null
  }
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  const notifier = { enqueueSnackbar, closeSnackbar }
  const updateSession = useWhatsappStore(s => s.updateSession)
  const deleteSession = useWhatsappStore(s => s.deleteSession)
  const updateTicket = useTicketStore(s => s.updateTicket)
  const setUsersApp = useUsersAppStore(s => s.setUsersApp)
  const patchUserStatus = useUsersAppStore(s => s.patchUserStatus)

  useEffect(() => {
    const unlock = () => unlockNotificationAudio()
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true, capture: true })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock, { capture: true })
    }
  }, [])

  useEffect(() => {
    void fetchNotificationTickets()
  }, [])

  useEffect(() => {
    const socket = getSocket()
    const tenantId = getTenantId()
    if (!socket || !tenantId) return

    const joinNotification = () => socket.emit(`${tenantId}:joinNotification`)

    joinNotification()
    socket.on('connect', joinNotification)

    const onWhatsapp = (data: { action: string; whatsapp?: unknown; whatsappId?: number }) => {
      if (data.action === 'update' && data.whatsapp) {
        updateSession(data.whatsapp as Parameters<typeof updateSession>[0])
        queryClient.invalidateQueries({ queryKey: ['whatsapps'] })
      }
      if (data.action === 'delete' && data.whatsappId) {
        deleteSession(data.whatsappId)
        queryClient.invalidateQueries({ queryKey: ['whatsapps'] })
      }
    }

    const onContactList = () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    }

    const onOnlineBubbles = (data: OnlineUserBubble[]) => {
      setUsersApp(data)
    }

    const onUsers = (data: {
      action: string
      data?: { email?: string; status?: 'online' | 'offline'; isOnline?: boolean }
    }) => {
      if (data.action === 'update' && data.data?.email) {
        const status =
          data.data.status || (data.data.isOnline ? 'online' : 'offline')
        if (status) patchUserStatus(data.data.email, status)
        queryClient.invalidateQueries({ queryKey: ['users-internal'] })
      }
    }

    const onTicketList = (data: { type: string; payload?: Message & { contact?: { name?: string } } }) => {
      if (data.type === 'chat:create') {
        if (data.payload && shouldNotifyIncomingMessage(data.payload)) {
          const payload = data.payload
          void notifyIncomingMessage(
            payload,
            ticketId => navigate(`/atendimento/${ticketId}`),
            notifier
          )
        }
        if (data.payload?.ticket) {
          updateTicket(data.payload.ticket as import('@/types/entities').Ticket)
        }
        scheduleNotificationRefresh(() => {
          void fetchNotificationTickets()
        })
      }
      if (data.type === 'notification:new') {
        const contactName = data.payload?.contact?.name || data.payload?.ticket?.contact?.name
        void notifyPendingClient(
          contactName,
          notifier,
          () => navigate('/atendimento')
        )
        if (data.payload?.ticket) {
          updateTicket(data.payload.ticket as import('@/types/entities').Ticket)
        }
        scheduleNotificationRefresh(() => {
          void fetchNotificationTickets()
        })
      }
    }

    const onWhatsappSession = (data: {
      action: string
      session?: Parameters<typeof updateSession>[0] & { name?: string; number?: string }
    }) => {
      if (data.action === 'update' && data.session) {
        updateSession(data.session as Parameters<typeof updateSession>[0])
        queryClient.invalidateQueries({ queryKey: ['whatsapps'] })
      }
      if (data.action === 'readySession' && data.session) {
        enqueueSnackbar(
          `WhatsApp pronto: ${data.session.name} (${data.session.number})`,
          { variant: 'success' }
        )
      }
    }

    const onBattery = (data: { batteryInfo?: { sessionName?: string; battery?: number } }) => {
      const info = data.batteryInfo
      if (info) {
        enqueueSnackbar(
          `Bateria baixa em ${info.sessionName}: ${info.battery}%`,
          { variant: 'warning' }
        )
      }
    }

    const currentUserId = getCurrentUserId()
    const onInternalMessage = (raw: {
      id?: number
      senderId?: number
      receiverId?: number
      message?: string
      senderName?: string
      sender?: { id?: number; name?: string }
    }) => {
      if (!currentUserId) return

      const senderId = Number(raw.senderId ?? raw.sender?.id)
      const receiverId = Number(raw.receiverId)
      if (!shouldNotifyInternalMessage(senderId, receiverId, currentUserId)) return

      const senderName = raw.senderName || raw.sender?.name || 'Atendente'
      const body = (raw.message && String(raw.message).trim()) || 'Nova mensagem'

      useNotificationStore.getState().addInternalMessage(senderId, senderName, body)

      void notifyInternalMessage(
        { ...raw, senderId, message: body, senderName },
        peerId => {
          setInternalChatOpenPeerId(peerId)
          navigate('/chat-interno')
        },
        notifier
      )
    }

    socket.on(`${tenantId}:whatsapp`, onWhatsapp)
    socket.on(`${tenantId}:ticketList`, onTicketList)
    socket.on(`${tenantId}:whatsappSession`, onWhatsappSession)
    socket.on(`${tenantId}:change_battery`, onBattery)
    socket.on(`${tenantId}:contactList`, onContactList)
    socket.on(`${tenantId}:chat:updateOnlineBubbles`, onOnlineBubbles)
    socket.on(`${tenantId}:users`, onUsers)
    if (currentUserId) {
      socket.on(`${tenantId}:internal_message:${currentUserId}`, onInternalMessage)
    }

    listWhatsapps()
      .then(res => useWhatsappStore.getState().setSessions(res.data))
      .catch(() => {})

    return () => {
      socket.off('connect', joinNotification)
      socket.off(`${tenantId}:whatsapp`, onWhatsapp)
      socket.off(`${tenantId}:ticketList`, onTicketList)
      socket.off(`${tenantId}:whatsappSession`, onWhatsappSession)
      socket.off(`${tenantId}:change_battery`, onBattery)
      socket.off(`${tenantId}:contactList`, onContactList)
      socket.off(`${tenantId}:chat:updateOnlineBubbles`, onOnlineBubbles)
      socket.off(`${tenantId}:users`, onUsers)
      if (currentUserId) {
        socket.off(`${tenantId}:internal_message:${currentUserId}`, onInternalMessage)
      }
    }
  }, [
    closeSnackbar,
    enqueueSnackbar,
    navigate,
    queryClient,
    updateSession,
    deleteSession,
    updateTicket,
    setUsersApp,
    patchUserStatus
  ])

  return children
}
