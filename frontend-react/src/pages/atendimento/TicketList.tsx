import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  List,
  Typography
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { CheckCircle2, X, Inbox } from 'lucide-react'
import { getSocket } from '@/hooks/useSocket'
import { listTickets, updateTicketStatus } from '@/api/tickets'
import { resolveBackendError } from '@/api/backendErrors'
import { useTicketStore } from '@/store/ticketStore'
import { loadTicketFilters, saveTicketFilters } from '@/utils/checkTicketFilter'
import type { ChannelFilter, ChannelOption } from '@/utils/channelOptions'
import { filterTicketsByChannel, groupTicketsByChannel } from '@/utils/channelOptions'
import type { Ticket } from '@/types/entities'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { TicketChannelHeader } from '@/components/atendimento/TicketChannelHeader'
import { TicketItem } from './TicketItem'

interface TicketListProps {
  status: string
  channelId?: ChannelFilter | null
  channelOptions?: ChannelOption[]
  selectedId?: number
  bulkSelect?: boolean
  onSelect: (ticket: Ticket) => void
  onAccepted?: (ticket: Ticket) => void
  onBulkSelectChange?: (active: boolean) => void
  filters: ReturnType<typeof loadTicketFilters>
}

const emptyByStatus: Record<string, { title: string; description: string }> = {
  open: {
    title: 'Nenhum atendimento aberto',
    description: 'Tickets que você aceitou aparecem aqui.'
  },
  pending: {
    title: 'Fila vazia',
    description: 'Novos atendimentos aguardando aparecem aqui.'
  },
  closed: {
    title: 'Nenhum resolvido',
    description: 'Atendimentos finalizados ficam nesta aba.'
  }
}

