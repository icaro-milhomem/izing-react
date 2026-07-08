import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Box,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  Typography
} from '@mui/material'
import { Bell } from 'lucide-react'
import { ActionIconButton } from '@/components/icons/ActionIconButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ChannelLogo } from '@/components/atendimento/ChannelLogo'
import { TicketChannelHeader } from '@/components/atendimento/TicketChannelHeader'
import { useWhatsappStore } from '@/store/whatsappStore'
import { useNotificationStore } from '@/store/notificationStore'
import { setInternalChatOpenPeerId } from '@/utils/notifications'
import { buildChannelOptions, groupTicketsByChannel } from '@/utils/channelOptions'
import type { Ticket } from '@/types/entities'

function ticketContactName(ticket: Ticket) {
  return ticket.name || ticket.contact?.name || 'Contato'
}

function ticketAvatarUrl(ticket: Ticket) {
  return ticket.profilePicUrl || ticket.contact?.profilePicUrl
}

export function NotificationMenu() {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [confirmTicket, setConfirmTicket] = useState<Ticket | null>(null)
  const openTickets = useNotificationStore(s => s.openTickets)
  const pendingTickets = useNotificationStore(s => s.pendingTickets)
  const openCount = useNotificationStore(s => s.openCount)
  const pendingCount = useNotificationStore(s => s.pendingCount)
  const internalChats = useNotificationStore(s => s.internalChats)
  const internalCount = useNotificationStore(s => s.internalCount)
  const clearInternalFromSender = useNotificationStore(s => s.clearInternalFromSender)
  const totalCount = openCount + pendingCount + internalCount
  const menuOpen = Boolean(anchorEl)

  const whatsapps = useWhatsappStore(s => s.sessions)

  const channelOptions = useMemo(
    () => buildChannelOptions(whatsapps, [...openTickets, ...pendingTickets]),
    [whatsapps, openTickets, pendingTickets]
  )

  const pendingGroups = useMemo(
    () => groupTicketsByChannel(pendingTickets, channelOptions),
    [pendingTickets, channelOptions]
  )

  const openGroups = useMemo(
    () => groupTicketsByChannel(openTickets, channelOptions),
    [openTickets, channelOptions]
  )

  const openAtendimento = () => {
    setAnchorEl(null)
    navigate('/atendimento')
  }

  const openInternalChat = (senderId: number) => {
    setAnchorEl(null)
    clearInternalFromSender(senderId)
    setInternalChatOpenPeerId(senderId)
    navigate('/chat-interno')
  }

  const askOpenTicket = (ticket: Ticket) => {
    setAnchorEl(null)
    setConfirmTicket(ticket)
  }

  const confirmOpenTicket = () => {
    if (!confirmTicket) return
    navigate(`/atendimento/${confirmTicket.id}`)
    setConfirmTicket(null)
  }

  const renderTicketItem = (ticket: Ticket) => (
    <ListItem
      key={ticket.id}
      onClick={() => askOpenTicket(ticket)}
      sx={{
        cursor: 'pointer',
        py: 1.25,
        px: 2,
        borderBottom: 1,
        borderColor: 'divider',
        alignItems: 'flex-start'
      }}
    >
      <ListItemAvatar sx={{ minWidth: 72, mt: 0.5 }}>
        <Avatar src={ticketAvatarUrl(ticket)} sx={{ width: 56, height: 56 }}>
          {ticketContactName(ticket)[0]}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>
            {ticketContactName(ticket)}
          </Typography>
        }
        secondary={
          <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
            <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
              Mensagem:{' '}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary">
              {ticket.lastMessage || '—'}
            </Typography>
          </Box>
        }
      />
    </ListItem>
  )

  return (
    <>
      <ActionIconButton
        title="Notificações"
        onClick={e => setAnchorEl(e.currentTarget)}
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={totalCount} color="error" max={99}>
          <Bell size={18} strokeWidth={2.25} />
        </Badge>
      </ActionIconButton>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 300,
              maxWidth: 360,
              maxHeight: 420,
              mt: 1,
              overflow: 'auto'
            }
          }
        }}
      >
        {totalCount === 0 ? (
          <List dense disablePadding>
            <ListItem sx={{ py: 1.5, px: 2 }}>
              <ListItemText primary="Nada de novo por aqui!" />
            </ListItem>
          </List>
        ) : (
          <List dense disablePadding sx={{ py: 0.5 }}>
            {internalChats.length > 0 && (
              <>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Chat interno
                  </Typography>
                </Box>
                {internalChats.map(chat => (
                  <ListItem
                    key={`internal-${chat.senderId}`}
                    onClick={() => openInternalChat(chat.senderId)}
                    sx={{ cursor: 'pointer', py: 1.25, px: 2, alignItems: 'flex-start' }}
                  >
                    <ListItemAvatar sx={{ minWidth: 56 }}>
                      <Badge badgeContent={chat.unreadCount} color="error" max={99}>
                        <Avatar sx={{ width: 40, height: 40 }}>{chat.senderName[0]}</Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                          {chat.senderName}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {chat.lastMessage}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
                {(pendingGroups.length > 0 || openGroups.length > 0) && <Divider />}
              </>
            )}

            {pendingGroups.length > 0 && (
              <>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Pendentes por canal
                  </Typography>
                </Box>
                {pendingGroups.map(group => (
                  <ListItem
                    key={`pending-${group.channelId}`}
                    onClick={openAtendimento}
                    sx={{ cursor: 'pointer', py: 1, px: 2, alignItems: 'center' }}
                  >
                    <ListItemAvatar sx={{ minWidth: 56 }}>
                      <Badge badgeContent={group.tickets.length} color="error" max={99}>
                        <ChannelLogo channel={group.channel} logo={group.logo} size={40} />
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                          {group.name}
                        </Typography>
                      }
                      secondary="Clientes pendentes na fila"
                    />
                  </ListItem>
                ))}
                {openGroups.length > 0 && <Divider />}
              </>
            )}

            {openGroups.map((group, index) => (
              <Box key={`open-${group.channelId}`}>
                {index > 0 && <Divider />}
                <TicketChannelHeader
                  name={group.name}
                  channel={group.channel}
                  logo={group.logo}
                  count={group.tickets.length}
                />
                {group.tickets.map(renderTicketItem)}
              </Box>
            ))}
          </List>
        )}
      </Menu>

      <ConfirmDialog
        open={Boolean(confirmTicket)}
        title="Atenção!!"
        message={
          confirmTicket
            ? `${ticketContactName(confirmTicket)} possui um atendimento em curso (Atendimento: ${confirmTicket.id}). Deseja abrir o atendimento?`
            : ''
        }
        onCancel={() => setConfirmTicket(null)}
        onConfirm={confirmOpenTicket}
      />
    </>
  )
}
