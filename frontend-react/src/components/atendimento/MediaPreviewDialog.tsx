import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface MediaPreviewDialogProps {
  open: boolean
  title: string
  previewUrl: string
  sending?: boolean
  onClose: () => void
  onSend: () => void
}

export function MediaPreviewDialog({
  open,
  title,
  previewUrl,
  sending,
  onClose,
  onSend
}: MediaPreviewDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box
          component="img"
          src={previewUrl}
          alt="Preview"
          sx={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Enter para enviar · ESC para cancelar
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onSend} disabled={sending}>
          {sending ? 'Enviando…' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
