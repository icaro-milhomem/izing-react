import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton
} from '@mui/material'
import { X } from 'lucide-react'
import { NotificationSoundSettings } from '@/components/layout/NotificationSoundSettings'

interface NotificationSoundDialogProps {
  open: boolean
  onClose: () => void
}

export function NotificationSoundDialog({ open, onClose }: NotificationSoundDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        Notificações
        <IconButton size="small" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <NotificationSoundSettings />
      </DialogContent>
    </Dialog>
  )
}
