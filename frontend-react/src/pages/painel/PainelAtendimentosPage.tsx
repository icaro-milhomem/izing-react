import { useEffect, useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { getDashTicketsQueues } from '@/api/statistics'
import { listQueues } from '@/api/queues'
import { getSocket } from '@/hooks/useSocket'
import { TicketItem } from '@/pages/atendimento/TicketItem'
import type { Queue, Ticket } from '@/types/entities'

type ViewMode = 'U' | 'F'

function groupByField(tickets: Ticket[], field: 'userId' | 'queueId') {
  const map = new Map<string, Ticket[]>()
  for (const t of tickets) {
    const key = String(t[field] ?? 'none')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return Array.from(map.entries()).map(([key, items]) => ({ key, items }))
}

function counterStatus(tickets: Ticket[]) {
  return {
    open: tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    closed: tickets.filter(t => t.status === 'closed').length
  }
}

export function PainelAtendimentosPage() {
  const profile = localStorage.getItem('profile')
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [visao, setVisao] = useState<ViewMode>('U')
  const [dateStart, setDateStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateEnd, setDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showAll, setShowAll] = useState(true)
  const [queuesIds, setQueuesIds] = useState<number[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])

  const { data: filas = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => (await listQueues()).data
  })

  const { isFetching, refetch } = useQuery({
    queryKey: ['dash-tickets-queues', dateStart, dateEnd, showAll, queuesIds],
    queryFn: async () => {
      const { data } = await getDashTicketsQueues({
        dateStart,
        dateEnd,
        showAll,
        queuesIds: queuesIds.length ? queuesIds : undefined
      })
      const list = Array.isArray(data) ? data : Object.values(data as Record<string, Ticket[]>).flat()
      setTickets(list as Ticket[])
      return list
    }
  })

  useEffect(() => {
    refetch()
  }, [])

  useEffect(() => {
    const socket = getSocket()
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as { tenantId?: number } | null
    if (!socket || !usuario?.tenantId) return

    const onTicket = (data: { action: string; ticket?: Ticket; ticketId?: number }) => {
      if (data.action === 'update' && data.ticket) {
        setTickets(prev => {
          const idx = prev.findIndex(t => t.id === data.ticket!.id)
          if (idx === -1) return [data.ticket!, ...prev]
          const next = [...prev]
          next[idx] = data.ticket!
          return next
        })
      }
      if (data.action === 'delete' && data.ticketId) {
        setTickets(prev => prev.filter(t => t.id !== data.ticketId))
      }
    }

    socket.on(`tenant:${usuario.tenantId}:ticket`, onTicket)
    return () => socket.off(`tenant:${usuario.tenantId}:ticket`, onTicket)
  }, [])

  const groups = useMemo(() => {
    const field = visao === 'U' ? 'userId' : 'queueId'
    return groupByField(tickets, field).map(g => ({
      ...g,
      label:
        visao === 'U'
          ? g.items[0]?.user?.name || 'Pendente'
          : filas.find(f => f.id === Number(g.key))?.queue || 'Sem fila'
    }))
  }, [tickets, visao, filas])

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title="Painel de Atendimentos"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => setDrawerOpen(true)}>Filtros</Button>
            <Button variant="contained" onClick={() => refetch()} disabled={isFetching}>Atualizar</Button>
            <Button component={Link} to="/atendimento">Atendimentos</Button>
          </Box>
        }
      />

      {isFetching ? (
        <CircularProgress />
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {groups.map(group => {
            const counts = counterStatus(group.items)
            return (
              <Card key={group.key} variant="outlined" sx={{ width: { xs: '100%', md: 320 } }}>
                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{group.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Abertos: {counts.open} · Pendentes: {counts.pending} · Total: {group.items.length}
                  </Typography>
                  <Box sx={{ mt: 1, maxHeight: 360, overflow: 'auto' }}>
                    {group.items.map(ticket => (
                      <TicketItem
                        key={ticket.id}
                        ticket={ticket}
                        selected={false}
                        onClick={() => navigate(`/atendimento/${ticket.id}`)}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )
          })}
          {!groups.length && (
            <Typography color="text.secondary">Nenhum ticket no período selecionado.</Typography>
          )}
        </Box>
      )}

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Filtros</Typography>
          <TextField fullWidth type="date" label="Início" margin="normal" slotProps={{ inputLabel: { shrink: true } }} value={dateStart} onChange={e => setDateStart(e.target.value)} />
          <TextField fullWidth type="date" label="Fim" margin="normal" slotProps={{ inputLabel: { shrink: true } }} value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
          <FormControlLabel
            control={<Switch checked={showAll} onChange={e => setShowAll(e.target.checked)} />}
            label="(Admin) Ver todos"
          />
          {!showAll && (
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Filas</InputLabel>
              <Select
                multiple
                label="Filas"
                value={queuesIds}
                onChange={e => setQueuesIds(e.target.value as number[])}
              >
                {filas.map((f: Queue) => (
                  <MenuItem key={f.id} value={f.id}>{f.queue}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Visualização</Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Visão</InputLabel>
            <Select label="Visão" value={visao} onChange={e => setVisao(e.target.value as ViewMode)}>
              <MenuItem value="U">Por usuário</MenuItem>
              <MenuItem value="F">Por fila</MenuItem>
            </Select>
          </FormControl>
          <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={() => { refetch(); setDrawerOpen(false) }}>
            Aplicar
          </Button>
        </Box>
      </Drawer>
    </AdminOnly>
  )
}
