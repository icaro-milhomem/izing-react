import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  CircularProgress
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { listWhatsapps } from '@/api/whatsapp'
import { createTicket } from '@/api/tickets'
import { resolveBackendError } from '@/api/backendErrors'
import type { Contact, Ticket } from '@/types/entities'

interface StartContactTicketDialogProps {
  contact: Contact | null
  channel: string | null
  open: boolean
  onClose: () => void
}

function parseExistingTicket(error: unknown): Ticket | null {
  const err = error as { response?: { status?: number; data?: { error?: string } } }
  if (err.response?.status !== 409 || !err.response.data?.error) return null
  try {
    return JSON.parse(err.response.data.error) as Ticket
  } catch {
    return null
  }
}

export function StartContactTicketDialog({
  contact,
  channel,
  open,
  onClose
}: StartContactTicketDialogProps) {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [existingTicket, setExistingTicket] = useState<Ticket | null>(null)

  const { data: whatsapps = [], isLoading: loadingChannels } = useQuery({
    queryKey: ['whatsapps'],
    queryFn: async () => (await listWhatsapps()).data,
    enabled: open
  })

  const channelOptions = useMemo(
    () => (channel ? whatsapps.filter(w => w.type === channel) : []),
    [whatsapps, channel]
  )

  useEffect(() => {
    if (!open) {
      setSelectedChannelId(null)
      setExistingTicket(null)
      setLoading(false)
      return
    }
    if (channelOptions.length === 1) {
      setSelectedChannelId(channelOptions[0].id)
    }
  }, [open, channelOptions])

  const openTicket = (ticketId: number) => {
    onClose()
    navigate(`/atendimento/${ticketId}`)
  }

  const handleStart = async () => {
    if (!contact?.id || !channel || !selectedChannelId) {
      enqueueSnackbar('Selecione o canal para iniciar o atendimento', { variant: 'warning' })
      return
    }

    const userId = Number(localStorage.getItem('userId'))
    setLoading(true)
    try {
      const { data: ticket } = await createTicket({
        contactId: contact.id,
        isActiveDemand: true,
        userId,
        channel,
        channelId: selectedChannelId,
        status: 'open'
      })
      enqueueSnackbar(
        `Atendimento iniciado — ${ticket.contact?.name || contact.name} (#${ticket.id})`,
        { variant: 'success' }
      )
      openTicket(ticket.id)
    } catch (err: unknown) {
      const existing = parseExistingTicket(err)
      if (existing) {
        setExistingTicket(existing)
        return
      }
      enqueueSnackbar(resolveBackendError(err), { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const channelLabel =
    channel === 'whatsapp' ? 'WhatsApp' : channel === 'instagram' ? 'Instagram' : channel === 'telegram' ? 'Telegram' : 'Canal'

  return (
    <>
      <Dialog open={open && !existingTicket} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Iniciar atendimento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Contato: <strong>{contact?.name}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Selecione o canal {channelLabel} para iniciar o atendimento.
          </Typography>

          {loadingChannels ? (
            <CircularProgress size={24} />
          ) : channelOptions.length === 0 ? (
            <Typography variant="body2" color="error">
              Nenhum canal {channelLabel} configurado. Cadastre em Canais.
            </Typography>
          ) : (
            <RadioGroup
              value={selectedChannelId ?? ''}
              onChange={e => setSelectedChannelId(Number(e.target.value))}
            >
              {channelOptions.map(option => (
                <FormControlLabel
                  key={option.id}
                  value={option.id}
                  control={<Radio />}
                  label={option.name}
                />
              ))}
            </RadioGroup>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleStart}
            disabled={loading || !selectedChannelId || channelOptions.length === 0}
          >
            {loading ? 'Iniciando…' : 'Iniciar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(existingTicket)} onClose={() => setExistingTicket(null)}>
        <DialogTitle>Atendimento em andamento</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {contact?.name} já possui um atendimento em curso
            {existingTicket?.id ? ` (#${existingTicket.id})` : ''}. Deseja abrir esse atendimento?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExistingTicket(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => existingTicket && openTicket(existingTicket.id)}
          >
            Abrir atendimento
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
