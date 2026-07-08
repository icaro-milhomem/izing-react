import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Tab,
  Tabs,
  TextField,
  Typography,
  Paper,
  FormControlLabel,
  Switch,
  InputAdornment
} from '@mui/material'
import { SlidersHorizontal, Plus, Contact, Search, ListChecks, Inbox, Clock, MessageSquare, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LabeledIconButton } from '@/components/icons/LabeledIconButton'
import { ICON_SIZE, ICON_STROKE } from '@/components/icons/iconStyles'
import type { Ticket } from '@/types/entities'
import { loadTicketFilters, saveTicketFilters } from '@/utils/checkTicketFilter'
import { listQueues } from '@/api/queues'
import { useWhatsappStore } from '@/store/whatsappStore'
import { TicketFiltersDrawer } from '@/components/atendimento/TicketFiltersDrawer'
import { NewTicketDialog } from '@/components/atendimento/NewTicketDialog'
import { ChannelSelector } from '@/components/atendimento/ChannelSelector'
import { TicketTabLabel } from '@/components/atendimento/TicketTabLabel'
import { useTicketStore } from '@/store/ticketStore'
import {
  buildChannelOptions,
  countTicketsByStatusAndChannel,
  type ChannelFilter
} from '@/utils/channelOptions'
import { TicketList } from './TicketList'
import { ChatView } from './ChatView'
import { EmptyState } from '@/components/EmptyState'

const statusTabs = [
  { value: 'open', label: 'Abertos', icon: MessageSquare },
  { value: 'pending', label: 'Pendentes', icon: Clock },
  { value: 'closed', label: 'Resolvidos', icon: CheckCircle2 }
] as const

