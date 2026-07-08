import type { ElementType } from 'react'
import { Box, Typography } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined'
import AltRouteIcon from '@mui/icons-material/AltRoute'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TicketLogEntry } from '@/utils/ticketLogHelpers'
import { getTicketLogMeta } from '@/utils/ticketLogHelpers'

const ICONS: Record<string, ElementType> = {
  visibility: VisibilityOutlinedIcon,
  check_circle: CheckCircleOutlinedIcon,
  add_circle: AddCircleOutlinedIcon,
  delete: DeleteOutlinedIcon,
  play_circle: PlayCircleOutlinedIcon,
  swap_horiz: SwapHorizIcon,
  arrow_forward: ArrowForwardIcon,
  arrow_back: ArrowBackIcon,
  alt_route: AltRouteIcon,
  person_check: PersonOutlinedIcon,
  smart_toy: SmartToyOutlinedIcon,
  info: InfoOutlinedIcon
}

interface AttendanceLogMarkerProps {
  log: TicketLogEntry
}

export function AttendanceLogMarker({ log }: AttendanceLogMarkerProps) {
  const meta = getTicketLogMeta(log.type)
  const Icon = ICONS[meta.icon] || InfoOutlinedIcon
  const actor = log.user?.name || 'Bot'
  const when = log.createdAt
    ? format(parseISO(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    : null

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'flex-start',
          gap: 1,
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: 'grey.100',
          border: 1,
          borderColor: 'divider',
          maxWidth: '90%'
        }}
      >
        <Icon sx={{ fontSize: 18, color: meta.color, mt: 0.15 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: meta.color }}>
            {meta.message}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {actor}
            {log.queue?.queue ? ` · ${log.queue.queue}` : ''}
            {when ? ` · ${when}` : ''}
          </Typography>
        </Box>
        <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.2 }} />
      </Box>
    </Box>
  )
}