export function TicketList({
  status,
  channelId,
  channelOptions = [],
  selectedId,
  bulkSelect = false,
  onSelect,
  onAccepted,
  onBulkSelectChange,
  filters
}: TicketListProps) {
  const allTickets = useTicketStore(s => s.tickets)
  const tickets = useMemo(() => {
    const byStatus = allTickets.filter(t => t.status === status && !t.isGroup)
    return filterTicketsByChannel(byStatus, channelId)
  }, [allTickets, status, channelId])
  const ticketGroups = useMemo(() => {
    if (channelId && channelId !== 'all') return null
    return groupTicketsByChannel(tickets, channelOptions)
  }, [tickets, channelId, channelOptions])
  const loadTickets = useTicketStore(s => s.loadTickets)
  const resetTickets = useTicketStore(s => s.resetTickets)
  const updateTicket = useTicketStore(s => s.updateTicket)
  const deleteTicket = useTicketStore(s => s.deleteTicket)
  const resetUnread = useTicketStore(s => s.resetUnread)
  const updateUnread = useTicketStore(s => s.updateUnread)
  const setHasMoreTickets = useTicketStore(s => s.setHasMoreTickets)
  const hasMore = useTicketStore(s => s.hasMoreTickets)

  const [loading, setLoading] = useState(false)
  const [acceptingId, setAcceptingId] = useState<number | null>(null)
  const [closingBulk, setClosingBulk] = useState(false)
  const [confirmBulkClose, setConfirmBulkClose] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const listRef = useRef<HTMLDivElement>(null)
  const { enqueueSnackbar } = useSnackbar()

  const canBulkClose = status === 'open' || status === 'pending'
  const bulkMode = bulkSelect && canBulkClose

  useEffect(() => {
    setSelectedIds([])
  }, [status, channelId, bulkSelect])

  const fetchTickets = async (pageNumber = 1, append = false) => {
    setLoading(true)
    try {
      if (pageNumber === 1 && !append) resetTickets()
      const { data } = await listTickets({
        ...filters,
        status: ['open', 'pending', 'closed'],
        pageNumber
      })
      loadTickets(data.tickets)
      setHasMoreTickets(data.hasMore)
      setPage(pageNumber)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    saveTicketFilters(filters)
    fetchTickets(1)
  }, [filters.searchParam, filters.showAll, filters.withUnreadMessages, filters.isNotAssignedUser, JSON.stringify(filters.queuesIds)])

  useEffect(() => {
    const socket = getSocket()
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as { tenantId?: number; userId?: number } | null
    if (!socket || !usuario?.tenantId) return

    const shouldUpdate = (ticket: Ticket) =>
      (!ticket.userId || ticket.userId === usuario.userId || filters.showAll)

    const onConnect = () => {
      socket.emit(`${usuario.tenantId}:joinTickets`, status)
    }

    const onTicket = (data: { action: string; ticket?: Ticket; ticketId?: number }) => {
      if (data.action === 'updateUnread' && data.ticketId) {
        resetUnread(data.ticketId)
      }
      if (data.action === 'update' && data.ticket && shouldUpdate(data.ticket)) {
        updateTicket(data.ticket)
      }
      if (data.action === 'delete' && data.ticketId) {
        deleteTicket(data.ticketId)
      }
    }

    const onAppMessage = (data: { action: string; ticket?: Ticket }) => {
      if (data.action === 'create' && data.ticket && shouldUpdate(data.ticket)) {
        updateUnread(data.ticket)
      }
    }

    onConnect()
    socket.on('connect', onConnect)
    socket.on(`${usuario.tenantId}:ticket`, onTicket)
    socket.on(`tenant:${usuario.tenantId}:ticket`, onTicket)
    socket.on(`tenant:${usuario.tenantId}:appMessage`, onAppMessage)

    return () => {
      socket.off('connect', onConnect)
      socket.off(`${usuario.tenantId}:ticket`, onTicket)
      socket.off(`tenant:${usuario.tenantId}:ticket`, onTicket)
      socket.off(`tenant:${usuario.tenantId}:appMessage`, onAppMessage)
    }
  }, [status, filters.showAll])

  const handleScroll = () => {
    const el = listRef.current
    if (!el || loading || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      fetchTickets(page + 1, true)
    }
  }

  const handleAccept = async (ticket: Ticket) => {
    if (acceptingId) return
    const userId = Number(localStorage.getItem('userId'))
    setAcceptingId(ticket.id)
    try {
      const { data } = await updateTicketStatus(
        ticket.id,
        'open',
        Number.isFinite(userId) ? userId : undefined
      )
      updateTicket(data)
      const contactName = data.name || data.contact?.name || 'Contato'
      enqueueSnackbar(`Atendimento iniciado — ${contactName} (#${data.id})`, { variant: 'success' })
      onSelect(data)
      onAccepted?.(data)
    } catch (error) {
      enqueueSnackbar(
        (error as { userMessage?: string }).userMessage || resolveBackendError(error),
        { variant: 'error' }
      )
    } finally {
      setAcceptingId(null)
    }
  }

  const toggleBulkTicket = (ticket: Ticket) => {
    setSelectedIds(prev =>
      prev.includes(ticket.id) ? prev.filter(id => id !== ticket.id) : [...prev, ticket.id]
    )
  }

  const allVisibleSelected =
    tickets.length > 0 && tickets.every(ticket => selectedIds.includes(ticket.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([])
      return
    }
    setSelectedIds(tickets.map(ticket => ticket.id))
  }

  const handleBulkClose = async () => {
    if (!selectedIds.length || closingBulk) return

    const userId = Number(localStorage.getItem('userId'))
    setClosingBulk(true)
    let success = 0
    let failed = 0

    try {
      for (const id of selectedIds) {
        try {
          const { data } = await updateTicketStatus(
            id,
            'closed',
            Number.isFinite(userId) ? userId : undefined
          )
          updateTicket(data)
          success += 1
        } catch {
          failed += 1
        }
      }

      if (success > 0) {
        enqueueSnackbar(
          success === 1
            ? '1 ticket resolvido'
            : `${success} tickets resolvidos`,
          { variant: 'success' }
        )
      }
      if (failed > 0) {
        enqueueSnackbar(
          failed === 1
            ? '1 ticket não pôde ser resolvido'
            : `${failed} tickets não puderam ser resolvidos`,
          { variant: 'error' }
        )
      }

      setSelectedIds([])
      setConfirmBulkClose(false)
      onBulkSelectChange?.(false)
    } finally {
      setClosingBulk(false)
    }
  }

  const isPendingTab = status === 'pending'
  const hideChannelBadge = Boolean(channelId && channelId !== 'all')
  const showGrouped = Boolean(ticketGroups && ticketGroups.length > 0)

  const renderTicket = (ticket: Ticket) => (
    <TicketItem
      key={ticket.id}
      ticket={ticket}
      selected={ticket.id === selectedId}
      hideChannelBadge={hideChannelBadge || showGrouped}
      accepting={acceptingId === ticket.id}
      bulkSelect={bulkMode}
      bulkChecked={selectedIds.includes(ticket.id)}
      onClick={() => onSelect(ticket)}
      onAccept={!bulkMode && isPendingTab ? handleAccept : undefined}
      onSpy={!bulkMode && isPendingTab ? onSelect : undefined}
      onBulkToggle={bulkMode ? toggleBulkTicket : undefined}
    />
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {bulkMode && (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            bgcolor: 'action.hover'
          }}
        >
          <FormControlLabel
            sx={{ mr: 0.5, ml: 0 }}
            control={
              <Checkbox
                size="small"
                checked={allVisibleSelected}
                indeterminate={selectedIds.length > 0 && !allVisibleSelected}
                onChange={toggleSelectAll}
                disabled={!tickets.length || closingBulk}
              />
            }
            label={
              <Typography variant="caption">
                {selectedIds.length}/{tickets.length}
              </Typography>
            }
          />
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={
              closingBulk ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <CheckCircle2 size={16} strokeWidth={2.25} />
              )
            }
            disabled={!selectedIds.length || closingBulk}
            onClick={() => setConfirmBulkClose(true)}
          >
            Resolver
          </Button>
          <Button
            size="small"
            color="inherit"
            startIcon={<X size={16} strokeWidth={2.25} />}
            disabled={closingBulk}
            onClick={() => {
              setSelectedIds([])
              onBulkSelectChange?.(false)
            }}
          >
            Cancelar
          </Button>
        </Box>
      )}

      <Box ref={listRef} onScroll={handleScroll} sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {showGrouped ? (
          ticketGroups!.map(group => (
            <Box key={String(group.channelId)}>
              <TicketChannelHeader
                name={group.name}
                channel={group.channel}
                logo={group.logo}
                count={group.tickets.length}
              />
              <List disablePadding>{group.tickets.map(renderTicket)}</List>
            </Box>
          ))
        ) : (
          <List disablePadding>{tickets.map(renderTicket)}</List>
        )}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!loading && tickets.length === 0 && (
          <EmptyState
            icon={<Inbox size={26} strokeWidth={1.75} />}
            title={emptyByStatus[status]?.title || 'Nenhum ticket'}
            description={emptyByStatus[status]?.description}
            sx={{ py: 6 }}
          />
        )}
      </Box>

      <ConfirmDialog
        open={confirmBulkClose}
        title="Resolver tickets selecionados?"
        message={`Deseja resolver ${selectedIds.length} ticket(s) em massa? Esta ação marca os atendimentos como resolvidos.`}
        loading={closingBulk}
        onCancel={() => {
          if (!closingBulk) setConfirmBulkClose(false)
        }}
        onConfirm={() => {
          void handleBulkClose()
        }}
      />
    </Box>
  )
}