export function AtendimentoPage() {
  const navigate = useNavigate()
  const { ticketId: ticketIdParam } = useParams()
  const ticketId = ticketIdParam ? Number(ticketIdParam) : undefined
  const profile = localStorage.getItem('profile')
  const username = localStorage.getItem('username')
  const firstName = username?.split(' ')[0] || 'atendente'

  const [tab, setTab] = useState('open')
  const [selectedChannel, setSelectedChannel] = useState<ChannelFilter | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(loadTicketFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [newTicketOpen, setNewTicketOpen] = useState(false)
  const [bulkSelect, setBulkSelect] = useState(false)

  const { data: filas = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => (await listQueues()).data
  })

  const whatsapps = useWhatsappStore(s => s.sessions)

  const allTickets = useTicketStore(s => s.tickets)
  const focusedTicket = useTicketStore(s => s.focusedTicket)

  const channelOptions = useMemo(
    () => buildChannelOptions(whatsapps, allTickets),
    [whatsapps, allTickets]
  )

  useEffect(() => {
    if (!ticketId) return

    const ticket =
      focusedTicket?.id === ticketId
        ? focusedTicket
        : allTickets.find(item => item.id === ticketId)

    if (!ticket) return

    if (ticket.status) {
      setTab(ticket.status)
    }

    const whatsappId = ticket.whatsapp?.id
    if (whatsappId) {
      setSelectedChannel(whatsappId)
    }
  }, [ticketId, focusedTicket?.id, allTickets])

  useEffect(() => {
    if (channelOptions.length === 0) {
      setSelectedChannel(null)
      return
    }

    if (selectedChannel != null && channelOptions.some(option => option.id === selectedChannel)) {
      return
    }

    if (channelOptions.length === 1) {
      setSelectedChannel(channelOptions[0].id)
      return
    }

    setSelectedChannel('all')
  }, [channelOptions, selectedChannel])

  const activeFilters = useMemo(
    () => ({ ...filters, searchParam: search }),
    [filters, search]
  )

  const statusCounts = useMemo(
    () => ({
      open: countTicketsByStatusAndChannel(allTickets, 'open', selectedChannel),
      pending: countTicketsByStatusAndChannel(allTickets, 'pending', selectedChannel),
      closed: 0
    }),
    [allTickets, selectedChannel]
  )

  useEffect(() => {
    if (tab === 'closed') setBulkSelect(false)
  }, [tab])

  const handleSelectChannel = (channelId: ChannelFilter) => {
    setSelectedChannel(channelId)
    setTab('open')
    setBulkSelect(false)
  }

  const handleSelectTicket = (ticket: Ticket) => {
    navigate(`/atendimento/${ticket.id}`)
  }

  const applyFilters = (next: typeof filters) => {
    setFilters(next)
    saveTicketFilters(next)
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Paper
        elevation={0}
        sx={{
          width: { xs: '100%', md: 380 },
          display: { xs: ticketId ? 'none' : 'flex', md: 'flex' },
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          borderRight: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Olá,{' '}
              <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {firstName}
              </Box>
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link to="/atendimento/contatos" style={{ textDecoration: 'none', color: 'inherit' }}>
                <LabeledIconButton
                  label="Contatos"
                  icon={<Contact size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
                />
              </Link>
              <LabeledIconButton
                label="Filtros"
                icon={<SlidersHorizontal size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
                onClick={() => setFiltersOpen(true)}
              />
              <LabeledIconButton
                label="Em massa"
                tooltip="Fechar tickets em massa"
                active={bulkSelect}
                disabled={tab === 'closed'}
                icon={<ListChecks size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
                onClick={() => setBulkSelect(v => !v)}
              />
              <LabeledIconButton
                label="Novo"
                tooltip="Novo ticket"
                icon={<Plus size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
                onClick={() => setNewTicketOpen(true)}
              />
            </Box>
          </Box>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar atendimentos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ mt: 1.25 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                  </InputAdornment>
                )
              }
            }}
          />
          {profile === 'admin' && (
            <FormControlLabel
              sx={{ mt: 0.5 }}
              control={
                <Switch
                  size="small"
                  checked={filters.showAll}
                  onChange={e => applyFilters({ ...filters, showAll: e.target.checked })}
                />
              }
              label="Ver todos (admin)"
            />
          )}
        </Box>

        <ChannelSelector
          channels={channelOptions}
          selectedId={selectedChannel}
          onSelect={handleSelectChannel}
        />

        {selectedChannel != null ? (
          <>
            <Tabs
              value={tab}
              onChange={(_, v) => {
                setTab(v)
                if (v === 'closed') setBulkSelect(false)
              }}
              variant="fullWidth"
            >
              {statusTabs.map(s => (
                <Tab
                  key={s.value}
                  value={s.value}
                  label={
                    <TicketTabLabel
                      label={s.label}
                      icon={s.icon}
                      count={s.value === 'closed' ? 0 : statusCounts[s.value]}
                    />
                  }
                />
              ))}
            </Tabs>
            <TicketList
              status={tab}
              channelId={selectedChannel}
              channelOptions={channelOptions}
              selectedId={ticketId}
              bulkSelect={bulkSelect}
              onSelect={handleSelectTicket}
              onAccepted={() => setTab('open')}
              onBulkSelectChange={setBulkSelect}
              filters={activeFilters}
            />
          </>
        ) : (
          <EmptyState
            icon={<Inbox size={28} strokeWidth={1.75} />}
            title="Escolha um canal"
            description="Selecione um canal acima para ver os atendimentos."
            sx={{ flex: 1 }}
          />
        )}
      </Paper>

      <Box
        sx={{
          flex: 1,
          display: { xs: ticketId ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        <ChatView ticketId={ticketId} filas={filas} />
      </Box>

      <TicketFiltersDrawer
        open={filtersOpen}
        filters={filters}
        filas={filas}
        isAdmin={profile === 'admin'}
        onClose={() => setFiltersOpen(false)}
        onChange={applyFilters}
      />
      <NewTicketDialog
        open={newTicketOpen}
        onClose={() => setNewTicketOpen(false)}
        onCreated={ticket => navigate(`/atendimento/${ticket.id}`)}
      />
    </Box>
  )
}
