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
  TextField,
  Typography
} from '@mui/material'
import { Link } from 'react-router-dom'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ReportActions } from '@/components/reports/ReportActions'
import { getStatisticsPerUsers } from '@/api/statistics'

interface RelatorioGenericoProps {
  title: string
  queryKey: string
  fetcher: (params: Record<string, string>) => Promise<{ data: unknown }>
  columns: Array<{ key: string; label: string }>
}

export function RelatorioGenericoPage({ title, queryKey, fetcher, columns }: RelatorioGenericoProps) {
  const profile = localStorage.getItem('profile')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isFetching, refetch } = useQuery({
    queryKey: [queryKey, startDate, endDate],
    enabled: false,
    queryFn: async () => {
      const { data: res } = await fetcher({ startDate, endDate })
      return res
    }
  })

  const rows = Array.isArray(data) ? data : (data as { rows?: unknown[] })?.rows || (data as { data?: unknown[] })?.data || []
  const tableId = `report-${queryKey}`
  const exportFilename = `${title.replace(/\s+/g, '_')}.xlsx`

  return (
    <AdminOnly profile={profile}>
      <PageHeader title={title} action={<Button component={Link} to="/relatorios">Voltar</Button>} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField type="date" label="Início" slotProps={{ inputLabel: { shrink: true } }} value={startDate} onChange={e => setStartDate(e.target.value)} />
        <TextField type="date" label="Fim" slotProps={{ inputLabel: { shrink: true } }} value={endDate} onChange={e => setEndDate(e.target.value)} />
        <Button variant="contained" onClick={() => refetch()} disabled={isFetching}>Gerar</Button>
      </Box>
      <ReportActions
        tableId={tableId}
        title={title}
        exportFilename={exportFilename}
        rows={rows as Record<string, unknown>[]}
        columns={columns}
        disabled={isFetching}
      />
      {isFetching ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small" id={tableId}>
            <TableHead>
              <TableRow>
                {columns.map(c => <TableCell key={c.key}>{c.label}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {(rows as Record<string, unknown>[]).map((row, i) => (
                <TableRow key={i}>
                  {columns.map(c => (
                    <TableCell key={c.key}>{String(row[c.key] ?? '—')}</TableCell>
                  ))}
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <Typography variant="body2" color="text.secondary">Nenhum dado</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AdminOnly>
  )
}

export function RelatorioUsuariosPage() {
  return (
    <RelatorioGenericoPage
      title="Resumo Atendimentos por Usuário"
      queryKey="stats-users"
      fetcher={getStatisticsPerUsers}
      columns={[
        { key: 'name', label: 'Usuário' },
        { key: 'total', label: 'Total' },
        { key: 'open', label: 'Abertos' },
        { key: 'closed', label: 'Resolvidos' }
      ]}
    />
  )
}
