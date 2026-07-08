import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputAdornment,
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
  Typography,
  CircularProgress
} from '@mui/material'
import {
  Headphones,
  PhoneOutgoing,
  PhoneIncoming,
  UserPlus,
  Timer,
  Hourglass,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import { PageHeader } from '@/components/PageHeader'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { listQueues } from '@/api/queues'
import { useApexChartBaseOptions } from '@/utils/chartTheme'
import { useBrandTokens } from '@/hooks/useBrandTokens'
import {
  getStatisticsTicketsChannels,
  getStatisticsTicketsEvolutionByPeriod,
  getStatisticsTicketsEvolutionChannels,
  getStatisticsTicketsPerUsersDetail,
  getStatisticsTicketsQueue,
  getStatisticsTicketsTimes
} from '@/api/statistics'

interface DashTimes {
  qtd_total_atendimentos?: number
  qtd_demanda_ativa?: number
  qtd_demanda_receptiva?: number
  new_contacts?: number
  tma?: number
  tme?: number
}

interface UserPerformance {
  name?: string
  email?: string
  qtd_pendentes?: number
  qtd_em_atendimento?: number
  qtd_resolvidos?: number
  qtd_por_usuario?: number
  tme?: number
  tma?: number
}

interface ChannelEvolutionRow {
  dt_referencia: string
  label: string
  qtd: number
}

function formatMetric(value: unknown, fallback: string | number = 0): string | number {
  if (value == null || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function formatDurationSeconds(value?: number | null): string {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const total = Math.round(Number(value))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatTmaMinutes(tma?: number): string | number {
  if (tma == null) return '—'
  const n = Number(tma)
  if (!Number.isFinite(n)) return '—'
  return Math.round(n / 60)
}

function groupChannelEvolution(rows: ChannelEvolutionRow[]) {
  const categories = [...new Set(rows.map(r => r.dt_referencia))].sort()
  const byLabel = new Map<string, Map<string, number>>()
  rows.forEach(row => {
    if (!byLabel.has(row.label)) byLabel.set(row.label, new Map())
    byLabel.get(row.label)!.set(row.dt_referencia, Number(row.qtd))
  })
  const series = [...byLabel.entries()].map(([name, map]) => ({
    name,
    data: categories.map(c => map.get(c) || 0)
  }))
  return { categories, series }
}

function resolvePaletteColor(theme: Theme, color: string) {
  if (color.startsWith('#')) return color
  const [paletteKey, shade = 'main'] = color.split('.') as ['primary' | 'success' | 'info' | 'warning', 'main' | string]
  const palette = theme.palette[paletteKey]
  if (palette && typeof palette === 'object' && 'main' in palette) {
    return (palette as { main: string })[shade as 'main'] || palette.main
  }
  return color
}

function MetricCard({
  label,
  value,
  color,
  icon
}: {
  label: string
  value: string | number
  color: string
  icon: ReactNode
}) {
  const theme = useTheme()
  const display = typeof value === 'number' && Number.isNaN(value) ? '—' : value
  const resolvedColor = resolvePaletteColor(theme, color)

  return (
    <Card sx={{ minWidth: 168, flex: '1 1 168px', overflow: 'hidden', position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          top: -24,
          right: -24,
          width: 88,
          height: 88,
          borderRadius: '50%',
          bgcolor: alpha(resolvedColor, 0.08)
        }}
      />
      <CardContent>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            mb: 2,
            bgcolor: alpha(resolvedColor, 0.12),
            color: resolvedColor,
            border: `1px solid ${alpha(resolvedColor, 0.18)}`
          }}
        >
          {icon}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: resolvedColor, lineHeight: 1.1 }}>{display}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{label}</Typography>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { colors } = useBrandTokens()
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)
  const [queuesIds, setQueuesIds] = useState<number[]>([])

  const params = useMemo(
    () => ({ startDate, endDate, queuesIds: queuesIds.length ? queuesIds : undefined }),
    [startDate, endDate, queuesIds]
  )

  const { data: filas = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => (await listQueues()).data
  })

  const { data: times, isLoading: loadingTimes, refetch: refetchTimes } = useQuery({
    queryKey: ['dash-times', params],
    queryFn: async () => {
      const { data } = await getStatisticsTicketsTimes(params)
      return (Array.isArray(data) ? data[0] : data) as DashTimes
    }
  })

  const { data: queueData = [], refetch: refetchQueue } = useQuery({
    queryKey: ['dash-queue', params],
    queryFn: async () => {
      const { data } = await getStatisticsTicketsQueue(params)
      return data as Array<{ label: string; qtd: number }>
    }
  })

  const { data: channelData = [], refetch: refetchChannels } = useQuery({
    queryKey: ['dash-channels', params],
    queryFn: async () => {
      const { data } = await getStatisticsTicketsChannels(params)
      return data as Array<{ label: string; qtd: number }>
    }
  })

  const { data: evolution = [], refetch: refetchEvolution } = useQuery({
    queryKey: ['dash-evolution', params],
    queryFn: async () => {
      const { data } = await getStatisticsTicketsEvolutionByPeriod(params)
      return data as Array<{ dt_referencia: string; qtd: number; label?: string }>
    }
  })

  const { data: channelEvolution = [], refetch: refetchChannelEvolution } = useQuery({
    queryKey: ['dash-evolution-channels', params],
    queryFn: async () => {
      const { data } = await getStatisticsTicketsEvolutionChannels(params)
      return data as ChannelEvolutionRow[]
    }
  })

  const { data: usersDetail = [], refetch: refetchUsers } = useQuery({
    queryKey: ['dash-users-detail', params],
    queryFn: async () => {
      const { data } = await getStatisticsTicketsPerUsersDetail(params)
      return data as UserPerformance[]
    }
  })

  const refreshAll = () => {
    refetchTimes()
    refetchQueue()
    refetchChannels()
    refetchEvolution()
    refetchChannelEvolution()
    refetchUsers()
  }

  const setToday = () => {
    setStartDate(today)
    setEndDate(today)
  }

  const channelEvolutionChart = useMemo(() => groupChannelEvolution(channelEvolution), [channelEvolution])
  const chartBase = useApexChartBaseOptions()

  const pieOptions: ApexOptions = { ...chartBase, labels: queueData.map(q => q.label), legend: { ...chartBase.legend, position: 'bottom' } }
  const channelOptions: ApexOptions = { ...chartBase, labels: channelData.map(c => c.label), legend: { ...chartBase.legend, position: 'bottom' } }
  const lineOptions: ApexOptions = {
    ...chartBase,
    xaxis: { ...chartBase.xaxis, categories: evolution.map(e => e.dt_referencia || e.label || '') },
    stroke: { curve: 'smooth' }
  }
  const channelLineOptions: ApexOptions = {
    ...chartBase,
    xaxis: { ...chartBase.xaxis, categories: channelEvolutionChart.categories },
    stroke: { curve: 'smooth' },
    legend: { ...chartBase.legend, position: 'bottom' }
  }

  const tmaMinutes = formatTmaMinutes(times?.tma)
  const tmeFormatted = formatDurationSeconds(times?.tme)

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral dos atendimentos e performance da equipe"
      />

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            type="date"
            label="Início"
            size="small"
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Calendar size={16} strokeWidth={2} />
                  </InputAdornment>
                )
              }
            }}
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <TextField
            type="date"
            label="Fim"
            size="small"
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Calendar size={16} strokeWidth={2} />
                  </InputAdornment>
                )
              }
            }}
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
          <Button variant="outlined" onClick={setToday}>Hoje</Button>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filas</InputLabel>
            <Select multiple label="Filas" value={queuesIds} onChange={e => setQueuesIds(e.target.value as number[])}>
              {filas.map(f => (
                <MenuItem key={f.id} value={f.id}>{f.queue}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<RefreshCw size={18} strokeWidth={2.25} />} onClick={refreshAll}>
            Atualizar
          </Button>
        </CardContent>
      </Card>

      {loadingTimes ? (
        <CircularProgress />
      ) : (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <MetricCard label="Total Atendimentos" value={formatMetric(times?.qtd_total_atendimentos)} color="primary.main" icon={<Headphones size={20} strokeWidth={2.25} />} />
          <MetricCard label="Ativo" value={formatMetric(times?.qtd_demanda_ativa)} color="success.main" icon={<PhoneOutgoing size={20} strokeWidth={2.25} />} />
          <MetricCard label="Receptivo" value={formatMetric(times?.qtd_demanda_receptiva)} color="info.main" icon={<PhoneIncoming size={20} strokeWidth={2.25} />} />
          <MetricCard label="Novos Contatos" value={formatMetric(times?.new_contacts)} color="warning.main" icon={<UserPlus size={20} strokeWidth={2.25} />} />
          <MetricCard label="TMA (min)" value={tmaMinutes} color={colors.primary} icon={<Timer size={20} strokeWidth={2.25} />} />
          <MetricCard label="TME" value={tmeFormatted} color={colors.accent} icon={<Hourglass size={20} strokeWidth={2.25} />} />
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Atendimentos por Fila</Typography>
            <Chart type="donut" height={300} options={pieOptions} series={queueData.map(q => Number(q.qtd))} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Atendimentos por Canal</Typography>
            <Chart type="pie" height={300} options={channelOptions} series={channelData.map(c => Number(c.qtd))} />
          </CardContent>
        </Card>
        <Card sx={{ gridColumn: { md: '1 / -1' } }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Evolução no Período</Typography>
            <Chart type="area" height={320} options={lineOptions} series={[{ name: 'Atendimentos', data: evolution.map(e => Number(e.qtd)) }]} />
          </CardContent>
        </Card>
        <Card sx={{ gridColumn: { md: '1 / -1' } }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Evolução por Canais</Typography>
            <Chart type="area" height={320} options={channelLineOptions} series={channelEvolutionChart.series} />
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Performance dos Usuários</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell align="center">Pendentes</TableCell>
                  <TableCell align="center">Atendendo</TableCell>
                  <TableCell align="center">Finalizados</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">T.M.E</TableCell>
                  <TableCell align="center">T.M.A</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usersDetail.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.name ? `${row.name}${row.email ? ` | ${row.email}` : ''}` : 'Não informado'}</TableCell>
                    <TableCell align="center">{row.qtd_pendentes ?? 0}</TableCell>
                    <TableCell align="center">{row.qtd_em_atendimento ?? 0}</TableCell>
                    <TableCell align="center">{row.qtd_resolvidos ?? 0}</TableCell>
                    <TableCell align="center">{row.qtd_por_usuario ?? 0}</TableCell>
                    <TableCell align="center">{formatDurationSeconds(row.tme)}</TableCell>
                    <TableCell align="center">{formatDurationSeconds(row.tma)}</TableCell>
                  </TableRow>
                ))}
                {!usersDetail.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Sem dados no período</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}
