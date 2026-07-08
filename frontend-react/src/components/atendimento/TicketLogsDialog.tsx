import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Typography
} from '@mui/material'
import type { ElementType } from 'react'
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
import { getTicketLogs } from '@/api/tickets'
import { getTicketLogMeta, type TicketLogEntry } from '@/utils/ticketLogHelpers'

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

interface TicketLogsDialogProps {
  open: boolean
  ticketId?: number
  onClose: () => void
}

export function TicketLogsDialog({ open, ticketId, onClose }: TicketLogsDialogProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['ticket-logs', ticketId],
    enabled: open && Boolean(ticketId),
    queryFn: async () => {
      const { data } = await getTicketLogs(ticketId!)
      return (Array.isArray(data) ? data : (data as { logs?: TicketLogEntry[] }).logs || []) as TicketLogEntry[]
    }
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Logs do ticket #{ticketId}</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <CircularProgress size={24} />
        ) : logs.length === 0 ? (
          <Typography color="text.secondary">Nenhum log encontrado</Typography>
        ) : (
          <List dense>
            {logs.map(log => {
              const meta = getTicketLogMeta(log.type)
              const Icon = ICONS[meta.icon] || InfoOutlinedIcon
              return (
                <ListItem key={log.id} alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <Icon sx={{ color: meta.color }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={meta.message}
                    secondary={
                      <>
                        {log.user?.name || 'Bot'}
                        {log.queue?.queue ? ` · ${log.queue.queue}` : ''}
                        {log.createdAt
                          ? ` · ${format(parseISO(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                          : ''}
                      </>
                    }
                  />
                </ListItem>
              )
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  )
}
