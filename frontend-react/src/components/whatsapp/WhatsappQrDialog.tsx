import { useEffect, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material'
import { useWhatsappStore } from '@/store/whatsappStore'
import type { WhatsappSession } from '@/types/entities'

function isPairingCode(code: string) {
  return code.length <= 12 && !code.includes(',') && !code.includes('@')
}

function isImageQr(code: string) {
  return code.startsWith('data:image/')
}

interface WhatsappQrDialogProps {
  session: WhatsappSession | null
  open: boolean
  onClose: () => void
  onRequestNewQr?: () => void
}

export function WhatsappQrDialog({ session, open, onClose, onRequestNewQr }: WhatsappQrDialogProps) {
  const storeSession = useWhatsappStore(s =>
    session?.id ? s.sessions.find(item => item.id === session.id) : undefined
  )

  const live = storeSession || session
  const qrcode = live?.qrcode?.trim() || ''
  const pairing = qrcode ? isPairingCode(qrcode) : false
  const imageQr = qrcode ? isImageQr(qrcode) : false

  useEffect(() => {
    if (open && live?.status === 'CONNECTED') {
      onClose()
    }
  }, [open, live?.status, onClose])

  const title = useMemo(() => {
    if (!live) return 'QR Code'
    return pairing ? `Código de pareamento — ${live.name}` : `QR Code — ${live.name}`
  }, [live, pairing])

  if (!live) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ textAlign: 'center', bgcolor: 'common.white', color: 'text.primary' }}>
        {!qrcode ? (
          <Typography color="text.secondary" sx={{ py: 4 }}>
            Aguardando o código de pareamento...
          </Typography>
        ) : pairing ? (
          <Box sx={{ py: 2 }}>
            <Typography
              variant="h3"
              color="primary"
              sx={{ fontWeight: 700, letterSpacing: 6, mb: 2 }}
            >
              {qrcode}
            </Typography>
            <Typography variant="body2" align="left" color="text.secondary">
              No celular: WhatsApp → Aparelhos conectados → Conectar com número de telefone → digite o
              código acima.
            </Typography>
          </Box>
        ) : imageQr ? (
          <Box component="img" src={qrcode} alt="QR Code" sx={{ maxWidth: '100%', width: 300 }} />
        ) : (
          <Box sx={{ display: 'inline-block', p: 2, bgcolor: 'common.white' }}>
            <QRCodeSVG value={qrcode} size={300} level="H" includeMargin />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', px: 3, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Caso tenha problema, solicite um novo código.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          {onRequestNewQr && (
            <Button variant="outlined" onClick={onRequestNewQr}>
              Novo código
            </Button>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
