import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField
} from '@mui/material'
import { Link } from 'react-router-dom'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ReportActions } from '@/components/reports/ReportActions'
import { getContactsReport } from '@/api/statistics'

const CONTACT_COLUMNS = [
  { key: 'id', label: '#' },
  { key: 'name', label: 'Nome' },
  { key: 'number', label: 'Número' },
  { key: 'email', label: 'E-mail' }
]

export function RelatorioContatosPage() {
  const profile = localStorage.getItem('profile')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['contacts-report', startDate, endDate],
    enabled: false,
    queryFn: async () => {
      const { data: res } = await getContactsReport({ startDate, endDate })
      return res as { contacts?: Array<Record<string, unknown>> }
    }
  })

  const rows = (data?.contacts || []) as Array<{ id?: number; name?: string; number?: string; email?: string }>

  return (
    <AdminOnly profile={profile}>
      <PageHeader
        title="Relatório — Contatos"
        action={<Button component={Link} to="/relatorios">Voltar</Button>}
      />
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField type="date" label="Início" slotProps={{ inputLabel: { shrink: true } }} value={startDate} onChange={e => setStartDate(e.target.value)} />
        <TextField type="date" label="Fim" slotProps={{ inputLabel: { shrink: true } }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        <Button variant="contained" onClick={() => refetch()} disabled={isFetching}>
          Gerar
        </Button>
      </Box>
      <ReportActions
        tableId="report-contacts"
        title="Relatório — Contatos"
        exportFilename="contatos_relatorio.xlsx"
        rows={rows as Record<string, unknown>[]}
        columns={CONTACT_COLUMNS}
        disabled={isLoading || isFetching}
      />
      {isLoading || isFetching ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" id="report-contacts">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>E-mail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row.id || i}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.number}</TableCell>
                  <TableCell>{row.email || '—'}</TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={4} align="center">Nenhum dado — clique em Gerar</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AdminOnly>
  )
}
