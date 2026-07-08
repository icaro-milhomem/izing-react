import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  TextField,
  Typography,
  CircularProgress
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { useSnackbar } from 'notistack'
import { PageHeader } from '@/components/PageHeader'
import { listUsers } from '@/api/users'
import {
  listInternalMessages,
  markInternalMessagesRead,
  sendInternalMessage,
  type InternalMessage
} from '@/api/internalMessages'
import { getSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/store/authStore'
import { mergeUserOnlineStatus, useUsersAppStore } from '@/store/usersAppStore'
import { useNotificationStore } from '@/store/notificationStore'
import {
  consumeInternalChatOpenPeerId,
  setInternalChatPeerId
} from '@/utils/notifications'
import type { User } from '@/types/entities'

function statusLabel(status?: string) {
  return status === 'online' ? 'Online' : 'Offline'
}

function normalizeSocketMessage(
  raw: InternalMessage & { message?: string },
  currentUserId: number
): InternalMessage {
  const senderId = Number(raw.senderId ?? raw.sender?.id)
  const receiverId = Number(raw.receiverId)
  return {
    ...raw,
    id: Number(raw.id),
    senderId,
    receiverId,
    body: raw.body || raw.message || '',
    fromMe: senderId === currentUserId,
    sender: raw.sender ? { ...raw.sender, id: Number(raw.sender.id) } : undefined
  }
}

function peerIdForMessage(msg: InternalMessage): number {
  return msg.fromMe ? Number(msg.receiverId) : Number(msg.senderId)
}

function appendMessage(prev: InternalMessage[], incoming: InternalMessage): InternalMessage[] {
  if (prev.some(item => item.id === incoming.id)) return prev
  return [...prev, incoming]
}

export function ChatInternoPage() {
  const { enqueueSnackbar } = useSnackbar()
  const authUser = useAuthStore(s => s.user)
  const currentUserId = Number(authUser?.userId || localStorage.getItem('userId'))
  const tenantId = Number(authUser?.tenantId || JSON.parse(localStorage.getItem('usuario') || '{}')?.tenantId)
  const usersApp = useUsersAppStore(s => s.usersApp)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<InternalMessage[]>([])
  const [text, setText] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-internal'],
    queryFn: async () => (await listUsers()).data.users.filter(u => u.id !== currentUserId)
  })

  const usersWithStatus = useMemo(
    () => mergeUserOnlineStatus(users, usersApp),
    [users, usersApp]
  )

  const loadMessages = useCallback(async (userId: number) => {
    setLoadingMessages(true)
    try {
      const { data } = await listInternalMessages(userId)
      setMessages(data)
      await markInternalMessagesRead(userId)
      useNotificationStore.getState().clearInternalFromSender(userId)
    } catch {
      enqueueSnackbar('Erro ao carregar mensagens', { variant: 'error' })
    } finally {
      setLoadingMessages(false)
    }
  }, [enqueueSnackbar])

  useEffect(() => {
    if (!usersWithStatus.length) return
    const peerId = consumeInternalChatOpenPeerId()
    if (!peerId) return
    const user = usersWithStatus.find(u => u.id === peerId)
    if (user) setSelectedUser(user)
  }, [usersWithStatus])

  useEffect(() => {
    setInternalChatPeerId(selectedUser?.id ?? null)
    return () => setInternalChatPeerId(null)
  }, [selectedUser?.id])

  useEffect(() => {
    if (selectedUser) void loadMessages(selectedUser.id)
  }, [selectedUser?.id, loadMessages])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !tenantId || !currentUserId) return

    const eventName = `${tenantId}:internal_message:${currentUserId}`

    const handler = (raw: InternalMessage & { message?: string }) => {
      const msg = normalizeSocketMessage(raw, currentUserId)
      const peerId = peerIdForMessage(msg)

      setMessages(prev => {
        if (selectedUser && peerId === Number(selectedUser.id)) {
          return appendMessage(prev, msg)
        }
        return prev
      })
    }

    socket.on(eventName, handler)
    return () => {
      socket.off(eventName, handler)
    }
  }, [selectedUser, currentUserId, tenantId])

  const handleSend = async () => {
    if (!selectedUser || !text.trim()) return
    const body = text.trim()
    setText('')

    try {
      const { data } = await sendInternalMessage({ receiverId: selectedUser.id, body })
      setMessages(prev => appendMessage(prev, data))
    } catch (err: unknown) {
      setText(body)
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  const selectedWithStatus = selectedUser
    ? usersWithStatus.find(u => u.id === selectedUser.id) || selectedUser
    : null

  return (
    <>
      <PageHeader title="Chat Interno" subtitle="Comunicação entre atendentes" />
      <Box sx={{ display: 'flex', height: 'calc(100vh - 180px)', gap: 2 }}>
        <Paper sx={{ width: 280, overflow: 'auto' }}>
          {isLoading ? <CircularProgress sx={{ m: 2 }} /> : (
            <List dense>
              {usersWithStatus.map(u => (
                <ListItemButton key={u.id} selected={selectedUser?.id === u.id} onClick={() => setSelectedUser(u)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: u.status === 'online' ? 'success.main' : 'grey.400' }}>
                      {u.name?.[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={u.name} secondary={statusLabel(u.status)} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>

        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!selectedUser ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">Selecione um atendente</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">{selectedWithStatus?.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {statusLabel(selectedWithStatus?.status)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
                {loadingMessages ? <CircularProgress /> : messages.map(m => (
                  <Box
                    key={m.id}
                    sx={{
                      alignSelf: m.fromMe ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      bgcolor: m.fromMe ? 'primary.main' : theme => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200'),
                      color: m.fromMe ? 'primary.contrastText' : 'text.primary',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      mb: 1
                    }}
                  >
                    {m.body}
                  </Box>
                ))}
              </Box>
              <Box sx={{ p: 2, display: 'flex', gap: 1, borderTop: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  size="small"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Mensagem..."
                />
                <IconButton color="primary" onClick={handleSend}><SendIcon /></IconButton>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </>
  )
}
