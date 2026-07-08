import { formatTicketRelativeTime } from '@/utils/formatDate'
import {
  Avatar,
  Badge,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'
import { Eye, Phone, SendHorizonal } from 'lucide-react'
import { ICON_SIZE, ICON_STROKE } from '@/components/icons/iconStyles'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import type { Ticket } from '@/types/entities'
import { ChannelLogo } from '@/components/atendimento/ChannelLogo'
import { isUnansweredTicket } from '@/utils/callHelpers'

function getStatusColor(status: string, palette: Theme['palette'], unanswered: boolean) {
  if (unanswered) return palette.warning.main
  if (status === 'open') return palette.info.main
  if (status === 'pending') return palette.error.main
  if (status === 'closed') return palette.success.main
  return palette.divider
}

function isChatbotTicket(ticket: Ticket) {
  return (
    ticket.status === 'pending' &&
    ((ticket.stepAutoReplyId && ticket.autoReplyId) ||
      (ticket.chatFlowId && ticket.stepChatFlow))
  )
}

interface TicketItemProps {
  ticket: Ticket
  selected: boolean
  hideChannelBadge?: boolean
  accepting?: boolean
  bulkSelect?: boolean
  bulkChecked?: boolean
  onClick: () => void
  onAccept?: (ticket: Ticket) => void
  onSpy?: (ticket: Ticket) => void
  onBulkToggle?: (ticket: Ticket) => void
}

export function TicketItem({
  ticket,
  selected,
  hideChannelBadge,
  accepting,
  bulkSelect,
  bulkChecked,
  onClick,
  onAccept,
  onSpy,
  onBulkToggle
}: TicketItemProps) {
  const theme = useTheme()
  const name = ticket.name || ticket.contact?.name || 'Sem nome'
  const timeLabel = formatTicketRelativeTime(ticket.lastMessageAt, ticket.updatedAt)
  const unanswered = isUnansweredTicket(ticket)
  const chatbot = isChatbotTicket(ticket)
  const isPending = ticket.status === 'pending'
  const statusColor = getStatusColor(ticket.status, theme.palette, unanswered)
  const isActive = selected || Boolean(bulkChecked)
  const queueLabel = ticket.queue || ''
  const userLabel = ticket.username || ticket.user?.name || ''

  const handleClick = () => {
    if (bulkSelect && onBulkToggle) {
      onBulkToggle(ticket)
      return
    }
    onClick()
  }

  return (
    <ListItemButton
      selected={selected || Boolean(bulkChecked)}
      onClick={handleClick}
      sx={{
        position: 'relative',
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: 2.5,
        mb: 0.75,
        mx: 1,
        alignItems: 'flex-start',
        pr: isPending && !bulkSelect ? 6 : 2,
        bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : alpha(statusColor, 0.04),
        transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          bgcolor: isActive ? alpha(theme.palette.primary.main, 0.12) : alpha(statusColor, 0.08)
        },
        '&.Mui-selected': {
          bgcolor: alpha(theme.palette.primary.main, 0.1)
        }
      }}
    >
      {bulkSelect && (
        <Checkbox
          size="small"
          checked={Boolean(bulkChecked)}
          onClick={e => e.stopPropagation()}
          onChange={() => onBulkToggle?.(ticket)}
          sx={{ mt: 0.75, mr: 0.5, p: 0.5 }}
        />
      )}
      <ListItemAvatar sx={{ minWidth: 56 }}>
        {isPending && onAccept ? (
          <Tooltip title="Atender">
            <span>
              <IconButton
                color="success"
                disabled={accepting}
                onClick={e => {
                  e.stopPropagation()
                  onAccept(ticket)
                }}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  color: 'success.contrastText',
                  '&:hover': { bgcolor: 'success.dark' },
                  '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
                }}
              >
                {accepting ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  <Badge badgeContent={ticket.unreadMessages || 0} color="warning">
                    <SendHorizonal size={22} strokeWidth={ICON_STROKE} />
                  </Badge>
                )}
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <Badge badgeContent={ticket.unreadMessages || 0} color="primary">
            <Avatar src={ticket.profilePicUrl || ticket.contact?.profilePicUrl}>
              {name[0]}
            </Avatar>
          </Badge>
        )}
      </ListItemAvatar>

      <ListItemText
        primary={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pr: 1 }}>
            <Typography
              component="span"
              variant="subtitle2"
              noWrap
              sx={{ fontWeight: 600, maxWidth: '70%', display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              {name}
              <ChannelLogo channel={ticket.channel} logo={ticket.whatsapp?.logo} size={16} />
              {unanswered && (
                <Tooltip title="Aguardando resposta">
                  <Phone size={16} strokeWidth={2.25} color={theme.palette.warning.main} />
                </Tooltip>
              )}
            </Typography>
            {timeLabel && (
              <Typography component="span" variant="caption" color="text.secondary" noWrap>
                {timeLabel}
              </Typography>
            )}
          </Box>
        }
        secondary={
          <Box component="span" sx={{ display: 'block' }}>
            <Box
              component="span"
              sx={{
                display: 'block',
                typography: 'body2',
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {ticket.lastMessage}
            </Box>
            <Box
              component="span"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                mt: 0.25
              }}
            >
              <Typography component="span" variant="caption" color="text.secondary">
                #{ticket.id}
                {queueLabel ? ` · Fila: ${queueLabel}` : ''}
              </Typography>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                {ticket.status === 'closed' && (
                  <Tooltip title="Atendimento resolvido">
                    <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: 'success.main' }} />
                  </Tooltip>
                )}
                {chatbot && (
                  <Tooltip title="ChatBot atendendo">
                    <SmartToyOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                  </Tooltip>
                )}
              </Box>
            </Box>
            {(userLabel || ticket.whatsapp?.name) && !hideChannelBadge && (
              <Chip
                size="small"
                label={
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    {ticket.whatsapp?.logo || ticket.channel ? (
                      <ChannelLogo channel={ticket.channel} logo={ticket.whatsapp?.logo} size={14} />
                    ) : null}
                    <span>{ticket.whatsapp?.name || userLabel}</span>
                  </Box>
                }
                sx={{ mt: 0.5, height: 22, '& .MuiChip-label': { px: 0.75 } }}
              />
            )}
          </Box>
        }
        slotProps={{
          primary: { component: 'div' },
          secondary: { component: 'div' }
        }}
      />

      {isPending && onSpy && !bulkSelect && (
        <Tooltip title="Espiar conversa">
          <IconButton
            size="small"
            color="primary"
            disabled={accepting}
            onClick={e => {
              e.stopPropagation()
              onSpy(ticket)
            }}
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            <Badge badgeContent={ticket.unreadMessages || 0} color="info" invisible={!ticket.unreadMessages}>
              <Eye size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </Badge>
          </IconButton>
        </Tooltip>
      )}
    </ListItemButton>
  )
}
