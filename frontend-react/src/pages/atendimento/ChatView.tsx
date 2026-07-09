import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  Avatar,
  Alert,
  Badge,
  useMediaQuery
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  Phone,
  MoreVertical,
  CalendarClock,
  CalendarDays,
  Forward,
  X,
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
  ArrowRightLeft,
  RotateCcw
} from 'lucide-react'
import { ActionIconButton } from '@/components/icons/ActionIconButton'
import { LabeledIconButton } from '@/components/icons/LabeledIconButton'
import { ICON_SIZE, ICON_STROKE } from '@/components/icons/iconStyles'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { getSocket } from '@/hooks/useSocket'
import { resolveBackendError } from '@/api/backendErrors'
import { deleteMessage, getTicket, getTicketLogs, listMessages, updateTicketStatus } from '@/api/tickets'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { useTicketStore } from '@/store/ticketStore'
import { AttendanceLogMarker } from '@/components/atendimento/AttendanceLogMarker'
import { ChannelLogo } from '@/components/atendimento/ChannelLogo'
import { ChannelSeparator } from '@/components/atendimento/ChannelSeparator'
import { MessageBubble, MessageDateSeparator } from '@/components/atendimento/MessageBubble'
import { ChatInput } from '@/components/atendimento/ChatInput'
import { ReplyPreview } from '@/components/atendimento/ReplyPreview'
import { ContactDrawer } from '@/components/atendimento/ContactDrawer'
import { ScheduledMessagesPanel } from '@/components/atendimento/ScheduledMessagesPanel'
import { TicketLogsDialog } from '@/components/atendimento/TicketLogsDialog'
import { ScheduleMessageDialog } from '@/components/atendimento/ScheduleMessageDialog'
import { TransferTicketDialog } from '@/components/atendimento/TransferTicketDialog'
import { EditMessageDialog } from '@/components/atendimento/EditMessageDialog'
import { ForwardMessageDialog } from '@/components/atendimento/ForwardMessageDialog'
import type { Contact, Message, Queue } from '@/types/entities'
import { useWhatsappStore } from '@/store/whatsappStore'
import { buildChatTimeline } from '@/utils/chatTimeline'
import { messageBelongsToTicket } from '@/utils/messageTicket'
import { getChatBubblePalette } from '@/utils/chatBubbleStyles'
import { useBrandTokens } from '@/hooks/useBrandTokens'
import { canUseWavoip, openWavoipCall } from '@/utils/callHelpers'
import type { TicketLogEntry } from '@/utils/ticketLogHelpers'

interface ChatViewProps {
  ticketId?: number
  filas: Queue[]
}

const statusLabels: Record<string, string> = {
  open: 'Em atendimento',
  pending: 'Pendente',
  closed: 'Resolvido'
}

