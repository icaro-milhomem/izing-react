import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Typography
} from '@mui/material'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import QrCodeIcon from '@mui/icons-material/QrCode'
import { SuperOnly, PageHeader } from '@/components/PageHeader'
import { adminListChannels, type AdminChannel } from '@/api/channels'

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  } catch {
    return value
  }
}

function statusInfo(status: string) {
  switch (status) {
    case 'CONNECTED':
      return { color: 'success' as const, title: 'Conexão estabelecida!', icon: <WifiIcon color="success" /> }
    case 'DISCONNECTED':
      return { color: 'error' as const, title: 'Falha ao iniciar comunicação', icon: <WifiOffIcon color="error" /> }
    case 'qrcode':
    case 'DESTROYED':
      return { color: 'warning' as const, title: 'Aguardando leitura do QR Code', icon: <QrCodeIcon color="primary" /> }
    case 'OPENING':
      return { color: 'info' as const, title: 'Estabelecendo conexão...', icon: <CircularProgress size={28} /> }
    case 'PAIRING':
    case 'TIMEOUT':
      return { color: 'error' as const, title: 'Conexão com celular perdida', icon: <WifiOffIcon color="error" /> }
    default:
      return { color: 'default' as const, title: status, icon: null }
  }
}

function ChannelCard({ channel }: { channel: AdminChannel }) {
  const info = statusInfo(channel.status || '')
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="h6">{channel.name}</Typography>
            <Typography variant="caption" color="text.secondary">{channel.type}</Typography>
          </Box>
          <Chip label={channel.status} size="small" color={info.color} />
        </Box>
        {channel.tenant && (
          <Typography variant="body2" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
            Cliente: {channel.tenant.id} - {channel.tenant.name}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mt: 2 }}>
          {info.icon}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{info.title}</Typography>
            {channel.number && (
              <Typography variant="caption" sx={{ display: 'block' }}>Número: {channel.number}</Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Última atualização: {formatDate(channel.updatedAt)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export function SessoesSuperPage() {
  const profile = localStorage.getItem('profile')

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['admin-channels'],
    queryFn: async () => (await adminListChannels()).data
  })

  return (
    <SuperOnly profile={profile}>
      <PageHeader title="Canais" />
      {isLoading ? (
        <CircularProgress />
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {channels.map(ch => (
            <Box key={ch.id} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 11px)', lg: 'calc(25% - 12px)' } }}>
              <ChannelCard channel={ch} />
            </Box>
          ))}
          {!channels.length && (
            <Typography color="text.secondary">Nenhum canal encontrado.</Typography>
          )}
        </Box>
      )}
    </SuperOnly>
  )
}
