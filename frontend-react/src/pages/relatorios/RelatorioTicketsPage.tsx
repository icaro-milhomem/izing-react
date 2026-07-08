import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
  Link as MuiLink
} from '@mui/material'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ReportActions } from '@/components/reports/ReportActions'
import { listTickets } from '@/api/tickets'
import { listQueues } from '@/api/queues'
import { listUsers } from '@/api/users'

const TICKET_COLUMNS = [
  { key: 'id', label: '#' },
  { key: 'contactName', label: 'Contato' },
  { key: 'status', label: 'Status' },
  { key: 'lastMessage', label: 'Última msg' }
]

export function RelatorioTicketsPage() {
  const profile = localStorage.getItem('profile')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('open')
  const [queueId, setQueueId] = useState<number | ''>('')
  const [userId, setUserId] = useState<number | ''>('')
  const [enabled, setEnabled] = useState(false)

  const { data: filas = [] } = useQuery({ queryKey: ['queues'], queryFn: async () => (await listQueues()).data })
  const { data: users = [] } = useQuery({ queryKey: ['users-report'], queryFn: async () => (await listUsers()).data.users })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-tickets', search, status, queueId, userId],
    enabled,
    queryFn: async () =>
      (
        await listTickets({
          searchParam: search,
          status: [status],
          queuesIds: queueId ? [queueId] : [],
          showAll: true,
          pageNumber: 1
        })
      ).data
  })

  const tickets = useMemo(
    () => (data?.tickets || []).filter(t => !userId || t.userId === userId),
    [data?.tickets, userId]
  )

  const exportRows = useMemo(
    () =>
      tickets.map(t => ({
        id: t.id,
        contactName: t.contact?.name || t.name,
        status: t.status,
        lastMessage: t.lastMessage
      })),
    [tickets]
  )

  return (
    <AdminOnly profile={profile}>
      <PageHeader title="Relatório de Tickets" action={<Button component={Link} to="/relatorios">Voltar</Button>} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" label="Buscar" value={search} onChange={e => setSearch(e.target.value)} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value)}>
            <MenuItem value="open">Aberto</MenuItem>
            <MenuItem value="pending">Pendente</MenuItem>
            <MenuItem value="closed">Resolvido</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Fila</InputLabel>
          <Select label="Fila" value={queueId} onChange={e => setQueueId(e.target.value as number | '')}>
            <MenuItem value="">Todas</MenuItem>
            {filas.map(f => <MenuItem key={f.id} value={f.id}>{f.queue}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Atendente</InputLabel>
          <Select label="Atendente" value={userId} onChange={e => setUserId(e.target.value as number | '')}>
            <MenuItem value="">Todos</MenuItem>
            {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={() => { setEnabled(true); refetch() }}>Gerar</Button>
      </Box>
      <ReportActions
        tableId="report-tickets"
        title="Relatório de Tickets"
        exportFilename="tickets_filtrados.xlsx"
        rows={exportRows}
        columns={TICKET_COLUMNS}
        disabled={isLoading || !tickets.length}
      />
      {isLoading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small" id="report-tickets">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Contato</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Última msg</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.id}</TableCell>
                  <TableCell>{t.contact?.name || t.name}</TableCell>
                  <TableCell>{t.status}</TableCell>
                  <TableCell>{t.lastMessage}</TableCell>
                  <TableCell align="center">
                    <MuiLink component={Link} to={`/atendimento/${t.id}`}>
                      Abrir ticket
                    </MuiLink>
                  </TableCell>
                </TableRow>
              ))}
              {!tickets.length && (
                <TableRow>
                  <TableCell colSpan={5} align="center">Nenhum ticket — clique em Gerar</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AdminOnly>
  )
}