export function ChatView({ ticketId, filas }: ChatViewProps) {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { colors, mode } = useBrandTokens()
  const chatPalette = getChatBubblePalette(mode, colors)
  const { enqueueSnackbar } = useSnackbar()
  const focusedTicket = useTicketStore(s => s.focusedTicket)
  const messages = useTicketStore(s => s.messages)
  const setFocusedTicket = useTicketStore(s => s.setFocusedTicket)
  const setViewingTicketId = useTicketStore(s => s.setViewingTicketId)
  const updateTicket = useTicketStore(s => s.updateTicket)
  const setMessages = useTicketStore(s => s.setMessages)
  const addMessage = useTicketStore(s => s.addMessage)
  const updateMessage = useTicketStore(s => s.updateMessage)
  const patchMessage = useTicketStore(s => s.patchMessage)
  const prependMessages = useTicketStore(s => s.prependMessages)
  const hasMoreMessages = useTicketStore(s => s.hasMoreMessages)
  const [messagePage, setMessagePage] = useState(1)
  const [ticketLogs, setTicketLogs] = useState<TicketLogEntry[]>([])

  const [loading, setLoading] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [contactDrawer, setContactDrawer] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduledPanelOpen, setScheduledPanelOpen] = useState(false)
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [forwardMessages, setForwardMessages] = useState<Message[]>([])
  const [forwardOpen, setForwardOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Message | null>(null)
  const [multiForward, setMultiForward] = useState(false)
  const [selectedForward, setSelectedForward] = useState<Message[]>([])
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const loadingOlderRef = useRef(false)
  const initialScrollPendingRef = useRef(false)
  const prevMessagesLengthRef = useRef(0)
  const whatsappSessions = useWhatsappStore(s => s.sessions)

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const el = messagesScrollRef.current
    if (!el) return
    if (behavior === 'smooth') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } else {
      el.scrollTop = el.scrollHeight
      bottomRef.current?.scrollIntoView({ block: 'end' })
    }
  }

  const whatsappOffline = useMemo(() => {
    if (!focusedTicket?.whatsappId || focusedTicket.channel?.includes('hub')) return false
    const session = whatsappSessions.find(s => s.id === focusedTicket.whatsappId)
    return Boolean(session && session.status !== 'CONNECTED')
  }, [focusedTicket, whatsappSessions])

  const messagesWithDates = useMemo(
    () =>
      buildChatTimeline(messages, ticketLogs, {
        channel: focusedTicket?.channel,
        whatsappId: focusedTicket?.whatsappId,
        whatsapp: focusedTicket?.whatsapp,
        ticketId: focusedTicket?.id
      }),
    [messages, ticketLogs, focusedTicket]
  )

  useEffect(() => {
    setViewingTicketId(ticketId ?? null)
    return () => setViewingTicketId(null)
  }, [ticketId, setViewingTicketId])

  useEffect(() => {
    if (!ticketId) {
      setFocusedTicket(null)
      setReplyingMessage(null)
      setTicketLogs([])
      return
    }
    setMessagePage(1)
    setReplyingMessage(null)
    setMultiForward(false)
    setSelectedForward([])
    setMessages([], false)
    setTicketLogs([])
    initialScrollPendingRef.current = true
    prevMessagesLengthRef.current = 0
    setLoading(true)

    void Promise.all([
      getTicket(ticketId)
        .then(res => setFocusedTicket(res.data))
        .catch(() => enqueueSnackbar('Erro ao carregar ticket', { variant: 'error' })),
      listMessages(ticketId, { pageNumber: 1 })
        .then(res => setMessages(res.data.messages, res.data.hasMore))
        .catch(() => enqueueSnackbar('Erro ao carregar mensagens', { variant: 'error' }))
    ]).finally(() => setLoading(false))

    void getTicketLogs(ticketId)
      .then(res => {
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data as { logs?: TicketLogEntry[] }).logs || []
        setTicketLogs(data as TicketLogEntry[])
      })
      .catch(() => setTicketLogs([]))
  }, [ticketId, setFocusedTicket, setMessages, enqueueSnackbar])

  useLayoutEffect(() => {
    if (!ticketId || loading) return

    if (initialScrollPendingRef.current) {
      const stickToBottom = () => {
        scrollToBottom('auto')
      }

      stickToBottom()
      const raf = requestAnimationFrame(() => {
        stickToBottom()
        requestAnimationFrame(stickToBottom)
      })
      const t1 = window.setTimeout(stickToBottom, 100)
      const t2 = window.setTimeout(stickToBottom, 350)

      initialScrollPendingRef.current = false
      prevMessagesLengthRef.current = messages.length

      return () => {
        cancelAnimationFrame(raf)
        window.clearTimeout(t1)
        window.clearTimeout(t2)
      }
    }

    const messagesGrew = messages.length > prevMessagesLengthRef.current

    if (messagesGrew && !loadingOlderRef.current) {
      const el = messagesScrollRef.current
      const nearBottom = el
        ? el.scrollHeight - el.scrollTop - el.clientHeight < 160
        : true
      if (nearBottom) scrollToBottom('smooth')
    }

    prevMessagesLengthRef.current = messages.length
    loadingOlderRef.current = false
  }, [ticketId, loading, messages.length])

  useEffect(() => {
    const socket = getSocket()
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as { tenantId?: number } | null
    if (!socket || !usuario?.tenantId || !ticketId) return

    const tenantId = usuario.tenantId
    let syncTimer: ReturnType<typeof setTimeout> | null = null

    const syncMessages = () => {
      void listMessages(ticketId, { pageNumber: 1 })
        .then(res => {
          res.data.messages.forEach(message => addMessage(message))
        })
        .catch(() => {})
    }

    const scheduleSync = () => {
      if (syncTimer) clearTimeout(syncTimer)
      syncTimer = setTimeout(syncMessages, 350)
    }

    const joinChat = () => {
      socket.emit(`${tenantId}:joinChatBox`, `${ticketId}`)
    }

    joinChat()
    socket.on('connect', joinChat)

    const onTicketList = (data: { type: string; payload?: Message }) => {
      if (!data.payload || !messageBelongsToTicket(data.payload, ticketId)) return
      if (data.type === 'chat:create') {
        addMessage(data.payload)
        scheduleSync()
      }
      if (data.type === 'chat:update') updateMessage(data.payload)
      if (data.type === 'chat:delete' || data.type === 'chat:ack') {
        updateMessage(data.payload)
      }
    }

    const onAppMessage = (data: { action: string; message?: Message }) => {
      if (data.action === 'update' && data.message && messageBelongsToTicket(data.message, ticketId)) {
        updateMessage(data.message)
        scheduleSync()
      }
      if (data.action === 'delete' && data.message && messageBelongsToTicket(data.message, ticketId)) {
        patchMessage(data.message.id, { isDeleted: true })
      }
    }

    socket.on(`${tenantId}:ticketList`, onTicketList)
    socket.on(`tenant:${tenantId}:appMessage`, onAppMessage)

    const poll = window.setInterval(syncMessages, 12000)

    return () => {
      if (syncTimer) clearTimeout(syncTimer)
      window.clearInterval(poll)
      socket.off('connect', joinChat)
      socket.off(`${tenantId}:ticketList`, onTicketList)
      socket.off(`tenant:${tenantId}:appMessage`, onAppMessage)
    }
  }, [ticketId, addMessage, updateMessage, patchMessage])

  const changeStatus = async (status: string) => {
    if (!ticketId || statusChanging) return
    const userId = Number(localStorage.getItem('userId'))
    setStatusChanging(true)
    try {
      const { data } = await updateTicketStatus(
        ticketId,
        status,
        Number.isFinite(userId) ? userId : undefined
      )
      updateTicket(data)
      const { data: logs } = await getTicketLogs(ticketId)
      setTicketLogs((Array.isArray(logs) ? logs : []) as TicketLogEntry[])
      const labels: Record<string, string> = {
        open: 'Atendimento iniciado',
        closed: 'Atendimento resolvido',
        pending: 'Retornado para pendentes'
      }
      enqueueSnackbar(labels[status] || 'Ticket atualizado', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        (error as { userMessage?: string }).userMessage || resolveBackendError(error),
        { variant: 'error' }
      )
    } finally {
      setStatusChanging(false)
    }
  }

  const loadOlder = async () => {
    if (!ticketId) return
    const el = messagesScrollRef.current
    const prevScrollHeight = el?.scrollHeight ?? 0
    loadingOlderRef.current = true
    const nextPage = messagePage + 1
    const res = await listMessages(ticketId, { pageNumber: nextPage })
    prependMessages(res.data.messages, res.data.hasMore)
    setMessagePage(nextPage)
    requestAnimationFrame(() => {
      if (!el) return
      el.scrollTop = el.scrollHeight - prevScrollHeight
    })
  }

  const updateContact = (contact: Contact) => {
    if (!focusedTicket) return
    setFocusedTicket({ ...focusedTicket, contact })
  }

  const handleDelete = async (message: Message) => {
    if (!message.messageId) return
    try {
      await deleteMessage(message.messageId, message as unknown as Record<string, unknown>)
      patchMessage(message.id, { isDeleted: true })
      enqueueSnackbar('Mensagem apagada', { variant: 'success' })
    } catch (err: unknown) {
      enqueueSnackbar(
        (err as { userMessage?: string }).userMessage || resolveBackendError(err) || 'Erro ao apagar',
        { variant: 'error' }
      )
    } finally {
      setDeleteConfirm(null)
    }
  }

  const toggleForwardSelection = (message: Message) => {
    setSelectedForward(prev => {
      if (prev.some(m => m.id === message.id)) {
        return prev.filter(m => m.id !== message.id)
      }
      if (prev.length >= 10) {
        enqueueSnackbar('Máximo de 10 mensagens', { variant: 'warning' })
        return prev
      }
      return [...prev, message]
    })
  }

  const openSingleForward = (message: Message) => {
    setForwardMessages([message])
    setForwardOpen(true)
  }

  const scrollToQuoted = (message: Message) => {
    const el = document.getElementById(`chat-message-${message.id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightId(message.id)
    setTimeout(() => setHighlightId(null), 3000)
  }

  const refreshTicket = async () => {
    if (!ticketId) return
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        getTicket(ticketId),
        listMessages(ticketId, { pageNumber: 1 })
      ])
      setFocusedTicket(ticketRes.data)
      messagesRes.data.messages.forEach(message => addMessage(message))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    setScheduledPanelOpen(false)
  }, [ticketId])

  const inputDisabled = focusedTicket?.status === 'pending' || focusedTicket?.status === 'closed'
  const messageActionsDisabled = inputDisabled

  if (!ticketId) {
    return (
      <EmptyState
        icon={<MessageSquare size={28} strokeWidth={1.75} />}
        title="Selecione um atendimento"
        description="Escolha um ticket na lista ao lado para visualizar a conversa."
        sx={{ flex: 1, height: '100%', bgcolor: 'background.default' }}
      />
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  const name = focusedTicket?.contact?.name || focusedTicket?.name || 'Atendimento'
  const wavoipEnabled = canUseWavoip(focusedTicket)
  const scheduledCount = (focusedTicket?.scheduledMessages || []).filter(m => !m.isDeleted).length

  const handleWavoipCall = () => {
    if (!focusedTicket || !wavoipEnabled) {
      enqueueSnackbar('Ligação Wavoip indisponível para este ticket', { variant: 'info' })
      return
    }
    openWavoipCall(focusedTicket)
  }

  return (
    <Box sx={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Paper
          elevation={0}
          sx={{
            flexShrink: 0,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Box
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              minWidth: 0
            }}
          >
            {isMobile && (
              <ActionIconButton title="Voltar para lista" onClick={() => navigate('/atendimento')}>
                <ArrowLeft size={ICON_SIZE} strokeWidth={ICON_STROKE} />
              </ActionIconButton>
            )}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                minWidth: 0
              }}
              onClick={() => setContactDrawer(true)}
            >
              <Avatar src={focusedTicket?.contact?.profilePicUrl} sx={{ width: 44, height: 44 }}>
                {name[0]}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                    {name}
                  </Typography>
                  <ChannelLogo
                    channel={focusedTicket?.channel}
                    logo={focusedTicket?.whatsapp?.logo}
                    size={20}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" noWrap>
                  #{ticketId} · {statusLabels[focusedTicket?.status || ''] || focusedTicket?.status}
                  {focusedTicket?.user?.name ? ` · ${focusedTicket.user.name}` : ''}
                </Typography>
              </Box>
            </Box>
            {focusedTicket?.status === 'closed' && (
              <Button size="small" disabled={statusChanging} onClick={() => changeStatus('open')}>
                {statusChanging ? 'Aguarde…' : 'Reabrir'}
              </Button>
            )}
            {focusedTicket?.status === 'pending' && (
              <Button size="small" color="primary" disabled={statusChanging} onClick={() => changeStatus('open')}>
                {statusChanging ? 'Aguarde…' : 'Atender'}
              </Button>
            )}
          </Box>

          {focusedTicket?.status === 'open' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.5,
                pb: 1.25,
                overflowX: 'auto',
                '&::-webkit-scrollbar': { height: 4 }
              }}
            >
              <LabeledIconButton
                label="Agenda"
                tooltip={scheduledPanelOpen ? 'Ocultar agendadas' : 'Mensagens agendadas'}
                active={scheduledPanelOpen}
                icon={
                  <Badge badgeContent={scheduledCount} color="primary" invisible={scheduledCount === 0}>
                    <CalendarDays size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                  </Badge>
                }
                onClick={() => setScheduledPanelOpen(v => !v)}
              />
              <LabeledIconButton
                label="Ligar"
                tooltip="Ligar via Wavoip"
                disabled={!wavoipEnabled}
                active={wavoipEnabled}
                icon={<Phone size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
                onClick={handleWavoipCall}
              />
              <LabeledIconButton
                label="Encaminhar"
                tooltip="Encaminhar várias mensagens"
                active={multiForward}
                icon={<Forward size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
                onClick={() => setMultiForward(v => !v)}
              />
              <LabeledIconButton
                label="Agendar"
                tooltip="Agendar mensagem"
                icon={<CalendarClock size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
                onClick={() => setScheduleOpen(true)}
              />
              <LabeledIconButton
                label="Resolver"
                tooltip="Marcar como resolvido"
                icon={<CheckCircle2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
                disabled={statusChanging}
                onClick={() => changeStatus('closed')}
                sx={{ color: 'success.main' }}
              />
              <ActionIconButton title="Mais opções" onClick={e => setMenuAnchor(e.currentTarget)}>
                <MoreVertical size={ICON_SIZE} strokeWidth={ICON_STROKE} />
              </ActionIconButton>
            </Box>
          )}
        </Paper>

        {multiForward && (
          <Paper elevation={0} sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {selectedForward.length} selecionada(s)
            </Typography>
            <Button size="small" variant="contained" disabled={!selectedForward.length} onClick={() => { setForwardMessages(selectedForward); setForwardOpen(true) }}>
              Encaminhar
            </Button>
            <ActionIconButton title="Cancelar" onClick={() => { setMultiForward(false); setSelectedForward([]) }}>
              <X size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </ActionIconButton>
          </Paper>
        )}

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem disabled={statusChanging} onClick={() => { setMenuAnchor(null); changeStatus('pending') }}>
            <ListItemIcon>
              <RotateCcw size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </ListItemIcon>
            Retornar para pendentes
          </MenuItem>
          <MenuItem onClick={() => { setMenuAnchor(null); setTransferOpen(true) }}>
            <ListItemIcon>
              <ArrowRightLeft size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </ListItemIcon>
            Transferir
          </MenuItem>
        </Menu>

        <Box
          ref={messagesScrollRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            px: 2,
            py: 1.5,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: chatPalette.wallpaper,
            backgroundImage:
              mode === 'dark'
                ? 'radial-gradient(circle at 20% 20%, rgba(32,44,51,0.35) 0, transparent 45%), radial-gradient(circle at 80% 0%, rgba(32,44,51,0.25) 0, transparent 40%)'
                : `radial-gradient(circle at 20% 20%, color-mix(in srgb, ${colors.secondary} 50%, transparent) 0, transparent 42%), radial-gradient(circle at 80% 0%, color-mix(in srgb, ${colors.primary} 12%, transparent) 0, transparent 38%)`
          }}
        >
          {hasMoreMessages && (
            <Button size="small" sx={{ alignSelf: 'center', mb: 1 }} onClick={loadOlder}>
              Carregar anteriores
            </Button>
          )}
          {messagesWithDates.map(item => {
            if (item.type === 'date') {
              return <MessageDateSeparator key={item.key} label={item.label} />
            }
            if (item.type === 'channel') {
              return (
                <ChannelSeparator
                  key={item.key}
                  channel={item.channel}
                  whatsappName={item.whatsappName}
                  whatsappLogo={item.whatsappLogo}
                  ticketId={item.ticketId}
                />
              )
            }
            if (item.type === 'log') {
              return <AttendanceLogMarker key={item.key} log={item.log} />
            }
            return (
              <MessageBubble
                key={item.key}
                message={item.message}
                highlighted={highlightId === item.message.id}
                multiForward={multiForward}
                selected={selectedForward.some(m => m.id === item.message.id)}
                onReply={messageActionsDisabled ? undefined : setReplyingMessage}
                onEdit={messageActionsDisabled ? undefined : setEditingMessage}
                onDelete={messageActionsDisabled ? undefined : setDeleteConfirm}
                onForward={messageActionsDisabled ? undefined : openSingleForward}
                onToggleForward={toggleForwardSelection}
                onQuoteClick={scrollToQuoted}
              />
            )
          })}
          <div ref={bottomRef} />
        </Box>

        {replyingMessage && (
          <Box sx={{ flexShrink: 0 }}>
            <ReplyPreview message={replyingMessage} onClear={() => setReplyingMessage(null)} />
          </Box>
        )}

        {whatsappOffline && (
          <Alert severity="warning" sx={{ flexShrink: 0, mx: 2, mb: 1 }}>
            WhatsApp desconectado. Vá em <strong>Canais</strong>, conecte a sessão e aguarde o status{' '}
            <strong>CONNECTED</strong> antes de enviar mensagens.
          </Alert>
        )}

        <Box sx={{ flexShrink: 0 }}>
          <ChatInput
            ticketId={ticketId}
            channel={focusedTicket?.channel}
            disabled={inputDisabled}
            replyingMessage={replyingMessage}
            onClearReply={() => setReplyingMessage(null)}
            onSent={refreshTicket}
          />
        </Box>

        <TransferTicketDialog open={transferOpen} ticket={focusedTicket} filas={filas} onClose={() => setTransferOpen(false)} onTransferred={setFocusedTicket} />
        <ScheduleMessageDialog
          open={scheduleOpen}
          ticketId={ticketId}
          channel={focusedTicket?.channel}
          replyingMessage={replyingMessage}
          onClose={() => setScheduleOpen(false)}
          onScheduled={refreshTicket}
        />
        <EditMessageDialog open={Boolean(editingMessage)} message={editingMessage} onClose={() => setEditingMessage(null)} onSaved={updateMessage} />
        <ForwardMessageDialog
          open={forwardOpen}
          messages={forwardMessages}
          onClose={() => setForwardOpen(false)}
          onForwarded={() => { setMultiForward(false); setSelectedForward([]); setForwardMessages([]) }}
        />
        <ConfirmDialog
          open={Boolean(deleteConfirm)}
          title="Apagar mensagem?"
          message="Mensagens antigas podem continuar visíveis no cliente."
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        />
        <TicketLogsDialog open={logsOpen} ticketId={ticketId} onClose={() => setLogsOpen(false)} />
      </Box>

      <ContactDrawer
        open={contactDrawer}
        ticket={focusedTicket}
        onClose={() => setContactDrawer(false)}
        onContactUpdated={updateContact}
        onOpenLogs={() => { setContactDrawer(false); setLogsOpen(true) }}
      />

      <ScheduledMessagesPanel
        ticket={focusedTicket}
        open={scheduledPanelOpen}
        onClose={() => setScheduledPanelOpen(false)}
        onTicketUpdated={setFocusedTicket}
      />
    </Box>
  )
}
