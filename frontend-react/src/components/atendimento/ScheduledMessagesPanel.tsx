import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { useSnackbar } from 'notistack'
import { deleteMessage } from '@/api/tickets'
import { resolveBackendError } from '@/api/backendErrors'
import { formatDateTime } from '@/utils/formatDate'
import type { Message, Ticket } from '@/types/entities'

interface ScheduledMessagesPanelProps {
  ticket: Ticket | null
  open: boolean
  onClose: () => void
  onTicketUpdated: (ticket: Ticket) => void
}

function PanelContent({
  scheduled,
  onDelete
}: {
  scheduled: Message[]
  onDelete: (message: Message) => void
}) {
  return (
    <>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {scheduled.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Nenhuma mensagem agendada
          </Typography>
        ) : (
          <List dense disablePadding>
            {scheduled.map(message => (
              <ListItem
                key={message.id}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => onDelete(message)}>
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ borderBottom: 1, borderColor: 'divider', alignItems: 'flex-start' }}
              >
                <ListItemText
                  primary={
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                      {formatDateTime(message.scheduleDate) || '—'}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {message.body || '(mídia)'}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </>
  )
}

export function ScheduledMessagesPanel({ ticket, open, onClose, onTicketUpdated }: ScheduledMessagesPanelProps) {
  const { enqueueSnackbar } = useSnackbar()
  const scheduled = (ticket?.scheduledMessages || []).filter(m => !m.isDeleted)

  const handleDelete = async (message: Message) => {
    if (!message.messageId) return
    try {
      await deleteMessage(message.messageId, message as unknown as Record<string, unknown>)
      const next = (ticket?.scheduledMessages || []).filter(m => m.id !== message.id)
      if (ticket) onTicketUpdated({ ...ticket, scheduledMessages: next })
      enqueueSnackbar('Agendamento cancelado', { variant: 'success' })
    } catch (err: unknown) {
      enqueueSnackbar(
        (err as { userMessage?: string }).userMessage || resolveBackendError(err) || 'Erro ao cancelar',
        { variant: 'error' }
      )
    }
  }

  if (!ticket) return null

  const header = (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
        Mensagens agendadas
        {scheduled.length > 0 ? ` (${scheduled.length})` : ''}
      </Typography>
      <IconButton size="small" onClick={onClose} aria-label="Fechar mensagens agendadas">
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  )

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          width: open ? { lg: 300 } : 0,
          flexShrink: 0,
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          borderLeft: open ? 1 : 0,
          borderColor: 'divider',
          bgcolor: 'background.default',
          transition: theme => theme.transitions.create('width', { duration: theme.transitions.duration.shortest })
        }}
      >
        {open && (
          <>
            {header}
            <PanelContent scheduled={scheduled} onDelete={handleDelete} />
          </>
        )}
      </Paper>

      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{ display: { lg: 'none' } }}
        slotProps={{ paper: { sx: { width: 300 } } }}
      >
        {header}
        <PanelContent scheduled={scheduled} onDelete={handleDelete} />
      </Drawer>
    </>
  )
}
